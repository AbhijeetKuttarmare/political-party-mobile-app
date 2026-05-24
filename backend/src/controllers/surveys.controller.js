const db     = require("../config/database");
const logger = require("../middleware/logger");
const { ROLES } = require("../config/constants");

/* ─── POST /api/surveys ─────────────────────────────────────── */
exports.submit = async (req, res, next) => {
  const client = await db.connect();
  try {
    const { voter_id, booth_id, response, issues = [], note } = req.body;
    const volunteer_id = req.user.id;

    await client.query("BEGIN");

    // Insert survey record
    const survey = await client.query(`
      INSERT INTO surveys (voter_id, booth_id, volunteer_id, response, issues, note)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, surveyed_at
    `, [voter_id || null, booth_id, volunteer_id, response, issues, note]);

    // Mark voter contacted
    if (voter_id) {
      await client.query(`
        UPDATE voters
        SET is_contacted = true, contacted_at = NOW(), ncp_support = $1
        WHERE id = $2
      `, [response, voter_id]);
    }

    // Refresh booth stats cache
    await client.query(`
      INSERT INTO booth_stats_cache
        (booth_id, total_voters, contacted, surveyed, confirmed_ncp, undecided, opposition, coverage_pct, sentiment_pct, active_volunteers)
      SELECT
        b.id,
        b.total_voters,
        COUNT(DISTINCT v2.id) FILTER (WHERE v2.is_contacted),
        COUNT(DISTINCT s2.id),
        COUNT(DISTINCT s2.id) FILTER (WHERE s2.response = 'ncp'),
        COUNT(DISTINCT s2.id) FILTER (WHERE s2.response = 'undecided'),
        COUNT(DISTINCT s2.id) FILTER (WHERE s2.response = 'opposition'),
        CASE WHEN b.total_voters > 0 THEN
          ROUND(COUNT(DISTINCT v2.id) FILTER (WHERE v2.is_contacted)::NUMERIC / b.total_voters * 100)
        ELSE 0 END,
        CASE WHEN COUNT(DISTINCT s2.id) > 0 THEN
          ROUND(COUNT(DISTINCT s2.id) FILTER (WHERE s2.response = 'ncp')::NUMERIC / COUNT(DISTINCT s2.id) * 100)
        ELSE 0 END,
        (SELECT COUNT(*) FROM volunteers vol WHERE vol.assigned_booth = b.id AND vol.is_active)
      FROM booths b
      LEFT JOIN voters v2   ON v2.booth_id = b.id
      LEFT JOIN surveys s2  ON s2.booth_id = b.id
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

    logger.info(`[SURVEY] Submitted by ${req.user.name} — booth_id=${booth_id} response=${response}`);

    res.status(201).json({
      success:    true,
      survey_id:  survey.rows[0].id,
      surveyed_at: survey.rows[0].surveyed_at,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};

/* ─── GET /api/surveys ──────────────────────────────────────── */
exports.getAll = async (req, res, next) => {
  try {
    const { booth, date, response, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const user   = req.user;
    const params = [];

    let query = `
      SELECT s.*, v.name AS voter_name, v.voter_id,
             vol.name AS volunteer_name
      FROM surveys s
      JOIN booths b ON b.id = s.booth_id
      LEFT JOIN voters v ON v.id = s.voter_id
      LEFT JOIN volunteers vol ON vol.id = s.volunteer_id
      WHERE 1=1
    `;

    // Role-based scoping
    if (user.role === ROLES.BOOTH_WORKER && user.booth_id) {
      params.push(user.booth_id);
      query += ` AND s.booth_id = $${params.length}`;
    } else if (user.role === ROLES.TALUKA_LEADER && user.area_id) {
      params.push(user.area_id);
      query += ` AND b.area_id = $${params.length}`;
    } else if (user.role === ROLES.DISTRICT_LEADER && user.district_id) {
      params.push(user.district_id);
      query += ` AND b.district_id = $${params.length}`;
    }
    // super_admin, state_leader, observer see all

    if (booth)    { params.push(booth);    query += ` AND s.booth_id = $${params.length}`; }
    if (response) { params.push(response); query += ` AND s.response = $${params.length}`; }
    if (date)     { params.push(date);     query += ` AND s.surveyed_at::date = $${params.length}`; }

    query += ` ORDER BY s.surveyed_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

/* ─── GET /api/surveys/booth/:booth_id/stats ────────────────── */
exports.getBoothStats = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        response,
        COUNT(*)                                   AS count,
        ROUND(COUNT(*)::NUMERIC / SUM(COUNT(*)) OVER () * 100, 1) AS percentage
      FROM surveys
      WHERE booth_id = $1
      GROUP BY response
      ORDER BY count DESC
    `, [req.params.booth_id]);

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};
