/**
 * Seed demo users for all web roles.
 * Run from project root: node database/seed_demo_users.js
 */
require("dotenv").config({ path: "./backend/.env" });

const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const pool = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || "ncp_campaign",
  user:     process.env.DB_USER     || "postgres",
  password: process.env.DB_PASSWORD || "",
});

const DEMO_USERS = [
  { name: "Admin NCP-SP",      mobile: "8888888888", role: "super_admin"     },
  { name: "State Leader Demo", mobile: "9999999999", role: "state_leader"    },
  { name: "District Leader",   mobile: "7777777777", role: "district_leader" },
  { name: "Observer Demo",     mobile: "6666666666", role: "observer"        },
];

async function seed() {
  const hash = await bcrypt.hash("Demo@123", 12);
  console.log("Seeding demo users...\n");

  for (const u of DEMO_USERS) {
    await pool.query(
      `INSERT INTO volunteers (name, mobile, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (mobile)
       DO UPDATE SET
         name          = EXCLUDED.name,
         password_hash = EXCLUDED.password_hash,
         role          = EXCLUDED.role,
         is_active     = true`,
      [u.name, u.mobile, hash, u.role]
    );
    console.log(`  ✓  ${u.mobile}  →  ${u.role}  (${u.name})`);
  }

  console.log("\nDone! Password for all demo accounts: Demo@123");
  await pool.end();
}

seed().catch(err => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
