const db     = require("../config/database");

exports.getAll = async (req, res, next) => {
  try {
    const result = await db.query(
      "SELECT * FROM elections WHERE is_active = true ORDER BY id"
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};
