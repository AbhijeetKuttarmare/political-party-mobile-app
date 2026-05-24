const db     = require("../config/database");
const logger = require("../middleware/logger");
const { ROLES, PAGINATION } = require("../config/constants");
const path   = require("path");
const fs     = require("fs");

/* ─── GET /api/booths ───────────────────────────────────────── */
exports.getBooths = async (req, res, next) => {
  try {
    const { area, election, district, constituency, status, search, sort = "default",
            page = 1, limit = PAGINATION.DEFAULT_LIMIT } = req.query;
    const user   = req.user;
    const offset = (parseInt(page) - 1) * Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);

    const params = [];
    let query = `
      SELECT b.*, bc.coverage_pct, bc.confirmed_ncp, bc.undecided,
             bc.opposition, bc.surveyed, bc.last_computed_at,
             d.name AS district_name
      FROM booths b
      LEFT JOIN booth_stats_cache bc ON bc.booth_id = b.id
      LEFT JOIN districts d ON d.id = b.district_id
      WHERE 1=1
    `;

    // Role-based scoping (takes precedence over filters)
    if (user.role === ROLES.BOOTH_WORKER && user.booth_id) {
      params.push(user.booth_id);
      query += ` AND b.id = $${params.length}`;
    } else if (user.role === ROLES.TALUKA_LEADER && user.area_id) {
      params.push(user.area_id);
      query += ` AND b.area_id = $${params.length}`;
    } else if (user.role === ROLES.DISTRICT_LEADER && user.district_id) {
      params.push(user.district_id);
      query += ` AND b.district_id = $${params.length}`;
    }

    if (area)     { params.push(area);     query += ` AND b.area_id = $${params.length}`; }
    if (election) { params.push(election); query += ` AND b.election_id = $${params.length}`; }
    if (district) {
      // Match by name to handle duplicate district IDs from multiple seed runs
      params.push(parseInt(district));
      query += ` AND b.district_id IN (SELECT id FROM districts WHERE name = (SELECT name FROM districts WHERE id = $${params.length}))`;
    }
    if (constituency) { params.push(constituency); query += ` AND b.constituency = $${params.length}`; }
    if (status)       { params.push(status);       query += ` AND b.status = $${params.length}`; }
    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      query += ` AND (LOWER(b.village) LIKE $${params.length} OR LOWER(b.booth_number) LIKE $${params.length} OR LOWER(b.booth_leader) LIKE $${params.length} OR LOWER(b.constituency) LIKE $${params.length})`;
    }

    // Count total
    const countResult = await db.query(
      query.replace(/SELECT.*?FROM booths/s, "SELECT COUNT(*) FROM booths").split("ORDER")[0],
      params
    );
    const total = parseInt(countResult.rows[0].count || 0);

    // Sort order: district → election → status priority → booth_number
    const statusOrder = `CASE b.status WHEN 'critical' THEN 1 WHEN 'weak' THEN 2 WHEN 'swing' THEN 3 ELSE 4 END`;
    const elecOrder   = `CASE b.election_id WHEN 'ls' THEN 1 WHEN 'vs' THEN 2 WHEN 'vp' THEN 3 WHEN 'zp' THEN 4 WHEN 'mc' THEN 5 WHEN 'ps' THEN 6 WHEN 'gp' THEN 7 WHEN 'np' THEN 8 ELSE 9 END`;
    query += ` ORDER BY d.name NULLS LAST, ${elecOrder}, ${statusOrder}, b.booth_number`;

    params.push(Math.min(parseInt(limit), PAGINATION.MAX_LIMIT), offset);
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await db.query(query, params);

    res.json({
      data:  result.rows,
      total,
      page:  parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    next(err);
  }
};

/* ─── GET /api/booths/:id ───────────────────────────────────── */
exports.getBoothById = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT b.*, bc.*, d.name AS district_name, a.name AS area_name
      FROM booths b
      LEFT JOIN booth_stats_cache bc ON bc.booth_id = b.id
      LEFT JOIN districts d ON d.id = b.district_id
      LEFT JOIN areas a ON a.id = b.area_id
      WHERE b.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: "Booth not found" });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

/* ─── GET /api/booths/:id/summary ───────────────────────────── */
exports.getBoothSummary = async (req, res, next) => {
  try {
    const [boothRes, surveyRes, checkinRes] = await Promise.all([
      db.query("SELECT b.*, bc.* FROM booths b LEFT JOIN booth_stats_cache bc ON bc.booth_id = b.id WHERE b.id = $1", [req.params.id]),
      db.query("SELECT response, COUNT(*) AS count FROM surveys WHERE booth_id = $1 GROUP BY response", [req.params.id]),
      db.query("SELECT COUNT(*) AS total, MAX(checked_in_at) AS last_checkin FROM checkins WHERE booth_id = $1", [req.params.id]),
    ]);

    if (boothRes.rows.length === 0) return res.status(404).json({ error: "Booth not found" });

    res.json({
      booth:    boothRes.rows[0],
      surveys:  surveyRes.rows,
      checkins: checkinRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/* ─── GET /api/booths/meta ───────────────────────────────────── */
// Returns filter metadata: all districts + election types present in booths
exports.getBoothMeta = async (req, res, next) => {
  try {
    const [distRes, elecRes, constRes] = await Promise.all([
      // All 36 districts deduplicated by name
      db.query(`SELECT MIN(id) AS id, name FROM districts GROUP BY name ORDER BY name`),
      // Only election types that actually have booth data
      db.query(`SELECT DISTINCT b.election_id AS id, e.label
                FROM booths b
                LEFT JOIN elections e ON e.id = b.election_id
                WHERE b.election_id IS NOT NULL
                ORDER BY b.election_id`),
      // All distinct constituencies from booths
      db.query(`SELECT DISTINCT constituency
                FROM booths
                WHERE constituency IS NOT NULL AND TRIM(constituency) != ''
                ORDER BY constituency`),
    ]);
    res.json({
      districts:      distRes.rows,
      elections:      elecRes.rows,
      constituencies: constRes.rows.map(r => r.constituency),
    });
  } catch (err) { next(err); }
};

/* ─── GET /api/booths/talukas?district_id=X ─────────────────── */
// Bridges districts(id) → mh_talukas via name match
exports.getBoothTalukas = async (req, res, next) => {
  try {
    const { district_id } = req.query;
    if (!district_id) return res.json([]);

    const result = await db.query(`
      SELECT t.code, t.name
      FROM mh_talukas t
      JOIN mh_districts md ON md.code = t.district_code
      JOIN districts d ON LOWER(d.name) = LOWER(md.name)
      WHERE d.id = $1
      ORDER BY t.name
    `, [parseInt(district_id)]);

    res.json(result.rows);
  } catch (err) { next(err); }
};

/* ─── GET /api/booths/villages?taluka_code=X ─────────────────── */
exports.getBoothVillages = async (req, res, next) => {
  try {
    const { taluka_code } = req.query;
    if (!taluka_code) return res.json([]);

    const result = await db.query(`
      SELECT code, name
      FROM mh_villages
      WHERE taluka_code = $1
      ORDER BY name
      LIMIT 500
    `, [taluka_code]);

    res.json(result.rows);
  } catch (err) { next(err); }
};

/* ─── GET /api/booths/districts ─────────────────────────────── */
exports.getBoothDistricts = async (req, res, next) => {
  try {
    // Return all 36 districts, deduplicated by name (handles repeated seed runs)
    const result = await db.query(`
      SELECT MIN(id) AS id, name
      FROM districts
      GROUP BY name
      ORDER BY name
    `);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

/* ─── POST /api/booths ──────────────────────────────────────── */
exports.createBooth = async (req, res, next) => {
  try {
    const {
      booth_number, village, taluka, constituency, district_id,
      area_id, election_id, total_voters = 0, volunteers = 0,
      max_volunteers = 5, status = "swing", booth_leader = null,
      sentiment_pct = 0, women_outreach = 0, youth_support = 0,
    } = req.body;

    if (!booth_number || !village || !election_id) {
      return res.status(400).json({ error: "booth_number, village, and election_id are required" });
    }

    const valid = ["strong", "swing", "weak", "critical"];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${valid.join(", ")}` });
    }

    const result = await db.query(
      `INSERT INTO booths
         (booth_number, village, taluka, constituency, district_id, area_id,
          election_id, total_voters, volunteers, max_volunteers, status,
          booth_leader, sentiment_pct, women_outreach, youth_support,
          last_activity_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())
       RETURNING *`,
      [booth_number, village, taluka ?? null, constituency ?? null,
       district_id ?? null, area_id ?? null, election_id,
       total_voters, volunteers, max_volunteers, status,
       booth_leader, sentiment_pct, women_outreach, youth_support]
    );

    logger.info(`[BOOTH] Created: booth ${booth_number} by ${req.user.name}`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

/* ─── POST /api/booths/bulk ─────────────────────────────────── */
exports.bulkCreateBooths = async (req, res, next) => {
  try {
    const { booths } = req.body;
    if (!Array.isArray(booths) || booths.length === 0) {
      return res.status(400).json({ error: "Provide a non-empty booths array" });
    }
    if (booths.length > 500) {
      return res.status(400).json({ error: "Max 500 booths per upload" });
    }

    const VALID_STATUS   = ["strong", "swing", "weak", "critical"];
    const VALID_ELECTION = ["ls","vs","vp","mc","zp","ps","gp","np"];

    // Build district name → id map once
    const distRes = await db.query("SELECT id, LOWER(name) AS name FROM districts");
    const distMap = Object.fromEntries(distRes.rows.map(r => [r.name, r.id]));

    const inserted = [];
    const errors   = [];
    let conn;
    try {
      conn = await db.connect();
    } catch (connErr) {
      return next(connErr);
    }
    try {
      await conn.query("BEGIN");
      for (let i = 0; i < booths.length; i++) {
        const b   = booths[i];
        const row = i + 2; // row number in CSV (1=header, 2=first data)
        try {
          if (!b.booth_number?.toString().trim()) throw new Error("booth_number is required");
          if (!b.village?.toString().trim())      throw new Error("village is required");
          const elec = b.election_id?.toString().toLowerCase().trim();
          if (!elec || !VALID_ELECTION.includes(elec)) throw new Error(`election_id must be one of: ${VALID_ELECTION.join(", ")}`);

          const status = (b.status?.toString().toLowerCase().trim()) || "swing";
          if (!VALID_STATUS.includes(status)) throw new Error(`status must be one of: ${VALID_STATUS.join(", ")}`);

          // Resolve district: accept id (number) or name (string)
          let districtId = null;
          if (b.district_id && !isNaN(Number(b.district_id))) {
            districtId = Number(b.district_id);
          } else if (b.district_name) {
            districtId = distMap[b.district_name.toLowerCase().trim()] ?? null;
            if (!districtId) throw new Error(`District "${b.district_name}" not found`);
          }

          const r = await conn.query(
            `INSERT INTO booths
               (booth_number, village, taluka, constituency, district_id, area_id,
                election_id, total_voters, volunteers, max_volunteers, status,
                booth_leader, sentiment_pct, women_outreach, youth_support,
                last_activity_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())
             ON CONFLICT DO NOTHING
             RETURNING id`,
            [
              b.booth_number.toString().trim(),
              b.village.toString().trim(),
              b.taluka?.toString().trim() || null,
              b.constituency?.toString().trim() || null,
              districtId,
              b.area_id?.toString().trim() || null,
              elec,
              parseInt(b.total_voters) || 0,
              parseInt(b.volunteers)   || 0,
              parseInt(b.max_volunteers) || 5,
              status,
              b.booth_leader?.toString().trim() || null,
              parseInt(b.sentiment_pct)  || 0,
              parseInt(b.women_outreach) || 0,
              parseInt(b.youth_support)  || 0,
            ]
          );
          if (r.rows.length > 0) inserted.push(r.rows[0].id);
        } catch (rowErr) {
          errors.push({ row, booth_number: booths[i]?.booth_number ?? "", error: rowErr.message });
        }
      }
      await conn.query("COMMIT");
    } catch (txErr) {
      await conn.query("ROLLBACK");
      throw txErr;
    } finally {
      conn?.release();
    }

    logger.info(`[BOOTH] Bulk upload by ${req.user.name}: ${inserted.length} inserted, ${errors.length} errors`);
    res.json({ inserted: inserted.length, errors });
  } catch (err) {
    next(err);
  }
};

/* ─── PUT /api/booths/:id ───────────────────────────────────── */
exports.updateBooth = async (req, res, next) => {
  try {
    const {
      booth_number, village, taluka, constituency,
      election_id, district_id, area_id,
      total_voters, covered, volunteers, max_volunteers,
      status, booth_leader, sentiment_pct, women_outreach, youth_support,
    } = req.body;

    if (!booth_number?.toString().trim()) {
      return res.status(400).json({ error: "booth_number is required" });
    }
    if (!village?.toString().trim()) {
      return res.status(400).json({ error: "village is required" });
    }

    const VALID_STATUS   = ["strong", "swing", "weak", "critical"];
    const VALID_ELECTION = ["ls", "vs", "vp", "mc", "zp", "ps", "gp", "np"];

    if (status && !VALID_STATUS.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${VALID_STATUS.join(", ")}` });
    }
    if (election_id && !VALID_ELECTION.includes(election_id)) {
      return res.status(400).json({ error: `election_id must be one of: ${VALID_ELECTION.join(", ")}` });
    }

    const result = await db.query(
      `UPDATE booths SET
         booth_number     = $1,
         village          = $2,
         taluka           = $3,
         constituency     = $4,
         election_id      = COALESCE($5, election_id),
         district_id      = $6,
         area_id          = $7,
         total_voters     = $8,
         covered          = COALESCE($9, covered),
         volunteers       = $10,
         max_volunteers   = $11,
         status           = COALESCE($12, status),
         booth_leader     = $13,
         sentiment_pct    = $14,
         women_outreach   = $15,
         youth_support    = $16,
         last_activity_at = NOW(),
         updated_at       = NOW()
       WHERE id = $17
       RETURNING *`,
      [
        booth_number.toString().trim(),
        village.toString().trim(),
        taluka?.toString().trim()       || null,
        constituency?.toString().trim() || null,
        election_id                     || null,
        district_id                     ? Number(district_id)    : null,
        area_id?.toString().trim()      || null,
        parseInt(total_voters)          || 0,
        covered != null                 ? parseInt(covered)      : null,
        parseInt(volunteers)            || 0,
        parseInt(max_volunteers)        || 5,
        status                          || null,
        booth_leader?.toString().trim() || null,
        parseInt(sentiment_pct)         || 0,
        parseInt(women_outreach)        || 0,
        parseInt(youth_support)         || 0,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Booth not found" });
    logger.info(`[BOOTH] Updated: booth ${result.rows[0].booth_number} by ${req.user.name}`);
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

/* ─── PATCH /api/booths/:id/status ──────────────────────────── */
exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const valid = ["strong", "swing", "weak", "critical"];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${valid.join(", ")}` });
    }

    const result = await db.query(
      "UPDATE booths SET status = $1 WHERE id = $2 RETURNING id, booth_number, status",
      [status, req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Booth not found" });
    logger.info(`[BOOTH] Status updated: booth ${result.rows[0].booth_number} → ${status} by ${req.user.name}`);
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

/* ─── POST /api/booths/:id/voter-list ───────────────────────── */
exports.uploadVoterList = async (req, res, next) => {
  try {
    const { fileName, fileData } = req.body || {};
    if (!fileData) {
      return res.status(400).json({ error: "No PDF data provided" });
    }

    // Strip data-URL prefix if present (e.g. "data:application/pdf;base64,...")
    const base64 = fileData.includes(",") ? fileData.split(",")[1] : fileData;
    const buffer = Buffer.from(base64, "base64");

    if (buffer.length === 0) {
      return res.status(400).json({ error: "PDF file is empty" });
    }

    const boothRes = await db.query(
      "SELECT id, booth_number, voter_list_pdf_url FROM booths WHERE id = $1",
      [req.params.id]
    );
    if (boothRes.rows.length === 0) {
      return res.status(404).json({ error: "Booth not found" });
    }

    // Delete previous PDF file if exists
    const oldUrl = boothRes.rows[0].voter_list_pdf_url;
    if (oldUrl) {
      const oldFile = path.join(__dirname, "../../../", oldUrl.replace(/^\//, ""));
      fs.unlink(oldFile, () => {});
    }

    const origName  = fileName || "voter-list.pdf";
    const filename  = `booth-${req.params.id}-${Date.now()}.pdf`;
    const filePath  = path.join(__dirname, "../../../uploads/voter-lists", filename);

    fs.writeFileSync(filePath, buffer);

    const relativeUrl = `/uploads/voter-lists/${filename}`;
    const result = await db.query(
      `UPDATE booths SET
         voter_list_pdf_url     = $1,
         voter_list_pdf_name    = $2,
         voter_list_uploaded_at = NOW(),
         last_activity_at       = NOW()
       WHERE id = $3
       RETURNING id, booth_number, voter_list_pdf_url, voter_list_pdf_name, voter_list_uploaded_at`,
      [relativeUrl, origName, req.params.id]
    );

    logger.info(`[BOOTH] Voter list uploaded for booth ${boothRes.rows[0].booth_number} by ${req.user.name} (${(buffer.length / 1024).toFixed(0)} KB)`);
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

/* ─── DELETE /api/booths/:id/voter-list ─────────────────────── */
exports.deleteVoterList = async (req, res, next) => {
  try {
    const boothRes = await db.query(
      "SELECT id, booth_number, voter_list_pdf_url FROM booths WHERE id = $1",
      [req.params.id]
    );
    if (boothRes.rows.length === 0) return res.status(404).json({ error: "Booth not found" });

    const oldUrl = boothRes.rows[0].voter_list_pdf_url;
    if (oldUrl) {
      const oldFile = path.join(__dirname, "../../../", oldUrl.replace(/^\//, ""));
      fs.unlink(oldFile, () => {});
    }

    await db.query(
      "UPDATE booths SET voter_list_pdf_url = NULL, voter_list_pdf_name = NULL, voter_list_uploaded_at = NULL WHERE id = $1",
      [req.params.id]
    );

    logger.info(`[BOOTH] Voter list deleted for booth ${boothRes.rows[0].booth_number} by ${req.user.name}`);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
