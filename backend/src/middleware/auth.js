/*
 * middleware/auth.js — JWT Authentication + Role-Based Access Control
 *
 * Usage in routes:
 *   router.get("/booths", auth(), controller)              — any logged-in user
 *   router.post("/surveys", auth("booth_worker"), ctrl)    — booth_worker or above
 *   router.get("/all-districts", auth("district_leader"))  — district_leader or above
 *   router.get("/analytics", auth("state_leader"))         — state_leader only
 *
 * Role hierarchy (highest to lowest):
 *   state_leader > district_leader > taluka_leader > village_leader > booth_leader > booth_worker > karyakarta
 */

const jwt    = require("jsonwebtoken");
const logger = require("./logger");
const { ROLES } = require("../config/constants");

const ROLE_HIERARCHY = [
  ROLES.SUPER_ADMIN,
  ROLES.STATE_LEADER,
  ROLES.DISTRICT_LEADER,
  ROLES.TALUKA_LEADER,
  ROLES.VILLAGE_LEADER,
  ROLES.BOOTH_LEADER,
  ROLES.BOOTH_WORKER,
  ROLES.KARYAKARTA,
];

function hasPermission(userRole, requiredRole) {
  if (!requiredRole) return true;
  // Observer gets read-only access to all endpoints — write check happens below
  if (userRole === ROLES.OBSERVER) return true;
  const userIdx     = ROLE_HIERARCHY.indexOf(userRole);
  const requiredIdx = ROLE_HIERARCHY.indexOf(requiredRole);
  // Lower index = higher authority
  return userIdx !== -1 && userIdx <= requiredIdx;
}

/*
 * auth(requiredRole?)
 * Returns Express middleware that:
 * 1. Reads Bearer token from Authorization header
 * 2. Verifies JWT signature
 * 3. Checks role hierarchy
 * 4. Attaches decoded user to req.user
 */
function auth(requiredRole = null) {
  return (req, res, next) => {
    try {
      // 1. Extract token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          error: "No token provided",
          hint:  "Add header: Authorization: Bearer <your_token>",
        });
      }

      const token = authHeader.split(" ")[1];

      // 2. Verify token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        if (err.name === "TokenExpiredError") {
          return res.status(401).json({ error: "Token expired — please login again" });
        }
        return res.status(401).json({ error: "Invalid token" });
      }

      // 3. Check role
      if (!hasPermission(decoded.role, requiredRole)) {
        logger.warn(`[AUTH] Access denied — user ${decoded.mobile} (${decoded.role}) tried to access ${req.method} ${req.path} (requires: ${requiredRole})`);
        return res.status(403).json({
          error:    "Access denied",
          yourRole: decoded.role,
          required: requiredRole,
        });
      }

      // 4. Block observers from all write operations
      if (decoded.role === ROLES.OBSERVER && req.method !== "GET") {
        logger.warn(`[AUTH] Observer write blocked — ${decoded.mobile} → ${req.method} ${req.path}`);
        return res.status(403).json({
          error:    "Observers have read-only access",
          yourRole: decoded.role,
        });
      }

      // 5. Attach user to request
      req.user = decoded;

      logger.debug(`[AUTH] ✓ ${decoded.name} (${decoded.role}) → ${req.method} ${req.path}`);
      next();

    } catch (err) {
      logger.error(`[AUTH ERROR] ${err.message}`);
      res.status(500).json({ error: "Authentication error" });
    }
  };
}

module.exports = auth;
