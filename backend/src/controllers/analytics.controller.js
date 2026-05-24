const db = require("../config/database");
const { ROLES } = require("../config/constants");

/* ─── GET /api/analytics/issues?election_id=zp ─────────────────
 * Returns voter issues ranked by score for the given election.
 * Falls back to 'zp' if no election_id provided.
 */
exports.getIssues = async (req, res, next) => {
  try {
    const { election_id = "zp" } = req.query;

    const result = await db.query(
      `SELECT label, score, icon
       FROM voter_issues
       WHERE election_id = $1
       ORDER BY sort_order`,
      [election_id]
    );

    // If no issues exist for this election_id, return generic fallback
    if (result.rows.length === 0) {
      return res.json([
        { label: "Farm Loan Waiver",   score: 78, icon: "🌾" },
        { label: "Water Supply",        score: 64, icon: "💧" },
        { label: "Road Infrastructure", score: 71, icon: "🛣️" },
        { label: "Employment",          score: 55, icon: "💼" },
        { label: "Education Access",    score: 48, icon: "📚" },
      ]);
    }

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

/* ─── GET /api/analytics/summary?election_id=zp ────────────────
 * Aggregates area-level stats: avg vote share, avg coverage,
 * total volunteers, voter breakdown (NCP / undecided / opposition).
 * Used by the Analytics tab win-probability gauge.
 */
exports.getSummary = async (req, res, next) => {
  try {
    const { election_id = "zp" } = req.query;
    const user = req.user;

    const areaParams = [election_id];
    let areaQuery = `
      SELECT id, name, ncp_vote_share, prev_vote_share,
             coverage_pct, active_volunteers, total_voters
      FROM areas
      WHERE election_id = $1
    `;

    // District leaders only see their own district's areas
    if (user.role === ROLES.DISTRICT_LEADER && user.district_id) {
      areaParams.push(user.district_id);
      areaQuery += ` AND district_id = $${areaParams.length}`;
    } else if (user.role === ROLES.TALUKA_LEADER && user.area_id) {
      areaParams.push(user.area_id);
      areaQuery += ` AND id = $${areaParams.length}`;
    }

    areaQuery += " ORDER BY ncp_vote_share DESC";

    const [areasRes, issuesRes] = await Promise.all([
      db.query(areaQuery, areaParams),
      db.query(
        `SELECT label, score, icon
         FROM voter_issues
         WHERE election_id = $1
         ORDER BY sort_order`,
        [election_id]
      ),
    ]);

    const areas = areasRes.rows;
    if (areas.length === 0) {
      return res.json({ areas: [], issues: issuesRes.rows });
    }

    const avgShare    = Math.round(areas.reduce((s, a) => s + Number(a.ncp_vote_share), 0) / areas.length);
    const avgCoverage = Math.round(areas.reduce((s, a) => s + Number(a.coverage_pct), 0) / areas.length);
    const totalVols   = areas.reduce((s, a) => s + Number(a.active_volunteers), 0);
    const totalVoters = areas.reduce((s, a) => s + Number(a.total_voters), 0);
    const winProb     = Math.min(98, Math.round(avgShare * 1.12 + (avgCoverage - 50) * 0.15));

    const confirmedNCP = Math.round(totalVoters * (avgShare / 100) * 0.78);
    const undecided    = Math.round(totalVoters * 0.17);
    const opposition   = Math.max(0, totalVoters - confirmedNCP - undecided);

    res.json({
      election_id,
      win_probability:  winProb,
      avg_vote_share:   avgShare,
      avg_coverage:     avgCoverage,
      total_volunteers: totalVols,
      total_voters:     totalVoters,
      confirmed_ncp:    confirmedNCP,
      undecided,
      opposition,
      areas: areas.map(a => ({
        id:               a.id,
        name:             a.name,
        vote_share:       Number(a.ncp_vote_share),
        prev_vote_share:  Number(a.prev_vote_share) || 0,
        coverage_pct:     Number(a.coverage_pct),
      })),
      issues: issuesRes.rows,
    });
  } catch (err) {
    next(err);
  }
};
