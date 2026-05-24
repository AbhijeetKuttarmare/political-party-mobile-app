const { Pool } = require("pg");
require("dotenv").config({ path: "../.env" });

const pool = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  port:     parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME     || "ncp_campaign",
  user:     process.env.DB_USER     || "postgres",
  password: process.env.DB_PASSWORD || "postgres123",
  max:      20,
  idleTimeoutMillis:    30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("PostgreSQL pool error:", err.message);
});

// Test connection on startup
pool.query("SELECT NOW()")
  .then(() => console.log("✅ PostgreSQL connected — ncp_campaign"))
  .catch(err => console.error("❌ PostgreSQL connection failed:", err.message));

module.exports = pool;
