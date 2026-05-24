const db = require("../config/database");

/* ─── GET /api/hierarchy/districts ────────────────────────── */
exports.getDistricts = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT d.code, d.name, d.name_marathi, d.population, d.active_leaders,
             COUNT(DISTINCT t.code)::int  AS taluka_count,
             COUNT(DISTINCT v.code)::int  AS village_count,
             COUNT(DISTINCT l.id)::int    AS leader_count
      FROM mh_districts d
      LEFT JOIN mh_talukas  t ON t.district_code = d.code
      LEFT JOIN mh_villages v ON v.district_code = d.code
      LEFT JOIN mh_leaders  l ON l.village_code  = v.code
      GROUP BY d.code, d.name, d.name_marathi, d.population, d.active_leaders
      ORDER BY d.name
    `);
    res.json(result.rows);
  } catch (err) { next(err); }
};

/* ─── GET /api/hierarchy/talukas?district=CODE ─────────────── */
exports.getTalukas = async (req, res, next) => {
  try {
    const { district } = req.query;
    if (!district) return res.status(400).json({ error: "district is required" });

    const result = await db.query(`
      SELECT t.code, t.name, t.name_marathi, t.total_villages,
             COUNT(DISTINCT l.id)::int AS leader_count
      FROM mh_talukas  t
      LEFT JOIN mh_villages v ON v.taluka_code  = t.code
      LEFT JOIN mh_leaders  l ON l.village_code = v.code
      WHERE t.district_code = $1
      GROUP BY t.code, t.name, t.name_marathi, t.total_villages
      ORDER BY t.name
    `, [district]);
    res.json(result.rows);
  } catch (err) { next(err); }
};

/* ─── GET /api/hierarchy/villages?taluka=CODE&page=1&limit=60 ─ */
exports.getVillages = async (req, res, next) => {
  try {
    const { taluka, page = 1, limit = 60 } = req.query;
    if (!taluka) return res.status(400).json({ error: "taluka is required" });

    const lim    = Math.min(parseInt(limit), 200);
    const offset = (parseInt(page) - 1) * lim;

    const [villagesRes, countRes] = await Promise.all([
      db.query(`
        SELECT v.code, v.name, v.name_marathi, v.type, v.population,
               COALESCE(
                 json_agg(json_build_object('name', l.name, 'designation', l.designation))
                 FILTER (WHERE l.id IS NOT NULL), '[]'
               ) AS leaders
        FROM mh_villages v
        LEFT JOIN mh_leaders l ON l.village_code = v.code
        WHERE v.taluka_code = $1
        GROUP BY v.code, v.name, v.name_marathi, v.type, v.population
        ORDER BY v.name
        LIMIT $2 OFFSET $3
      `, [taluka, lim, offset]),
      db.query(`SELECT COUNT(*)::int AS total FROM mh_villages WHERE taluka_code = $1`, [taluka]),
    ]);

    res.json({
      data:  villagesRes.rows,
      total: countRes.rows[0].total,
      page:  parseInt(page),
      limit: lim,
    });
  } catch (err) { next(err); }
};

/* ─── GET /api/hierarchy/search?q=QUERY&limit=20 ───────────── */
exports.search = async (req, res, next) => {
  try {
    const { q = "", limit = 20 } = req.query;
    if (!q.trim()) return res.json([]);

    const pattern = `%${q.trim()}%`;
    const lim     = Math.min(parseInt(limit), 50);

    const result = await db.query(`
      (
        SELECT 'village' AS type, v.code, v.name,
               t.name AS taluka_name, d.name AS district_name, NULL::integer AS village_count
        FROM mh_villages v
        JOIN mh_talukas  t ON t.code = v.taluka_code
        JOIN mh_districts d ON d.code = v.district_code
        WHERE v.name ILIKE $1
        LIMIT $2
      )
      UNION ALL
      (
        SELECT 'taluka' AS type, t.code, t.name,
               d.name AS district_name, NULL AS taluka_name, t.total_villages AS village_count
        FROM mh_talukas  t
        JOIN mh_districts d ON d.code = t.district_code
        WHERE t.name ILIKE $1
        LIMIT $2
      )
      UNION ALL
      (
        SELECT 'district' AS type, d.code, d.name,
               NULL AS taluka_name, NULL AS district_name,
               COUNT(v.code)::integer AS village_count
        FROM mh_districts d
        LEFT JOIN mh_villages v ON v.district_code = d.code
        WHERE d.name ILIKE $1
        GROUP BY d.code, d.name
        LIMIT $2
      )
      ORDER BY type DESC, name
      LIMIT $2
    `, [pattern, lim]);

    res.json(result.rows);
  } catch (err) { next(err); }
};
