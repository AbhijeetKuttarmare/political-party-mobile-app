/*
 * middleware/errorHandler.js — Global error handler
 *
 * Catches any error thrown with next(err) anywhere in the app.
 * In development: shows full stack trace.
 * In production:  hides internal details.
 *
 * DEBUG TIP: throw new Error("message") anywhere and it will
 * be caught here automatically — no try/catch needed in controllers.
 */

const logger = require("./logger");

function errorHandler(err, req, res, next) {
  // Log the full error with stack trace
  logger.error(`[ERROR] ${req.method} ${req.originalUrl}`);
  logger.error(`        ${err.message}`);
  if (process.env.NODE_ENV === "development") {
    logger.error(`        ${err.stack}`);
  }

  // PostgreSQL-specific error codes
  if (err.code) {
    switch (err.code) {
      case "23505": // unique_violation
        return res.status(409).json({
          error:   "Duplicate entry",
          detail:  err.detail,
          field:   err.constraint,
        });
      case "23503": // foreign_key_violation
        return res.status(400).json({
          error:  "Referenced record does not exist",
          detail: err.detail,
        });
      case "22P02": // invalid_text_representation (bad UUID/int)
        return res.status(400).json({
          error: "Invalid ID format in request",
        });
      case "ECONNREFUSED":
        return res.status(503).json({
          error: "Database connection refused — is PostgreSQL running?",
        });
    }
  }

  // Custom app errors (throw with a status property)
  const status  = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(status).json({
    error:   message,
    path:    req.originalUrl,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}

module.exports = errorHandler;
