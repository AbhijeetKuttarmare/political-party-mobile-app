/**
 * migrate.js — run from the backend/ directory:
 *   node migrate.js
 */
require("dotenv").config();
const { Pool } = require("pg");
const fs       = require("fs");
const path     = require("path");

const pool = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  port:     parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME     || "ncp_campaign",
  user:     process.env.DB_USER     || "postgres",
  password: process.env.DB_PASSWORD,
});

const SQL_FILES = [
  path.join(__dirname, "../database/campaign_event_likes.sql"),
  path.join(__dirname, "../database/campaign_event_interactions.sql"),
  path.join(__dirname, "../database/seed_maharashtra_districts.sql"),
  path.join(__dirname, "../database/seed_maharashtra_elections.sql"),
];

(async () => {
  const client = await pool.connect();
  try {
    for (const file of SQL_FILES) {
      if (!fs.existsSync(file)) { console.log(`⚠️  Skipping (not found): ${file}`); continue; }
      const sql = fs.readFileSync(file, "utf8");
      console.log(`▶  Running: ${path.basename(file)}`);
      await client.query(sql);
      console.log(`✅  Done: ${path.basename(file)}`);
    }
    console.log("\n✅  All migrations complete.");
  } catch (err) {
    console.error("\n❌  Migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
