/*
 * server.js — Entry point
 * Run:        npm run dev
 * Debug:      npm run debug   (then attach VS Code debugger on port 9229)
 */

require("dotenv").config();
const app = require("./src/app");
const db  = require("./src/config/database");
const { runMigrations } = require("./database/run-migrations");

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // 1. Test DB connection before accepting traffic
    await db.query("SELECT NOW() AS time");
    console.log("✅  PostgreSQL connected — ncp_campaign");

    // 2. Run pending database migrations
    console.log("🔄  Running database migrations...");
    await runMigrations();
    console.log("✅  Migrations complete\n");

    // 3. Start HTTP server
    app.listen(PORT, () => {
      console.log("─────────────────────────────────────────────");
      console.log(`🚀  NCP Campaign API  →  http://localhost:${PORT}`);
      console.log(`📋  Environment       →  ${process.env.NODE_ENV}`);
      console.log(`🔍  Debug port        →  9229 (npm run debug)`);
      console.log("─────────────────────────────────────────────");
      console.log("   Endpoints:");
      console.log(`   POST /api/auth/login`);
      console.log(`   GET  /api/elections`);
      console.log(`   GET  /api/areas?election=zp`);
      console.log(`   GET  /api/booths?area=wardha-zp`);
      console.log(`   GET  /api/voters/search?q=Rajesh&booth=1`);
      console.log(`   POST /api/surveys`);
      console.log(`   POST /api/checkins`);
      console.log(`   GET  /api/summary?election=zp`);
      console.log("─────────────────────────────────────────────\n");
    });
  } catch (err) {
    console.error("❌  Failed to start server:", err.message);
    console.error("   Check your .env DB credentials and make sure PostgreSQL is running.");
    process.exit(1);
  }
}

startServer();
