const express = require("express");
const cors    = require("cors");
require("dotenv").config({ path: "../.env" });

const db = require("./db");

const app  = express();
const PORT = process.env.SERVER_PORT || 3001;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// ─────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────
app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ status: "ok", db: "connected", time: new Date() });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ─────────────────────────────────────────
// ELECTIONS
// GET /api/elections
// ─────────────────────────────────────────
app.get("/api/elections", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM elections WHERE is_active = true ORDER BY id"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// AREAS
// GET /api/areas?election=zp&district=wardha
// ─────────────────────────────────────────
app.get("/api/areas", async (req, res) => {
  try {
    const { election, district } = req.query;

    let query = `
      SELECT a.*, d.name AS district_name
      FROM areas a
      JOIN districts d ON d.id = a.district_id
      WHERE 1=1
    `;
    const params = [];

    if (election) {
      params.push(election);
      query += ` AND a.election_id = $${params.length}`;
    }
    if (district) {
      params.push(district);
      query += ` AND LOWER(d.name) = LOWER($${params.length})`;
    }

    query += " ORDER BY a.ncp_vote_share DESC";

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// BOOTHS
// GET /api/booths?area=wardha-zp&status=critical&page=1
// ─────────────────────────────────────────
app.get("/api/booths", async (req, res) => {
  try {
    const { area, election, status, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];

    let query = `
      SELECT b.*,
             bc.coverage_pct,
             bc.confirmed_ncp,
             bc.undecided,
             bc.opposition,
             bc.last_computed_at,
             d.name AS district_name
      FROM booths b
      LEFT JOIN booth_stats_cache bc ON bc.booth_id = b.id
      LEFT JOIN districts d ON d.id = b.district_id
      WHERE 1=1
    `;

    if (area) {
      params.push(area);
      query += ` AND b.area_id = $${params.length}`;
    }
    if (election) {
      params.push(election);
      query += ` AND b.election_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND b.status = $${params.length}`;
    }

    query += ` ORDER BY
      CASE b.status WHEN 'critical' THEN 1 WHEN 'weak' THEN 2 WHEN 'swing' THEN 3 ELSE 4 END,
      b.booth_number`;

    params.push(parseInt(limit), offset);
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await db.query(query, params);

    // Total count for pagination
    let countQuery = "SELECT COUNT(*) FROM booths WHERE 1=1";
    const countParams = [];
    if (area)     { countParams.push(area);     countQuery += ` AND area_id = $${countParams.length}`; }
    if (election) { countParams.push(election); countQuery += ` AND election_id = $${countParams.length}`; }
    if (status)   { countParams.push(status);   countQuery += ` AND status = $${countParams.length}`; }

    const countResult = await db.query(countQuery, countParams);

    res.json({
      booths: result.rows,
      total:  parseInt(countResult.rows[0].count),
      page:   parseInt(page),
      limit:  parseInt(limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// BOOTH DETAIL
// GET /api/booths/:id
// ─────────────────────────────────────────
app.get("/api/booths/:id", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT b.*, bc.*, d.name AS district_name
      FROM booths b
      LEFT JOIN booth_stats_cache bc ON bc.booth_id = b.id
      LEFT JOIN districts d ON d.id = b.district_id
      WHERE b.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Booth not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// VOTER SEARCH
// GET /api/voters/search?q=Rajesh&booth=5
// ─────────────────────────────────────────
app.get("/api/voters/search", async (req, res) => {
  try {
    const { q, booth, area } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ error: "Search query must be at least 2 characters" });
    }

    const params = [q];
    let query = `
      SELECT voter_id, name, name_marathi, age, gender, address, ncp_support, is_contacted
      FROM voters
      WHERE to_tsvector('simple', name) @@ plainto_tsquery('simple', $1)
    `;

    if (booth) { params.push(booth); query += ` AND booth_id = $${params.length}`; }
    if (area)  { params.push(area);  query += ` AND area_id  = $${params.length}`; }

    query += " LIMIT 25";

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// SUBMIT SURVEY
// POST /api/surveys
// Body: { voter_id, booth_id, volunteer_id, response, issues, note }
// ─────────────────────────────────────────
app.post("/api/surveys", async (req, res) => {
  const client = await db.connect();
  try {
    const { voter_id, booth_id, volunteer_id, response, issues = [], note } = req.body;

    if (!booth_id || !response) {
      return res.status(400).json({ error: "booth_id and response are required" });
    }

    await client.query("BEGIN");

    // Insert survey
    const survey = await client.query(`
      INSERT INTO surveys (voter_id, booth_id, volunteer_id, response, issues, note)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [voter_id, booth_id, volunteer_id, response, issues, note]);

    // Mark voter as contacted
    if (voter_id) {
      await client.query(`
        UPDATE voters SET is_contacted = true, contacted_at = NOW(), ncp_support = $1
        WHERE id = $2
      `, [response, voter_id]);
    }

    // Refresh booth stats cache
    await client.query(`
      INSERT INTO booth_stats_cache (booth_id, total_voters, contacted, surveyed, confirmed_ncp, undecided, opposition, coverage_pct, sentiment_pct, active_volunteers)
      SELECT
        b.id,
        b.total_voters,
        COUNT(DISTINCT v.id) FILTER (WHERE v.is_contacted),
        COUNT(DISTINCT s.id),
        COUNT(DISTINCT s.id) FILTER (WHERE s.response = 'ncp'),
        COUNT(DISTINCT s.id) FILTER (WHERE s.response = 'undecided'),
        COUNT(DISTINCT s.id) FILTER (WHERE s.response = 'opposition'),
        CASE WHEN b.total_voters > 0 THEN ROUND(COUNT(DISTINCT v.id) FILTER (WHERE v.is_contacted)::NUMERIC / b.total_voters * 100) ELSE 0 END,
        CASE WHEN COUNT(DISTINCT s.id) > 0 THEN ROUND(COUNT(DISTINCT s.id) FILTER (WHERE s.response = 'ncp')::NUMERIC / COUNT(DISTINCT s.id) * 100) ELSE 0 END,
        (SELECT COUNT(*) FROM volunteers vol WHERE vol.assigned_booth = b.id AND vol.is_active)
      FROM booths b
      LEFT JOIN voters v ON v.booth_id = b.id
      LEFT JOIN surveys s ON s.booth_id = b.id
      WHERE b.id = $1
      GROUP BY b.id
      ON CONFLICT (booth_id) DO UPDATE SET
        contacted        = EXCLUDED.contacted,
        surveyed         = EXCLUDED.surveyed,
        confirmed_ncp    = EXCLUDED.confirmed_ncp,
        undecided        = EXCLUDED.undecided,
        opposition       = EXCLUDED.opposition,
        coverage_pct     = EXCLUDED.coverage_pct,
        sentiment_pct    = EXCLUDED.sentiment_pct,
        last_computed_at = NOW()
    `, [booth_id]);

    await client.query("COMMIT");
    res.json({ success: true, survey_id: survey.rows[0].id });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────
// VOLUNTEER CHECK-IN
// POST /api/checkins
// Body: { volunteer_id, booth_id, lat, lng, note }
// ─────────────────────────────────────────
app.post("/api/checkins", async (req, res) => {
  try {
    const { volunteer_id, booth_id, lat, lng, note } = req.body;

    if (!volunteer_id || !booth_id) {
      return res.status(400).json({ error: "volunteer_id and booth_id are required" });
    }

    const result = await db.query(`
      INSERT INTO checkins (volunteer_id, booth_id, lat, lng, note)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, checked_in_at
    `, [volunteer_id, booth_id, lat, lng, note]);

    // Update volunteer last seen
    await db.query(`
      UPDATE volunteers SET last_seen_at = NOW(), last_lat = $1, last_lng = $2
      WHERE id = $3
    `, [lat, lng, volunteer_id]);

    res.json({ success: true, checkin: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// AREA SUMMARY (for analytics)
// GET /api/summary?election=zp&district=wardha
// ─────────────────────────────────────────
app.get("/api/summary", async (req, res) => {
  try {
    const { election = "zp", district = "wardha" } = req.query;

    const result = await db.query(`
      SELECT
        COUNT(b.id)                                          AS total_booths,
        COUNT(b.id) FILTER (WHERE b.status = 'strong')      AS strong,
        COUNT(b.id) FILTER (WHERE b.status = 'swing')       AS swing,
        COUNT(b.id) FILTER (WHERE b.status = 'weak')        AS weak,
        COUNT(b.id) FILTER (WHERE b.status = 'critical')    AS critical,
        SUM(b.volunteers)                                    AS total_volunteers,
        ROUND(AVG(bc.coverage_pct))                         AS avg_coverage,
        ROUND(AVG(bc.sentiment_pct))                        AS avg_sentiment,
        SUM(bc.confirmed_ncp)                               AS total_confirmed_ncp,
        SUM(bc.undecided)                                   AS total_undecided
      FROM booths b
      LEFT JOIN booth_stats_cache bc ON bc.booth_id = b.id
      LEFT JOIN districts d ON d.id = b.district_id
      WHERE b.election_id = $1 AND LOWER(d.name) = LOWER($2)
    `, [election, district]);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 NCP Campaign Server running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});
