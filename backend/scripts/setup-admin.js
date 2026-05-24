/*
 * scripts/setup-admin.js
 * Creates or resets the admin volunteer in the database.
 * Run: node scripts/setup-admin.js
 */

require("dotenv").config({ path: "../.env" });
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const db = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  port:     parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME     || "ncp_campaign",
  user:     process.env.DB_USER     || "postgres",
  password: process.env.DB_PASSWORD || "postgres123",
});

const USERS = [
  { name: "Admin NCP-SP",    mobile: "9999999999", password: "Demo@123", role: "state_leader"    },
  { name: "Rajesh Wankhede", mobile: "9876543210", password: "Demo@123", role: "district_leader" },
  { name: "Kavita Desai",    mobile: "9876543211", password: "Demo@123", role: "taluka_leader"   },
  { name: "Suresh Pawar",    mobile: "9876543212", password: "Demo@123", role: "booth_worker"    },
];

async function run() {
  console.log("\n🔧 NCP Campaign — Admin Setup\n");

  // Ensure password_hash column exists
  await db.query(`
    ALTER TABLE volunteers
    ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)
  `);
  console.log("✅ password_hash column ready\n");

  for (const u of USERS) {
    const hash = await bcrypt.hash(u.password, 12);

    await db.query(`
      INSERT INTO volunteers (name, mobile, password_hash, role, is_active)
      VALUES ($1, $2, $3, $4, true)
      ON CONFLICT (mobile) DO UPDATE
        SET name          = EXCLUDED.name,
            password_hash = EXCLUDED.password_hash,
            role          = EXCLUDED.role,
            is_active     = true
    `, [u.name, u.mobile, hash, u.role]);

    console.log(`  ✓  ${u.name.padEnd(20)} | ${u.mobile} | ${u.role}`);
  }

  console.log("\n─────────────────────────────────────────────");
  console.log("  All test users created. Password: Demo@123");
  console.log("─────────────────────────────────────────────");
  console.log("  Test in the app:");
  USERS.forEach(u => {
    console.log(`   📱 ${u.mobile}  →  ${u.role}`);
  });
  console.log("─────────────────────────────────────────────\n");

  await db.end();
}

run().catch(err => {
  console.error("❌ Setup failed:", err.message);
  process.exit(1);
});
