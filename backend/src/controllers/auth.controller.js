/*
 * controllers/auth.controller.js
 *
 * DEBUG TIP: All auth actions are logged with the volunteer's
 * mobile number so you can trace any login issue in logs/app.log
 */

const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const db     = require("../config/database");
const logger = require("../middleware/logger");

/* ─── POST /api/auth/login ─────────────────────────────────── */
exports.login = async (req, res, next) => {
  try {
    const { mobile, password } = req.body;

    // Find volunteer by mobile
    const result = await db.query(
      "SELECT * FROM volunteers WHERE mobile = $1 AND is_active = true",
      [mobile]
    );

    if (result.rows.length === 0) {
      logger.warn(`[LOGIN] Failed — mobile not found: ${mobile}`);
      return res.status(401).json({ error: "Invalid mobile number or password" });
    }

    const volunteer = result.rows[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, volunteer.password_hash);
    if (!isMatch) {
      logger.warn(`[LOGIN] Failed — wrong password for: ${mobile}`);
      return res.status(401).json({ error: "Invalid mobile number or password" });
    }

    // Sign JWT
    const token = jwt.sign(
      {
        id:          volunteer.id,
        name:        volunteer.name,
        mobile:      volunteer.mobile,
        role:        volunteer.role,
        district_id: volunteer.district_id,
        area_id:     volunteer.area_id,
        booth_id:    volunteer.assigned_booth,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    // Update last seen
    await db.query("UPDATE volunteers SET last_seen_at = NOW() WHERE id = $1", [volunteer.id]);

    logger.info(`[LOGIN] ✓ ${volunteer.name} (${volunteer.role}) logged in`);

    res.json({
      token,
      user: {
        id:          volunteer.id,
        name:        volunteer.name,
        mobile:      volunteer.mobile,
        role:        volunteer.role,
        district_id: volunteer.district_id,
        area_id:     volunteer.area_id,
        booth_id:    volunteer.assigned_booth,
      },
    });
  } catch (err) {
    next(err);
  }
};

/* ─── POST /api/auth/register ──────────────────────────────── */

// Defines which roles each registrar can create
// Roles that are always restricted to super_admin only
const ADMIN_ONLY_ROLES = new Set(["super_admin", "state_leader"]);

// For known roles: who can register them. For custom/unknown roles → state_leader+ can register.
const REGISTRABLE_BY = {
  super_admin:     ["super_admin"],
  state_leader:    ["super_admin"],
  district_leader: ["super_admin", "state_leader"],
  taluka_leader:   ["super_admin", "state_leader", "district_leader"],
  village_leader:  ["super_admin", "state_leader", "district_leader", "taluka_leader"],
  booth_leader:    ["super_admin", "state_leader", "district_leader", "taluka_leader", "village_leader"],
  booth_worker:    ["super_admin", "state_leader", "district_leader", "taluka_leader", "village_leader"],
  karyakarta:      ["super_admin", "state_leader", "district_leader", "taluka_leader", "village_leader"],
  observer:        ["super_admin", "state_leader"],
};

exports.register = async (req, res, next) => {
  try {
    const { name, mobile, password, role } = req.body;
    let { district_id, area_id, assigned_booth } = req.body;

    const registrar = req.user;

    // Enforce who can register which role
    // For known roles: check the map. For custom roles: only super_admin/state_leader/district_leader allowed.
    const knownAllowed = REGISTRABLE_BY[role];
    const canRegister = knownAllowed
      ? knownAllowed.includes(registrar.role)
      : !ADMIN_ONLY_ROLES.has(role) && ["super_admin","state_leader","district_leader"].includes(registrar.role);

    if (!canRegister) {
      return res.status(403).json({
        error: `A ${registrar.role} cannot register a ${role}`,
      });
    }

    // District leaders can only register within their own district
    if (registrar.role === "district_leader") {
      if (district_id && Number(district_id) !== Number(registrar.district_id)) {
        return res.status(403).json({ error: "You can only register users in your own district" });
      }
      district_id = registrar.district_id; // auto-assign
    }

    // Taluka leaders can only register within their own area
    if (registrar.role === "taluka_leader") {
      if (area_id && area_id !== registrar.area_id) {
        return res.status(403).json({ error: "You can only register users in your own area" });
      }
      area_id     = registrar.area_id;     // auto-assign
      district_id = registrar.district_id;
    }

    // Check if mobile already exists
    const existing = await db.query("SELECT id FROM volunteers WHERE mobile = $1", [mobile]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Mobile number already registered" });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const result = await db.query(
      `INSERT INTO volunteers (name, mobile, password_hash, role, district_id, area_id, assigned_booth)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, mobile, role`,
      [name, mobile, password_hash, role, district_id || null, area_id || null, assigned_booth || null]
    );

    logger.info(`[REGISTER] New user: ${name} (${role}) registered by ${registrar.name} (${registrar.role})`);

    res.status(201).json({
      message:   "User registered successfully",
      volunteer: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/* ─── POST /api/auth/demo-login ────────────────────────────── */
const DEMO_ACCOUNTS = {
  /* ── Web roles ───────────────────────────────── */
  "8888888888": { name: "Admin NCP-SP",       role: "super_admin"     },
  "9999999999": { name: "State Leader Demo",  role: "state_leader"    },
  "7777777777": { name: "District Leader",    role: "district_leader" },
  "6666666666": { name: "Observer Demo",      role: "observer"        },
  /* ── Mobile roles ────────────────────────────── */
  "5555555555": { name: "Taluka Leader Demo", role: "taluka_leader"   },
  "4444444444": { name: "Village Leader Demo",role: "village_leader"  },
  "3333333333": { name: "Booth Leader Demo",  role: "booth_leader"    },
  "2222222222": { name: "Booth Worker Demo",  role: "booth_worker"    },
  "1111111111": { name: "Karyakarta Demo",    role: "karyakarta"      },
};

exports.demoLogin = async (req, res, next) => {
  try {
    const { mobile } = req.body;
    const demo = DEMO_ACCOUNTS[mobile];
    if (!demo) {
      return res.status(403).json({ error: "Not a demo account" });
    }

    // Upsert demo user — no password required
    const upsert = await db.query(
      `INSERT INTO volunteers (name, mobile, role, password_hash)
       VALUES ($1, $2, $3, 'demo-no-password')
       ON CONFLICT (mobile) DO UPDATE
         SET name = EXCLUDED.name, role = EXCLUDED.role, is_active = true
       RETURNING id, name, mobile, role, district_id, area_id, assigned_booth`,
      [demo.name, mobile, demo.role]
    );

    const volunteer = upsert.rows[0];

    const token = jwt.sign(
      {
        id:          volunteer.id,
        name:        volunteer.name,
        mobile:      volunteer.mobile,
        role:        volunteer.role,
        district_id: volunteer.district_id,
        area_id:     volunteer.area_id,
        booth_id:    volunteer.assigned_booth,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    await db.query("UPDATE volunteers SET last_seen_at = NOW() WHERE id = $1", [volunteer.id]);
    logger.info(`[DEMO-LOGIN] ${volunteer.name} (${volunteer.role})`);

    res.json({
      token,
      user: {
        id:          volunteer.id,
        name:        volunteer.name,
        mobile:      volunteer.mobile,
        role:        volunteer.role,
        district_id: volunteer.district_id,
        area_id:     volunteer.area_id,
        booth_id:    volunteer.assigned_booth,
      },
    });
  } catch (err) { next(err); }
};

/* ─── GET /api/auth/me ──────────────────────────────────────── */
exports.me = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT v.id, v.name, v.mobile, v.role, v.is_active, v.last_seen_at,
              d.name AS district_name, a.name AS area_name
       FROM volunteers v
       LEFT JOIN districts d ON d.id = v.district_id
       LEFT JOIN areas a     ON a.id = v.area_id
       WHERE v.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Volunteer not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

/* ─── POST /api/auth/change-password ───────────────────────── */
exports.changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const result = await db.query("SELECT password_hash FROM volunteers WHERE id = $1", [req.user.id]);
    const isMatch = await bcrypt.compare(oldPassword, result.rows[0].password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: "Old password is incorrect" });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.query("UPDATE volunteers SET password_hash = $1 WHERE id = $2", [newHash, req.user.id]);

    logger.info(`[PASSWORD] Changed for volunteer id=${req.user.id}`);
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    next(err);
  }
};
