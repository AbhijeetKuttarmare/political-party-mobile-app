const db     = require("../config/database");
const logger = require("../middleware/logger");
const { ROLES } = require("../config/constants");

exports.createVolunteer = async (req, res, next) => {
  try {
    const bcrypt = require("bcryptjs");
    const { name, mobile, password, role, district_id, area_id } = req.body;
    if (!name?.trim())   return res.status(400).json({ error: "Name is required" });
    if (!mobile?.trim()) return res.status(400).json({ error: "Mobile is required" });
    if (!password || password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
    if (!["karyakarta", "booth_worker", "booth_leader", "village_leader", "taluka_leader"].includes(role))
      return res.status(400).json({ error: "Invalid role" });

    const exists = await db.query("SELECT id FROM volunteers WHERE mobile = $1", [mobile.trim()]);
    if (exists.rows.length) return res.status(409).json({ error: "Mobile number already registered" });

    const hash = await bcrypt.hash(password, 10);
    const { rows: [vol] } = await db.query(`
      INSERT INTO volunteers (name, mobile, password_hash, role, district_id, area_id, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING id, name, mobile, role, is_active, district_id, area_id
    `, [name.trim(), mobile.trim(), hash, role, district_id || null, area_id || null]);

    logger.info(`[MEMBERS] Created ${role} "${vol.name}" (${vol.mobile}) by ${req.user.name}`);
    res.status(201).json(vol);
  } catch (err) { next(err); }
};

exports.getAll = async (req, res, next) => {
  try {
    const { area, role } = req.query;
    const user   = req.user;
    const params = [];
    let query = `
      SELECT v.id, v.name, v.mobile, v.role, v.is_active, v.last_seen_at,
             v.last_lat, v.last_lng,
             b.booth_number, b.village,
             d.name AS district_name, a.name AS area_name
      FROM volunteers v
      LEFT JOIN booths b    ON b.id = v.assigned_booth
      LEFT JOIN districts d ON d.id = v.district_id
      LEFT JOIN areas a     ON a.id = v.area_id
      WHERE v.is_active = true
    `;

    // Role-based scoping
    if (user.role === ROLES.TALUKA_LEADER && user.area_id) {
      params.push(user.area_id);
      query += ` AND v.area_id = $${params.length}`;
    } else if (user.role === ROLES.DISTRICT_LEADER && user.district_id) {
      params.push(user.district_id);
      query += ` AND v.district_id = $${params.length}`;
    }
    // super_admin, state_leader, observer see all

    if (area) { params.push(area); query += ` AND v.area_id = $${params.length}`; }
    if (role) { params.push(role); query += ` AND v.role = $${params.length}`; }

    query += " ORDER BY v.name";
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const result = await db.query(
      "SELECT * FROM volunteers WHERE id = $1", [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Volunteer not found" });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.checkin = async (req, res, next) => {
  try {
    const { booth_id, lat, lng, note } = req.body;
    const volunteer_id = req.user.id;

    const checkin = await db.query(`
      INSERT INTO checkins (volunteer_id, booth_id, lat, lng, note)
      VALUES ($1, $2, $3, $4, $5) RETURNING id, checked_in_at
    `, [volunteer_id, booth_id, lat, lng, note]);

    await db.query(
      "UPDATE volunteers SET last_seen_at = NOW(), last_lat = $1, last_lng = $2 WHERE id = $3",
      [lat, lng, volunteer_id]
    );

    logger.info(`[CHECKIN] ${req.user.name} → booth_id=${booth_id}`);
    res.json({ success: true, checkin: checkin.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.updateVolunteer = async (req, res, next) => {
  try {
    const { name, mobile, role, district_id, area_id, is_active, password } = req.body;
    const bcrypt = require("bcryptjs");

    const fields = [];
    const params = [];

    if (name      !== undefined) { params.push(name);                                     fields.push(`name=$${params.length}`); }
    if (mobile    !== undefined) { params.push(mobile);                                   fields.push(`mobile=$${params.length}`); }
    if (role      !== undefined) { params.push(role);                                     fields.push(`role=$${params.length}`); }
    if (district_id !== undefined) { params.push(district_id || null);                   fields.push(`district_id=$${params.length}`); }
    if (area_id   !== undefined) { params.push(area_id || null);                          fields.push(`area_id=$${params.length}`); }
    if (is_active !== undefined) { params.push(Boolean(is_active));                       fields.push(`is_active=$${params.length}`); }
    if (password  && password.length >= 6) {
      params.push(await bcrypt.hash(password, 10));
      fields.push(`password_hash=$${params.length}`);
    }

    if (fields.length === 0) return res.status(400).json({ error: "Nothing to update" });

    params.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE volunteers SET ${fields.join(", ")} WHERE id=$${params.length}
       RETURNING id, name, mobile, role, is_active, last_seen_at, district_id, area_id`,
      params
    );
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    logger.info(`[USERS] Updated volunteer id=${req.params.id} by ${req.user.name}`);
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.getActive = async (req, res, next) => {
  try {
    const { area } = req.query;
    const user   = req.user;
    const params = [];
    let query = `
      SELECT v.id, v.name, v.last_lat, v.last_lng, v.last_seen_at,
             b.booth_number, b.village
      FROM volunteers v
      LEFT JOIN booths b ON b.id = v.assigned_booth
      WHERE v.is_active = true
        AND v.last_seen_at > NOW() - INTERVAL '2 hours'
        AND v.last_lat IS NOT NULL
    `;

    // Role-based scoping
    if (user.role === ROLES.TALUKA_LEADER && user.area_id) {
      params.push(user.area_id);
      query += ` AND v.area_id = $${params.length}`;
    } else if (user.role === ROLES.DISTRICT_LEADER && user.district_id) {
      params.push(user.district_id);
      query += ` AND v.district_id = $${params.length}`;
    }

    if (area) { params.push(area); query += ` AND v.area_id = $${params.length}`; }
    query += " ORDER BY v.last_seen_at DESC";

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};
