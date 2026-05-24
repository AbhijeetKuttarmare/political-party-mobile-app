/*
 * middleware/validate.js — Request validation
 *
 * Usage in routes:
 *   const { body, query } = require("express-validator");
 *   router.post("/surveys", [
 *     body("booth_id").isInt(),
 *     body("response").isIn(["ncp","undecided","opposition"]),
 *     validate,
 *     controller
 *   ]);
 */

const { validationResult } = require("express-validator");
const logger = require("./logger");

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map(e => ({
      field:   e.path,
      message: e.msg,
      value:   e.value,
    }));

    logger.warn(`[VALIDATION] ${req.method} ${req.path} — ${details.map(d => d.field + ": " + d.message).join(", ")}`);

    return res.status(422).json({
      error:   "Validation failed",
      details,
    });
  }
  next();
}

module.exports = validate;
