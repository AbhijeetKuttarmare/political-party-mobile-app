const db     = require("../config/database");
const logger = require("../middleware/logger");
const multer = require("multer");
const path   = require("path");
const fs     = require("fs");

/* ── File upload (multer) ─────────────────────────────────────── */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../../../uploads/chat");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar/;
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    cb(null, allowed.test(ext));
  },
});

/* POST /api/messages/upload */
exports.uploadMedia = [
  upload.single("file"),
  (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const media_type = req.file.mimetype.startsWith("image/") ? "image" : "document";
      const url        = `/uploads/chat/${req.file.filename}`;
      res.json({ url, media_type, original_name: req.file.originalname });
    } catch (err) { next(err); }
  },
];

/* GET /api/messages/conversations */
exports.getConversations = async (req, res, next) => {
  try {
    const me = req.user.id;
    const { rows } = await db.query(`
      WITH last_msgs AS (
        SELECT DISTINCT ON (
          LEAST(from_user_id, to_user_id),
          GREATEST(from_user_id, to_user_id)
        )
          CASE WHEN from_user_id = $1 THEN to_user_id ELSE from_user_id END AS partner_id,
          COALESCE(content, media_name, 'Attachment') AS last_message,
          created_at  AS last_message_at,
          from_user_id AS last_sender_id
        FROM messages
        WHERE from_user_id = $1 OR to_user_id = $1
        ORDER BY
          LEAST(from_user_id, to_user_id),
          GREATEST(from_user_id, to_user_id),
          created_at DESC
      ),
      unread AS (
        SELECT from_user_id AS partner_id, COUNT(*)::INT AS unread_count
        FROM messages
        WHERE to_user_id = $1 AND is_read = false
        GROUP BY from_user_id
      )
      SELECT
        lm.partner_id,
        v.name  AS partner_name,
        v.role  AS partner_role,
        lm.last_message,
        lm.last_message_at,
        lm.last_sender_id,
        COALESCE(u.unread_count, 0) AS unread_count
      FROM last_msgs lm
      JOIN volunteers v ON v.id = lm.partner_id
      LEFT JOIN unread u ON u.partner_id = lm.partner_id
      ORDER BY lm.last_message_at DESC
    `, [me]);
    res.json(rows);
  } catch (err) { next(err); }
};

/* GET /api/messages/:userId */
exports.getMessages = async (req, res, next) => {
  try {
    const me     = req.user.id;
    const other  = parseInt(req.params.userId);
    const limit  = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    const { rows } = await db.query(`
      SELECT
        m.id, m.from_user_id, m.to_user_id, m.content,
        m.media_url, m.media_type, m.media_name, m.is_read, m.created_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT('emoji', mr.emoji, 'user_id', mr.user_id)
          ) FILTER (WHERE mr.id IS NOT NULL),
          '[]'::json
        ) AS reactions
      FROM messages m
      LEFT JOIN message_reactions mr ON mr.message_id = m.id
      WHERE (m.from_user_id = $1 AND m.to_user_id = $2)
         OR (m.from_user_id = $2 AND m.to_user_id = $1)
      GROUP BY m.id
      ORDER BY m.created_at ASC
      LIMIT $3 OFFSET $4
    `, [me, other, limit, offset]);

    res.json(rows);
  } catch (err) { next(err); }
};

/* POST /api/messages/:userId */
exports.sendMessage = async (req, res, next) => {
  try {
    const me    = req.user.id;
    const other = parseInt(req.params.userId);
    const { content, media_url, media_type, media_name } = req.body;

    const hasContent = content?.trim();
    const hasMedia   = media_url?.trim();
    if (!hasContent && !hasMedia) {
      return res.status(400).json({ error: "content or media_url is required" });
    }
    if (me === other) return res.status(400).json({ error: "Cannot message yourself" });

    const target = await db.query("SELECT id FROM volunteers WHERE id = $1", [other]);
    if (!target.rows.length) return res.status(404).json({ error: "User not found" });

    const { rows } = await db.query(`
      INSERT INTO messages (from_user_id, to_user_id, content, media_url, media_type, media_name)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, from_user_id, to_user_id, content,
                media_url, media_type, media_name, is_read, created_at
    `, [me, other, hasContent || null, hasMedia || null, media_type || null, media_name || null]);

    logger.info(`[MSG] ${req.user.name} → volunteer ${other}`);
    res.status(201).json({ ...rows[0], reactions: [] });
  } catch (err) { next(err); }
};

/* PATCH /api/messages/:userId/read */
exports.markRead = async (req, res, next) => {
  try {
    const me    = req.user.id;
    const other = parseInt(req.params.userId);
    await db.query(`
      UPDATE messages SET is_read = true
      WHERE to_user_id = $1 AND from_user_id = $2 AND is_read = false
    `, [me, other]);
    res.json({ ok: true });
  } catch (err) { next(err); }
};

/* POST /api/messages/:msgId/reactions — toggle a reaction */
exports.toggleReaction = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const msgId  = parseInt(req.params.msgId);
    const { emoji } = req.body;

    if (!emoji) return res.status(400).json({ error: "emoji is required" });

    // Verify user is part of this conversation
    const msg = await db.query(
      "SELECT id FROM messages WHERE id = $1 AND (from_user_id = $2 OR to_user_id = $2)",
      [msgId, userId]
    );
    if (!msg.rows.length) return res.status(404).json({ error: "Message not found" });

    const existing = await db.query(
      "SELECT id FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3",
      [msgId, userId, emoji]
    );

    if (existing.rows.length) {
      await db.query(
        "DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3",
        [msgId, userId, emoji]
      );
      res.json({ action: "removed", emoji });
    } else {
      await db.query(
        "INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
        [msgId, userId, emoji]
      );
      res.json({ action: "added", emoji });
    }
  } catch (err) { next(err); }
};
