/*
 * config/database.js — PostgreSQL connection pool
 *
 * DEBUG TIP: Set LOG_LEVEL=debug in .env to see every SQL query.
 * All queries go through db.query() so you can add logging here centrally.
 */

const { Pool } = require("pg");
const logger   = require("../middleware/logger");

const pool = new Pool({
  host:                    process.env.DB_HOST     || "localhost",
  port:                    parseInt(process.env.DB_PORT || "5432"),
  database:                process.env.DB_NAME     || "ncp_campaign",
  user:                    process.env.DB_USER     || "postgres",
  password:                process.env.DB_PASSWORD,
  max:                     parseInt(process.env.DB_POOL_MAX || "20"),
  idleTimeoutMillis:       30000,
  connectionTimeoutMillis: 5000,
});

/* ─── Log pool errors ───────────────────────────────────────── */
pool.on("error", (err) => {
  logger.error(`[DB POOL ERROR] ${err.message}`);
});

pool.on("connect", () => {
  logger.debug("[DB] New client connected to pool");
});

/* ─── Wrapped query() — logs SQL in debug mode ─────────────── */
const originalQuery = pool.query.bind(pool);

pool.query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await originalQuery(text, params);
    const ms = Date.now() - start;

    logger.debug(`[SQL] ${ms}ms | rows:${result.rowCount} | ${text.replace(/\s+/g, " ").trim().slice(0, 120)}`);

    if (ms > 1000) {
      logger.warn(`[SLOW QUERY] ${ms}ms — ${text.replace(/\s+/g, " ").trim().slice(0, 200)}`);
    }

    return result;
  } catch (err) {
    logger.error(`[SQL ERROR] ${err.message} | Query: ${text.replace(/\s+/g, " ").trim().slice(0, 200)}`);
    throw err;
  }
};

module.exports = pool;
