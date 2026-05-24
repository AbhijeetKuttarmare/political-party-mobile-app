const db     = require("../config/database");
const logger = require("../middleware/logger");

/* ─── GET /api/leaders ─────────────────────────────────────── */
exports.getAll = async (req, res, next) => {
  try {
    const { category } = req.query;
    const params = [];
    let query = `
      SELECT id, name, designation, category, photo_url, sort_order, is_active, created_at, updated_at
      FROM party_leaders
      WHERE is_active = true
    `;
    if (category) { params.push(category); query += ` AND category = $${params.length}`; }
    query += " ORDER BY sort_order ASC, name ASC";
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) { next(err); }
};

/* ─── GET /api/leaders/:id ─────────────────────────────────── */
exports.getById = async (req, res, next) => {
  try {
    const result = await db.query(
      "SELECT id, name, designation, category, photo_url, sort_order FROM party_leaders WHERE id = $1",
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Leader not found" });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

/* ─── POST /api/leaders ────────────────────────────────────── */
exports.create = async (req, res, next) => {
  try {
    const { name, designation, category = "national", photo_url, sort_order = 0 } = req.body;
    if (!name?.trim() || !designation?.trim()) {
      return res.status(400).json({ error: "name and designation are required" });
    }
    const result = await db.query(
      `INSERT INTO party_leaders (name, designation, category, photo_url, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name.trim(), designation.trim(), category, photo_url || null, sort_order]
    );
    logger.info(`[LEADERS] Created: ${name} by ${req.user.name}`);
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

/* ─── PUT /api/leaders/:id ─────────────────────────────────── */
exports.update = async (req, res, next) => {
  try {
    const { name, designation, category, photo_url, sort_order, is_active } = req.body;
    const result = await db.query(
      `UPDATE party_leaders
       SET name        = COALESCE($1, name),
           designation = COALESCE($2, designation),
           category    = COALESCE($3, category),
           photo_url   = $4,
           sort_order  = COALESCE($5, sort_order),
           is_active   = COALESCE($6, is_active)
       WHERE id = $7
       RETURNING *`,
      [name?.trim() || null, designation?.trim() || null, category || null,
       photo_url ?? null, sort_order ?? null, is_active ?? null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Leader not found" });
    logger.info(`[LEADERS] Updated id=${req.params.id} by ${req.user.name}`);
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

/* ─── DELETE /api/leaders/:id ──────────────────────────────── */
exports.remove = async (req, res, next) => {
  try {
    const result = await db.query(
      "UPDATE party_leaders SET is_active = false WHERE id = $1 RETURNING id, name",
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Leader not found" });
    logger.info(`[LEADERS] Deactivated: ${result.rows[0].name} by ${req.user.name}`);
    res.json({ message: "Leader removed", leader: result.rows[0] });
  } catch (err) { next(err); }
};
