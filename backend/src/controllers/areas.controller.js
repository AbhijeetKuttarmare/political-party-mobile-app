const db     = require("../config/database");
const logger = require("../middleware/logger");
const { ROLES } = require("../config/constants");

/* ─── GET /api/areas ────────────────────────────────────────── */
exports.getAreas = async (req, res, next) => {
  try {
    const { election, district } = req.query;
    const user = req.user;

    const params = [];
    let query = `
      SELECT a.*, d.name AS district_name,
             COUNT(b.id) AS booth_count_live
      FROM areas a
      JOIN districts d ON d.id = a.district_id
      LEFT JOIN booths b ON b.area_id = a.id
      WHERE 1=1
    `;

    // Role-based filtering — district_leader can only see their district
    if (user.role === ROLES.DISTRICT_LEADER && user.district_id) {
      params.push(user.district_id);
      query += ` AND a.district_id = $${params.length}`;
    }
    // taluka_leader and booth_worker can only see their area
    if ([ROLES.TALUKA_LEADER, ROLES.BOOTH_WORKER].includes(user.role) && user.area_id) {
      params.push(user.area_id);
      query += ` AND a.id = $${params.length}`;
    }

    if (election) { params.push(election); query += ` AND a.election_id = $${params.length}`; }
    if (district) { params.push(district); query += ` AND LOWER(d.name) = LOWER($${params.length})`; }

    query += " GROUP BY a.id, d.name ORDER BY a.ncp_vote_share DESC";

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

/* ─── GET /api/areas/:id ────────────────────────────────────── */
exports.getAreaById = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT a.*, d.name AS district_name
      FROM areas a
      JOIN districts d ON d.id = a.district_id
      WHERE a.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Area not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};
