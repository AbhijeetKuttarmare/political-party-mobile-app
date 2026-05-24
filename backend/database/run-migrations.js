#!/usr/bin/env node
/**
 * backend/database/run-migrations.js
 * 
 * Runs all pending migrations from the migrations/ directory
 * Usage: node database/run-migrations.js
 * 
 * Migrations are run in alphabetical order. Use numbered prefixes (001-, 002-, etc.)
 * to control execution order.
 */

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

// Load environment variables
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const pool = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  port:     parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME     || "ncp_campaign",
  user:     process.env.DB_USER     || "postgres",
  password: process.env.DB_PASSWORD,
});

const MIGRATIONS_DIR = path.join(__dirname, "migrations");
const MIGRATIONS_TABLE = "schema_migrations";

async function ensureMigrationsTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await pool.query(query);
}

async function getMigratedFiles() {
  const result = await pool.query(
    `SELECT filename FROM ${MIGRATIONS_TABLE} ORDER BY filename`
  );
  return result.rows.map((r) => r.filename);
}

async function recordMigration(filename) {
  await pool.query(
    `INSERT INTO ${MIGRATIONS_TABLE} (filename) VALUES ($1) ON CONFLICT DO NOTHING`,
    [filename]
  );
}

async function runMigrations() {
  try {
    console.log("📋 Starting database migrations...\n");

    // Create migrations table if it doesn't exist
    await ensureMigrationsTable();
    console.log("✅ Migrations table ready\n");

    // Get list of already-run migrations
    const migrated = await getMigratedFiles();
    console.log(`📜 Previously run: ${migrated.length} migration(s)\n`);

    // Read all migration files from the migrations directory
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      console.log("ℹ️  No migration files found in", MIGRATIONS_DIR);
      await pool.end();
      return;
    }

    console.log(`📁 Found ${files.length} migration file(s):\n`);

    let executedCount = 0;

    for (const file of files) {
      if (migrated.includes(file)) {
        console.log(`⏭️  SKIP: ${file} (already applied)`);
        continue;
      }

      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, "utf-8");

      try {
        console.log(`⚙️  RUNNING: ${file}...`);
        await pool.query(sql);
        await recordMigration(file);
        console.log(`✅ SUCCESS: ${file}\n`);
        executedCount++;
      } catch (err) {
        console.error(`❌ FAILED: ${file}`);
        console.error(`   Error: ${err.message}\n`);
        throw err;
      }
    }

    console.log(`\n🎉 Migration complete!`);
    console.log(`   Executed: ${executedCount} new migration(s)`);
    console.log(`   Total: ${migrated.length + executedCount} migration(s)`);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
