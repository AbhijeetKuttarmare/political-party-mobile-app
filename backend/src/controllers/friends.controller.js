const db     = require("../config/database");
const logger = require("../middleware/logger");

/* GET /api/friends — list accepted friends for the logged-in user */
exports.getFriends = async (req, res, next) => {
  try {
    const me = req.user.id;
    const { rows } = await db.query(`
      SELECT
        fr.id AS friendship_id,
        fr.created_at AS friends_since,
        v.id   AS friend_id,
        v.name AS friend_name,
        v.role AS friend_role
      FROM friend_requests fr
      JOIN volunteers v ON v.id = CASE
        WHEN fr.from_user_id = $1 THEN fr.to_user_id
        ELSE fr.from_user_id
      END
      WHERE fr.status = 'accepted'
        AND (fr.from_user_id = $1 OR fr.to_user_id = $1)
      ORDER BY fr.updated_at DESC
    `, [me]);
    res.json(rows);
  } catch (err) { next(err); }
};

/* DELETE /api/friends/:friendshipId — unfriend */
exports.unfriend = async (req, res, next) => {
  try {
    const me = req.user.id;
    const { rows } = await db.query(`
      DELETE FROM friend_requests
      WHERE id = $1
        AND (from_user_id = $2 OR to_user_id = $2)
      RETURNING id
    `, [req.params.friendshipId, me]);

    if (!rows.length) return res.status(404).json({ error: "Friendship not found" });
    res.json({ unfriended: true });
  } catch (err) { next(err); }
};

/* GET /api/friends/count — count accepted friends for the logged-in user */
exports.getFriendsCount = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT COUNT(*)::INT AS count FROM friend_requests
      WHERE status = 'accepted'
        AND (from_user_id = $1 OR to_user_id = $1)
    `, [req.user.id]);
    res.json({ count: rows[0].count });
  } catch (err) { next(err); }
};

/* POST /api/friends/request — send a connection request */
exports.sendRequest = async (req, res, next) => {
  try {
    const fromId = req.user.id;
    const toId   = parseInt(req.body.to_user_id);

    if (!toId || isNaN(toId)) {
      return res.status(400).json({ error: "to_user_id is required" });
    }
    if (fromId === toId) {
      return res.status(400).json({ error: "Cannot send a request to yourself" });
    }

    // Check the target user exists
    const target = await db.query("SELECT id FROM volunteers WHERE id = $1", [toId]);
    if (!target.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    await db.query(`
      INSERT INTO friend_requests (from_user_id, to_user_id)
      VALUES ($1, $2)
      ON CONFLICT (from_user_id, to_user_id) DO NOTHING
    `, [fromId, toId]);

    logger.info(`[FRIENDS] ${req.user.name} → ${toId}`);
    res.status(201).json({ requested: true });
  } catch (err) { next(err); }
};

/* GET /api/friends/requests — incoming pending requests (for the logged-in user) */
exports.getRequests = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT fr.id, fr.created_at, v.id AS from_id, v.name AS from_name, v.role AS from_role
      FROM friend_requests fr
      JOIN volunteers v ON v.id = fr.from_user_id
      WHERE fr.to_user_id = $1 AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) { next(err); }
};

/* PATCH /api/friends/requests/:id — accept or decline */
exports.updateRequest = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["accepted", "declined"].includes(status)) {
      return res.status(400).json({ error: "status must be 'accepted' or 'declined'" });
    }

    const { rows } = await db.query(`
      UPDATE friend_requests
      SET status = $1, updated_at = NOW()
      WHERE id = $2 AND to_user_id = $3
      RETURNING id, status
    `, [status, req.params.id, req.user.id]);

    if (!rows.length) return res.status(404).json({ error: "Request not found" });
    res.json(rows[0]);
  } catch (err) { next(err); }
};
