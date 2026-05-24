const db     = require("../config/database");
const logger = require("../middleware/logger");

const COLORS = [
  "from-blue-600 to-purple-600",   "from-emerald-500 to-teal-600",
  "from-orange-500 to-red-500",    "from-pink-500 to-rose-500",
  "from-violet-600 to-indigo-600", "from-amber-500 to-orange-500",
  "from-cyan-600 to-blue-500",     "from-rose-500 to-pink-600",
];

/* POST /api/groups */
exports.createGroup = async (req, res, next) => {
  try {
    const me = req.user.id;
    const { name, description, member_ids = [] } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Group name is required" });

    const avatar_color = COLORS[Math.floor(Math.random() * COLORS.length)];

    const { rows: [group] } = await db.query(`
      INSERT INTO chat_groups (name, description, created_by, avatar_color)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [name.trim(), description?.trim() || null, me, avatar_color]);

    // Creator is admin
    await db.query(
      "INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'admin')",
      [group.id, me]
    );

    // Add other members (deduplicated, exclude creator)
    const others = [...new Set(member_ids.map(Number))].filter(id => id && id !== me);
    for (const uid of others) {
      await db.query(
        "INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [group.id, uid]
      );
    }

    logger.info(`[GROUP] "${group.name}" created by ${req.user.name} (${others.length + 1} members)`);
    res.status(201).json({ ...group, member_count: others.length + 1 });
  } catch (err) { next(err); }
};

/* GET /api/groups */
exports.getMyGroups = async (req, res, next) => {
  try {
    const me = req.user.id;
    const { rows } = await db.query(`
      SELECT
        g.id, g.name, g.description, g.avatar_color, g.created_by,
        (SELECT COUNT(*)::INT FROM group_members WHERE group_id = g.id) AS member_count,
        lm.content       AS last_message,
        lm.media_name    AS last_media_name,
        lm.created_at    AS last_message_at,
        lm.from_user_id  AS last_sender_id,
        v.name           AS last_sender_name,
        COALESCE((
          SELECT COUNT(*)::INT FROM group_messages gm2
          WHERE gm2.group_id = g.id
            AND gm2.from_user_id != $1
            AND gm2.created_at > COALESCE(
              (SELECT last_read_at FROM group_reads WHERE group_id = g.id AND user_id = $1),
              '1970-01-01'::timestamptz
            )
        ), 0) AS unread_count
      FROM chat_groups g
      JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $1
      LEFT JOIN LATERAL (
        SELECT content, media_name, created_at, from_user_id
        FROM group_messages WHERE group_id = g.id
        ORDER BY created_at DESC LIMIT 1
      ) lm ON true
      LEFT JOIN volunteers v ON v.id = lm.from_user_id
      ORDER BY COALESCE(lm.created_at, g.created_at) DESC
    `, [me]);

    res.json(rows.map(r => ({
      ...r,
      last_message: r.last_message ?? (r.last_media_name ? `📎 ${r.last_media_name}` : "No messages yet"),
    })));
  } catch (err) { next(err); }
};

/* GET /api/groups/:id */
exports.getGroupInfo = async (req, res, next) => {
  try {
    const me      = req.user.id;
    const groupId = parseInt(req.params.id);

    const { rows: [group] } = await db.query("SELECT * FROM chat_groups WHERE id = $1", [groupId]);
    if (!group) return res.status(404).json({ error: "Group not found" });

    const mem = await db.query(
      "SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2", [groupId, me]
    );
    if (!mem.rows.length) return res.status(403).json({ error: "Not a member" });

    const { rows: members } = await db.query(`
      SELECT gm.user_id, gm.role, gm.joined_at, v.name, v.role AS vol_role
      FROM group_members gm
      JOIN volunteers v ON v.id = gm.user_id
      WHERE gm.group_id = $1
      ORDER BY CASE gm.role WHEN 'admin' THEN 0 ELSE 1 END, v.name
    `, [groupId]);

    res.json({ ...group, members, member_count: members.length });
  } catch (err) { next(err); }
};

/* GET /api/groups/:id/messages */
exports.getGroupMessages = async (req, res, next) => {
  try {
    const me      = req.user.id;
    const groupId = parseInt(req.params.id);
    const limit   = Math.min(parseInt(req.query.limit) || 60, 100);
    const offset  = parseInt(req.query.offset) || 0;

    const mem = await db.query(
      "SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2", [groupId, me]
    );
    if (!mem.rows.length) return res.status(403).json({ error: "Not a member" });

    const { rows } = await db.query(`
      SELECT
        gm.id, gm.group_id, gm.from_user_id, gm.content,
        gm.media_url, gm.media_type, gm.media_name, gm.created_at,
        v.name AS sender_name, v.role AS sender_role,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT('emoji', mr.emoji, 'user_id', mr.user_id)
          ) FILTER (WHERE mr.id IS NOT NULL),
          '[]'::json
        ) AS reactions
      FROM group_messages gm
      JOIN volunteers v ON v.id = gm.from_user_id
      LEFT JOIN group_message_reactions mr ON mr.message_id = gm.id
      WHERE gm.group_id = $1
      GROUP BY gm.id, v.name, v.role
      ORDER BY gm.created_at ASC
      LIMIT $2 OFFSET $3
    `, [groupId, limit, offset]);

    res.json(rows);
  } catch (err) { next(err); }
};

/* POST /api/groups/:id/messages */
exports.sendGroupMessage = async (req, res, next) => {
  try {
    const me      = req.user.id;
    const groupId = parseInt(req.params.id);
    const { content, media_url, media_type, media_name } = req.body;

    const hasContent = content?.trim();
    const hasMedia   = media_url?.trim();
    if (!hasContent && !hasMedia) return res.status(400).json({ error: "content or media_url required" });

    const mem = await db.query(
      "SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2", [groupId, me]
    );
    if (!mem.rows.length) return res.status(403).json({ error: "Not a member" });

    const { rows: [msg] } = await db.query(`
      INSERT INTO group_messages (group_id, from_user_id, content, media_url, media_type, media_name)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, group_id, from_user_id, content, media_url, media_type, media_name, created_at
    `, [groupId, me, hasContent || null, hasMedia || null, media_type || null, media_name || null]);

    await db.query(`
      INSERT INTO group_reads (group_id, user_id, last_read_at) VALUES ($1, $2, NOW())
      ON CONFLICT (group_id, user_id) DO UPDATE SET last_read_at = NOW()
    `, [groupId, me]);

    res.status(201).json({ ...msg, sender_name: req.user.name, sender_role: req.user.role, reactions: [] });
  } catch (err) { next(err); }
};

/* PATCH /api/groups/:id/read */
exports.markGroupRead = async (req, res, next) => {
  try {
    const me = req.user.id; const groupId = parseInt(req.params.id);
    await db.query(`
      INSERT INTO group_reads (group_id, user_id, last_read_at) VALUES ($1, $2, NOW())
      ON CONFLICT (group_id, user_id) DO UPDATE SET last_read_at = NOW()
    `, [groupId, me]);
    res.json({ ok: true });
  } catch (err) { next(err); }
};

/* POST /api/groups/:id/members */
exports.addMember = async (req, res, next) => {
  try {
    const me      = req.user.id;
    const groupId = parseInt(req.params.id);
    const { user_id } = req.body;
    const isAdmin = await db.query(
      "SELECT id FROM group_members WHERE group_id=$1 AND user_id=$2 AND role='admin'", [groupId, me]
    );
    if (!isAdmin.rows.length) return res.status(403).json({ error: "Admins only" });
    await db.query(
      "INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [groupId, user_id]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
};

/* DELETE /api/groups/:id/leave */
exports.leaveGroup = async (req, res, next) => {
  try {
    const me = req.user.id; const groupId = parseInt(req.params.id);
    await db.query("DELETE FROM group_members WHERE group_id=$1 AND user_id=$2", [groupId, me]);
    res.json({ ok: true });
  } catch (err) { next(err); }
};

/* POST /api/groups/:id/messages/:msgId/reactions */
exports.toggleGroupReaction = async (req, res, next) => {
  try {
    const userId  = req.user.id;
    const groupId = parseInt(req.params.id);
    const msgId   = parseInt(req.params.msgId);
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ error: "emoji required" });

    const mem = await db.query(
      "SELECT id FROM group_members WHERE group_id=$1 AND user_id=$2", [groupId, userId]
    );
    if (!mem.rows.length) return res.status(403).json({ error: "Not a member" });

    const ex = await db.query(
      "SELECT id FROM group_message_reactions WHERE message_id=$1 AND user_id=$2 AND emoji=$3",
      [msgId, userId, emoji]
    );
    if (ex.rows.length) {
      await db.query(
        "DELETE FROM group_message_reactions WHERE message_id=$1 AND user_id=$2 AND emoji=$3",
        [msgId, userId, emoji]
      );
      res.json({ action: "removed", emoji });
    } else {
      await db.query(
        "INSERT INTO group_message_reactions (message_id, user_id, emoji) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
        [msgId, userId, emoji]
      );
      res.json({ action: "added", emoji });
    }
  } catch (err) { next(err); }
};
