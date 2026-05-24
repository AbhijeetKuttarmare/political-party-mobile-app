const db = require("../config/database");

/* ─── GET /api/voters/search ────────────────────────────────── */
exports.search = async (req, res, next) => {
  try {
    const { q, booth, area } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: "Search query must be at least 2 characters" });
    }

    const params = [q.trim()];
    let query = `
      SELECT voter_id, name, name_marathi, age, gender,
             part_number, serial_number, address, mobile,
             ncp_support, is_contacted, contacted_at
      FROM voters
      WHERE to_tsvector('simple', name) @@ plainto_tsquery('simple', $1)
    `;

    if (booth) { params.push(booth); query += ` AND booth_id = $${params.length}`; }
    if (area)  { params.push(area);  query += ` AND area_id  = $${params.length}`; }

    query += " ORDER BY name LIMIT 25";

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

/* ─── GET /api/voters/:id ───────────────────────────────────── */
exports.getById = async (req, res, next) => {
  try {
    const result = await db.query(
      "SELECT * FROM voters WHERE id = $1 OR voter_id = $1",
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Voter not found" });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

/* ─── PATCH /api/voters/:id/support ────────────────────────── */
exports.updateSupport = async (req, res, next) => {
  try {
    const { ncp_support } = req.body;
    const valid = ["ncp", "undecided", "opposition", "unknown"];
    if (!valid.includes(ncp_support)) {
      return res.status(400).json({ error: `ncp_support must be: ${valid.join(" | ")}` });
    }

    const result = await db.query(
      `UPDATE voters SET ncp_support = $1, is_contacted = true, contacted_at = NOW()
       WHERE id = $2 RETURNING id, voter_id, name, ncp_support`,
      [ncp_support, req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Voter not found" });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};
