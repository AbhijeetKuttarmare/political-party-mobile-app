const db     = require("../config/database");
const logger = require("../middleware/logger");

/* ─── GET /api/posts/me/count ────────────────────────────────── */
exports.myPostCount = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      "SELECT COUNT(*)::INT AS count FROM posts WHERE author_id = $1 AND is_active = true",
      [req.user.id]
    );
    res.json({ count: rows[0].count });
  } catch (err) { next(err); }
};

/* ─── GET /api/posts/me?limit=30&offset=0 — logged-in user's own posts ── */
exports.myPosts = async (req, res, next) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 30, 50);
    const offset = parseInt(req.query.offset) || 0;
    const me     = req.user.id;

    const { rows } = await db.query(`
      SELECT
        p.id, p.type, p.content, p.created_at,
        p.event_title, p.event_date, p.event_time, p.event_location,
        p.campaign_title, p.campaign_goal, p.campaign_progress,
        COUNT(DISTINCT pl.volunteer_id)::INT AS like_count,
        COUNT(DISTINCT pc.id)::INT           AS comment_count
      FROM posts p
      LEFT JOIN post_likes    pl ON pl.post_id = p.id
      LEFT JOIN post_comments pc ON pc.post_id = p.id
      WHERE p.author_id = $1 AND p.is_active = true
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `, [me, limit, offset]);

    res.json(rows);
  } catch (err) { next(err); }
};

/* ─── GET /api/posts?limit=20&offset=0 ──────────────────────── */
exports.getFeed = async (req, res, next) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 20, 50);
    const offset = parseInt(req.query.offset) || 0;
    const me     = req.user.id;

    const result = await db.query(`
      SELECT
        p.id, p.type, p.content, p.created_at,
        p.event_title, p.event_date, p.event_time, p.event_location,
        p.campaign_title, p.campaign_goal, p.campaign_progress,
        v.id   AS author_id,
        v.name AS author_name,
        v.role AS author_role,
        COUNT(DISTINCT pl.volunteer_id)::INT  AS like_count,
        COUNT(DISTINCT pc.id)::INT            AS comment_count,
        EXISTS(
          SELECT 1 FROM post_likes     WHERE post_id = p.id AND volunteer_id = $1
        ) AS liked_by_me,
        EXISTS(
          SELECT 1 FROM post_bookmarks WHERE post_id = p.id AND volunteer_id = $1
        ) AS bookmarked_by_me
      FROM posts p
      JOIN volunteers v ON v.id = p.author_id
      LEFT JOIN post_likes    pl ON pl.post_id = p.id
      LEFT JOIN post_comments pc ON pc.post_id = p.id
      WHERE p.is_active = true
      GROUP BY p.id, v.id
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `, [me, limit, offset]);

    res.json(result.rows);
  } catch (err) { next(err); }
};

/* ─── POST /api/posts ────────────────────────────────────────── */
exports.createPost = async (req, res, next) => {
  try {
    const {
      type, content,
      event_title, event_date, event_time, event_location,
      campaign_title, campaign_goal, campaign_progress,
    } = req.body;

    if (!content?.trim()) return res.status(400).json({ error: "Content is required" });

    const insert = await db.query(`
      INSERT INTO posts
        (author_id, type, content,
         event_title, event_date, event_time, event_location,
         campaign_title, campaign_goal, campaign_progress)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id
    `, [
      req.user.id,
      type || "post",
      content.trim(),
      event_title    || null,
      event_date     || null,
      event_time     || null,
      event_location || null,
      campaign_title    || null,
      campaign_goal     || null,
      campaign_progress || 0,
    ]);

    // Return feed-compatible row (same shape as getFeed) so the frontend
    // can call apiPostToPost() without a separate refresh.
    const { rows } = await db.query(`
      SELECT p.id, p.type, p.content, p.created_at,
             p.event_title, p.event_date, p.event_time, p.event_location,
             p.campaign_title, p.campaign_goal, p.campaign_progress,
             v.id   AS author_id,
             v.name AS author_name,
             v.role AS author_role,
             0::INT AS like_count,
             0::INT AS comment_count,
             false  AS liked_by_me,
             false  AS bookmarked_by_me
      FROM posts p
      JOIN volunteers v ON v.id = p.author_id
      WHERE p.id = $1
    `, [insert.rows[0].id]);

    logger.info(`[POST] Created by ${req.user.name} (${req.user.role})`);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

/* ─── DELETE /api/posts/:id ──────────────────────────────────── */
exports.deletePost = async (req, res, next) => {
  try {
    const check = await db.query("SELECT author_id FROM posts WHERE id = $1", [req.params.id]);
    if (!check.rows.length) return res.status(404).json({ error: "Post not found" });
    const isOwner = check.rows[0].author_id === req.user.id;
    const isAdmin = ["super_admin", "state_leader"].includes(req.user.role);
    if (!isOwner && !isAdmin) return res.status(403).json({ error: "Not authorised" });
    await db.query("UPDATE posts SET is_active = false WHERE id = $1", [req.params.id]);
    res.json({ message: "Post removed" });
  } catch (err) { next(err); }
};

/* ─── POST /api/posts/:id/like  (toggle) ────────────────────── */
exports.toggleLike = async (req, res, next) => {
  try {
    const postId = parseInt(req.params.id);
    const me     = req.user.id;

    const existing = await db.query(
      "SELECT 1 FROM post_likes WHERE post_id = $1 AND volunteer_id = $2",
      [postId, me]
    );

    if (existing.rows.length) {
      await db.query("DELETE FROM post_likes WHERE post_id = $1 AND volunteer_id = $2", [postId, me]);
    } else {
      await db.query(
        "INSERT INTO post_likes (post_id, volunteer_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        [postId, me]
      );
    }

    const { rows } = await db.query(
      "SELECT COUNT(*)::INT AS n FROM post_likes WHERE post_id = $1", [postId]
    );
    res.json({ liked: !existing.rows.length, count: rows[0].n });
  } catch (err) { next(err); }
};

/* ─── GET /api/posts/:id/comments ───────────────────────────── */
exports.getComments = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT
        c.id, c.content, c.created_at, c.parent_id,
        v.name AS author_name,
        v.role AS author_role,
        COUNT(DISTINCT cl.volunteer_id)::INT AS like_count,
        EXISTS(
          SELECT 1 FROM post_comment_likes
          WHERE comment_id = c.id AND volunteer_id = $2
        ) AS liked_by_me
      FROM post_comments c
      JOIN volunteers v ON v.id = c.author_id
      LEFT JOIN post_comment_likes cl ON cl.comment_id = c.id
      WHERE c.post_id = $1
      GROUP BY c.id, v.id
      ORDER BY c.created_at ASC
    `, [req.params.id, req.user.id]);

    res.json(rows);
  } catch (err) { next(err); }
};

/* ─── POST /api/posts/:id/comments ──────────────────────────── */
exports.addComment = async (req, res, next) => {
  try {
    const { content, parent_id } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Comment text required" });

    const { rows } = await db.query(`
      INSERT INTO post_comments (post_id, author_id, parent_id, content)
      VALUES ($1, $2, $3, $4)
      RETURNING id, content, created_at, parent_id
    `, [req.params.id, req.user.id, parent_id || null, content.trim()]);

    logger.info(`[COMMENT] Post ${req.params.id} by ${req.user.name}`);
    res.status(201).json({
      ...rows[0],
      author_name: req.user.name,
      author_role: req.user.role,
      like_count:  0,
      liked_by_me: false,
    });
  } catch (err) { next(err); }
};

/* ─── POST /api/comments/:id/like  (toggle) ─────────────────── */
exports.toggleCommentLike = async (req, res, next) => {
  try {
    const commentId = parseInt(req.params.id);
    const me        = req.user.id;

    const existing = await db.query(
      "SELECT 1 FROM post_comment_likes WHERE comment_id = $1 AND volunteer_id = $2",
      [commentId, me]
    );

    if (existing.rows.length) {
      await db.query(
        "DELETE FROM post_comment_likes WHERE comment_id = $1 AND volunteer_id = $2",
        [commentId, me]
      );
    } else {
      await db.query(
        "INSERT INTO post_comment_likes (comment_id, volunteer_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        [commentId, me]
      );
    }

    const { rows } = await db.query(
      "SELECT COUNT(*)::INT AS n FROM post_comment_likes WHERE comment_id = $1",
      [commentId]
    );
    res.json({ liked: !existing.rows.length, count: rows[0].n });
  } catch (err) { next(err); }
};

/* ─── POST /api/posts/:id/bookmark  (toggle) ────────────────── */
exports.toggleBookmark = async (req, res, next) => {
  try {
    const postId = parseInt(req.params.id);
    const me     = req.user.id;

    const existing = await db.query(
      "SELECT 1 FROM post_bookmarks WHERE post_id = $1 AND volunteer_id = $2",
      [postId, me]
    );

    if (existing.rows.length) {
      await db.query("DELETE FROM post_bookmarks WHERE post_id = $1 AND volunteer_id = $2", [postId, me]);
    } else {
      await db.query(
        "INSERT INTO post_bookmarks (post_id, volunteer_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        [postId, me]
      );
    }

    res.json({ bookmarked: !existing.rows.length });
  } catch (err) { next(err); }
};

/* ─── POST /api/posts/:id/report ─────────────────────────────────── */
exports.reportPost = async (req, res, next) => {
  try {
    const postId = parseInt(req.params.id);
    const me     = req.user.id;
    const reason = req.body.reason?.trim() || "inappropriate";

    const exists = await db.query("SELECT 1 FROM posts WHERE id = $1 AND is_active = true", [postId]);
    if (!exists.rows.length) return res.status(404).json({ error: "Post not found" });

    await db.query(`
      INSERT INTO post_reports (post_id, reporter_id, reason)
      VALUES ($1, $2, $3)
      ON CONFLICT (post_id, reporter_id) DO NOTHING
    `, [postId, me, reason]);

    res.json({ reported: true });
  } catch (err) { next(err); }
};

/* ─── POST /api/posts/comments/:id/report ────────────────────────── */
exports.reportComment = async (req, res, next) => {
  try {
    const commentId = parseInt(req.params.id);
    const me        = req.user.id;
    const reason    = req.body.reason?.trim() || "inappropriate";

    const exists = await db.query("SELECT 1 FROM post_comments WHERE id = $1", [commentId]);
    if (!exists.rows.length) return res.status(404).json({ error: "Comment not found" });

    await db.query(`
      INSERT INTO post_reports (comment_id, reporter_id, reason)
      VALUES ($1, $2, $3)
      ON CONFLICT (comment_id, reporter_id) DO NOTHING
    `, [commentId, me, reason]);

    res.json({ reported: true });
  } catch (err) { next(err); }
};

/* ─── GET /api/posts/reported  (super_admin only) ────────────────── */
exports.getReported = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT
        r.id            AS report_id,
        r.reason,
        r.status,
        r.created_at    AS reported_at,
        r.reviewed_at,
        -- reporter
        rv.name         AS reporter_name,
        rv.role         AS reporter_role,
        -- post fields (nullable when it's a comment report)
        r.post_id,
        p.content       AS post_content,
        pa.name         AS post_author_name,
        pa.role         AS post_author_role,
        p.created_at    AS post_created_at,
        -- comment fields (nullable when it's a post report)
        r.comment_id,
        c.content       AS comment_content,
        ca.name         AS comment_author_name,
        ca.role         AS comment_author_role,
        c.created_at    AS comment_created_at,
        c.post_id       AS comment_post_id
      FROM post_reports r
      JOIN volunteers rv ON rv.id = r.reporter_id
      LEFT JOIN posts        p  ON p.id  = r.post_id
      LEFT JOIN volunteers  pa  ON pa.id = p.author_id
      LEFT JOIN post_comments c  ON c.id  = r.comment_id
      LEFT JOIN volunteers   ca  ON ca.id = c.author_id
      ORDER BY r.created_at DESC
    `);
    res.json(rows);
  } catch (err) { next(err); }
};

/* ─── PATCH /api/posts/reports/:id  (super_admin: dismiss | reviewed) */
exports.updateReport = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["reviewed", "dismissed"].includes(status)) {
      return res.status(400).json({ error: "status must be 'reviewed' or 'dismissed'" });
    }
    const { rows } = await db.query(`
      UPDATE post_reports
      SET status = $1, reviewed_at = NOW(), reviewed_by = $2
      WHERE id = $3
      RETURNING id, status
    `, [status, req.user.id, req.params.id]);

    if (!rows.length) return res.status(404).json({ error: "Report not found" });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

/* ─── POST /api/campaign/events/:id/rsvp  (toggle going/interested) */
exports.toggleRsvp = async (req, res, next) => {
  try {
    const eventId = parseInt(req.params.id);
    const me      = req.user.id;
    const status  = req.body.status === "going" ? "going" : "interested";

    const existing = await db.query(
      "SELECT status FROM campaign_event_rsvp WHERE event_id = $1 AND volunteer_id = $2",
      [eventId, me]
    );

    if (existing.rows.length) {
      if (existing.rows[0].status === status) {
        // Same status — remove (un-rsvp)
        await db.query(
          "DELETE FROM campaign_event_rsvp WHERE event_id = $1 AND volunteer_id = $2",
          [eventId, me]
        );
        res.json({ rsvp: null });
      } else {
        // Different status — update
        await db.query(
          "UPDATE campaign_event_rsvp SET status = $1 WHERE event_id = $2 AND volunteer_id = $3",
          [status, eventId, me]
        );
        res.json({ rsvp: status });
      }
    } else {
      await db.query(
        "INSERT INTO campaign_event_rsvp (event_id, volunteer_id, status) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
        [eventId, me, status]
      );
      res.json({ rsvp: status });
    }
  } catch (err) { next(err); }
};
