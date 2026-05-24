/*
 * controllers/campaign.controller.js
 * Manages campaign_events — rallies, meetings, drives etc.
 * Super admin / state leader create & edit; all logged-in users can read.
 */

const db     = require("../config/database");
const logger = require("../middleware/logger");

/* ─── GET /api/campaign/events ───────────────────────────────── */
exports.getEvents = async (req, res, next) => {
  try {
    const { election_id, district, status, limit = 100 } = req.query;
    const me = req.user.id;
    const params = [me]; // $1 = current user id (for per-user flags)
    let q = `
      SELECT ce.*,
             a.name AS area_name,
             COUNT(DISTINCT cel.volunteer_id)::INT  AS like_count,
             COUNT(DISTINCT r_go.volunteer_id)::INT  AS going_count,
             COUNT(DISTINCT r_int.volunteer_id)::INT AS interested_count,
             EXISTS(
               SELECT 1 FROM campaign_event_likes
               WHERE event_id = ce.id AND volunteer_id = $1
             ) AS liked_by_me,
             EXISTS(
               SELECT 1 FROM campaign_event_bookmarks
               WHERE event_id = ce.id AND volunteer_id = $1
             ) AS bookmarked_by_me,
             (SELECT status FROM campaign_event_rsvp
               WHERE event_id = ce.id AND volunteer_id = $1
               LIMIT 1
             ) AS my_rsvp
      FROM   campaign_events ce
      LEFT JOIN areas a ON a.id = ce.area_id
      LEFT JOIN campaign_event_likes cel ON cel.event_id = ce.id
      LEFT JOIN campaign_event_rsvp r_go  ON r_go.event_id  = ce.id AND r_go.status  = 'going'
      LEFT JOIN campaign_event_rsvp r_int ON r_int.event_id = ce.id AND r_int.status = 'interested'
      WHERE  1=1
    `;
    if (election_id) { params.push(election_id); q += ` AND ce.election_id = $${params.length}`; }
    if (district)    { params.push(`%${district.toLowerCase()}%`); q += ` AND LOWER(ce.district) LIKE $${params.length}`; }
    if (status)      { params.push(status); q += ` AND ce.status = $${params.length}`; }
    q += ` GROUP BY ce.id, a.name ORDER BY ce.event_date ASC, ce.event_time ASC`;
    params.push(Math.min(parseInt(limit), 200));
    q += ` LIMIT $${params.length}`;
    const result = await db.query(q, params);
    res.json(result.rows);
  } catch (err) { next(err); }
};

/* ─── POST /api/campaign/events/:id/like  (toggle) ──────────── */
exports.toggleEventLike = async (req, res, next) => {
  try {
    const eventId = parseInt(req.params.id);
    const me      = req.user.id;

    const existing = await db.query(
      "SELECT 1 FROM campaign_event_likes WHERE event_id = $1 AND volunteer_id = $2",
      [eventId, me]
    );

    if (existing.rows.length) {
      await db.query(
        "DELETE FROM campaign_event_likes WHERE event_id = $1 AND volunteer_id = $2",
        [eventId, me]
      );
    } else {
      await db.query(
        "INSERT INTO campaign_event_likes (event_id, volunteer_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        [eventId, me]
      );
    }

    const { rows } = await db.query(
      "SELECT COUNT(*)::INT AS n FROM campaign_event_likes WHERE event_id = $1",
      [eventId]
    );
    res.json({ liked: !existing.rows.length, count: rows[0].n });
  } catch (err) { next(err); }
};

/* ─── POST /api/campaign/events ──────────────────────────────── */
exports.createEvent = async (req, res, next) => {
  try {
    const { title, type, location, district, area_id, election_id,
            event_date, event_time, coordinator, expected_attendance, notes } = req.body;

    if (!title?.trim())    return res.status(400).json({ error: "Title is required" });
    if (!location?.trim()) return res.status(400).json({ error: "Location is required" });
    if (!event_date)       return res.status(400).json({ error: "Event date is required" });

    const { rows: [event] } = await db.query(
      `INSERT INTO campaign_events
         (title, type, location, district, area_id, election_id,
          event_date, event_time, coordinator, expected_attendance, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [title.trim(), type || "rally", location.trim(), district || null, area_id || null,
       election_id || null, event_date, event_time || "TBD", coordinator || null,
       expected_attendance || 0, notes || null, req.user.id]
    );

    // Auto-post to social feed so all users see the event
    const postContent = notes?.trim()
      ? notes.trim()
      : `${type || "Rally"} at ${location.trim()}${district ? `, ${district}` : ""}.${expected_attendance ? ` Expected attendance: ${expected_attendance}+.` : ""}`;
    await db.query(
      `INSERT INTO posts (author_id, type, content, event_title, event_date, event_time, event_location)
       VALUES ($1, 'event', $2, $3, $4, $5, $6)`,
      [req.user.id, postContent, title.trim(), event_date, event_time || "TBD", location.trim()]
    );

    logger.info(`[CAMPAIGN] Event created: "${title}" by ${req.user.name}`);
    res.status(201).json(event);
  } catch (err) { next(err); }
};

/* ─── PUT /api/campaign/events/:id ───────────────────────────── */
exports.updateEvent = async (req, res, next) => {
  try {
    const { title, type, location, district, area_id, election_id,
            event_date, event_time, coordinator, expected_attendance, status, notes } = req.body;

    const result = await db.query(
      `UPDATE campaign_events SET
         title=$1, type=$2, location=$3, district=$4, area_id=$5, election_id=$6,
         event_date=$7, event_time=$8, coordinator=$9, expected_attendance=$10,
         status=$11, notes=$12
       WHERE id=$13
       RETURNING *`,
      [title, type, location, district || null, area_id || null, election_id || null,
       event_date, event_time || "TBD", coordinator || null, expected_attendance || 0,
       status || "upcoming", notes || null, req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Event not found" });
    logger.info(`[CAMPAIGN] Event updated: id=${req.params.id} by ${req.user.name}`);
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

/* ─── DELETE /api/campaign/events/:id ────────────────────────── */
exports.deleteEvent = async (req, res, next) => {
  try {
    const result = await db.query(
      "DELETE FROM campaign_events WHERE id=$1 RETURNING id, title",
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Event not found" });
    logger.info(`[CAMPAIGN] Event deleted: "${result.rows[0].title}" by ${req.user.name}`);
    res.json({ message: "Event deleted", id: result.rows[0].id });
  } catch (err) { next(err); }
};

/* ─── GET /api/campaign/events/:id/comments ─────────────────── */
exports.getEventComments = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT ec.id, ec.content, ec.created_at, ec.parent_id,
              v.name AS author_name, v.role AS author_role,
              COUNT(ecl.volunteer_id)::INT AS like_count,
              EXISTS(
                SELECT 1 FROM campaign_event_comment_likes
                WHERE comment_id = ec.id AND volunteer_id = $2
              ) AS liked_by_me
       FROM   campaign_event_comments ec
       JOIN   volunteers v ON v.id = ec.author_id
       LEFT JOIN campaign_event_comment_likes ecl ON ecl.comment_id = ec.id
       WHERE  ec.event_id = $1
       GROUP  BY ec.id, v.name, v.role
       ORDER  BY ec.created_at ASC`,
      [req.params.id, req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

/* ─── POST /api/campaign/events/:id/comments ────────────────── */
exports.addEventComment = async (req, res, next) => {
  try {
    const { content, parent_id } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "content required" });
    const { rows } = await db.query(
      `INSERT INTO campaign_event_comments (event_id, author_id, parent_id, content)
       VALUES ($1, $2, $3, $4)
       RETURNING id, content, created_at, parent_id`,
      [req.params.id, req.user.id, parent_id || null, content.trim()]
    );
    res.status(201).json({
      ...rows[0],
      author_name: req.user.name,
      author_role: req.user.role,
      like_count: 0,
      liked_by_me: false,
    });
  } catch (err) { next(err); }
};

/* ─── POST /api/campaign/events/comments/:id/like (toggle) ──── */
exports.toggleEventCommentLike = async (req, res, next) => {
  try {
    const commentId = parseInt(req.params.id);
    const me        = req.user.id;
    const existing  = await db.query(
      "SELECT 1 FROM campaign_event_comment_likes WHERE comment_id=$1 AND volunteer_id=$2",
      [commentId, me]
    );
    if (existing.rows.length) {
      await db.query(
        "DELETE FROM campaign_event_comment_likes WHERE comment_id=$1 AND volunteer_id=$2",
        [commentId, me]
      );
    } else {
      await db.query(
        "INSERT INTO campaign_event_comment_likes (comment_id, volunteer_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        [commentId, me]
      );
    }
    const { rows } = await db.query(
      "SELECT COUNT(*)::INT AS n FROM campaign_event_comment_likes WHERE comment_id=$1",
      [commentId]
    );
    res.json({ liked: !existing.rows.length, count: rows[0].n });
  } catch (err) { next(err); }
};

/* ─── POST /api/campaign/events/:id/bookmark (toggle) ───────── */
exports.toggleEventBookmark = async (req, res, next) => {
  try {
    const eventId = parseInt(req.params.id);
    const me      = req.user.id;
    const existing = await db.query(
      "SELECT 1 FROM campaign_event_bookmarks WHERE event_id=$1 AND volunteer_id=$2",
      [eventId, me]
    );
    if (existing.rows.length) {
      await db.query(
        "DELETE FROM campaign_event_bookmarks WHERE event_id=$1 AND volunteer_id=$2",
        [eventId, me]
      );
    } else {
      await db.query(
        "INSERT INTO campaign_event_bookmarks (event_id, volunteer_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        [eventId, me]
      );
    }
    res.json({ bookmarked: !existing.rows.length });
  } catch (err) { next(err); }
};
