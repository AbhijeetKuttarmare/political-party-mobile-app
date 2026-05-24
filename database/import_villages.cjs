/**
 * import_villages.js — Import Maharashtra geo hierarchy into PostgreSQL
 *
 * Reads:
 *   - database/Villages/Villagepart1.xls
 *   - database/Villages/Villagepart2.xls
 *   - src/app/data/maharashtraData.ts  (for population + leader assignments)
 *
 * Run from project root:
 *   node database/import_villages.js
 */

const path  = require("path");
const fs    = require("fs");
const XLSX  = require("xlsx");
const { Pool } = require(path.join(__dirname, "../backend/node_modules/pg"));

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const pool = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  port:     parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME     || "ncp_campaign",
  user:     process.env.DB_USER     || "postgres",
  password: process.env.DB_PASSWORD || "postgres123",
});

/* ─── Read both XLS files ────────────────────────────────── */
function readXls(filePath) {
  const wb   = XLSX.readFile(filePath);
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  rows.shift(); // remove header row
  return rows;
}

/* ─── Extract leaders + population from maharashtraData.ts ── */
function extractFromTs() {
  const tsPath = path.join(__dirname, "../src/app/data/maharashtraData.ts");
  const text   = fs.readFileSync(tsPath, "utf8");

  // Match: {id:123456,name:"...",type:"...",population:1234,leaders:[...]}
  const areaRe  = /\{id:(\d+),name:"([^"]+)",type:"(rural|urban)",population:(\d+),leaders:\[([^\]]*)\]/g;
  const leadRe  = /\{name:"([^"]+)",designation:"([^"]+)"\}/g;

  const villages = {};  // code → { population, type, leaders[] }
  let m;
  while ((m = areaRe.exec(text)) !== null) {
    const [, code, , type, population, leadersStr] = m;
    const leaders = [];
    let lm;
    while ((lm = leadRe.exec(leadersStr)) !== null) {
      leaders.push({ name: lm[1], designation: lm[2] });
    }
    leadRe.lastIndex = 0;
    villages[parseInt(code)] = { type, population: parseInt(population), leaders };
  }
  return villages;
}

/* ─── Batch insert helper ────────────────────────────────── */
async function batchInsert(client, table, columns, rows, batchSize = 500) {
  if (rows.length === 0) return;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const placeholders = chunk.map((_, ri) =>
      `(${columns.map((_, ci) => `$${ri * columns.length + ci + 1}`).join(",")})`
    ).join(",");
    const values = chunk.flat();
    await client.query(
      `INSERT INTO ${table} (${columns.join(",")}) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
      values
    );
    inserted += chunk.length;
    process.stdout.write(`\r  ${table}: ${inserted}/${rows.length}`);
  }
  console.log();
}

/* ─── Main ───────────────────────────────────────────────── */
async function main() {
  console.log("Reading Excel files…");
  const rows1 = readXls(path.join(__dirname, "Villages/Villagepart1.xls"));
  const rows2 = readXls(path.join(__dirname, "Villages/Villagepart2.xls"));
  const allRows = [...rows1, ...rows2];
  console.log(`  Total rows: ${allRows.length}`);

  console.log("Extracting leaders from maharashtraData.ts…");
  const tsVillages = extractFromTs();
  const leaderCount = Object.values(tsVillages).reduce((s, v) => s + v.leaders.length, 0);
  console.log(`  ${Object.keys(tsVillages).length} villages with data, ${leaderCount} leaders`);

  // Deduplicate districts and talukas
  const districtMap = new Map(); // code → { code, name, name_marathi }
  const talukaMap   = new Map(); // code → { code, district_code, name, name_marathi }
  const villageRows = [];        // [code, taluka_code, district_code, name, name_marathi, type, population]

  for (const row of allRows) {
    const [dCode, dName, dMarathi, tCode, tName, tMarathi, vCode, vName, vMarathi] = row;
    if (!dCode || !tCode || !vCode) continue;

    if (!districtMap.has(dCode)) {
      districtMap.set(dCode, [dCode, String(dName || ""), String(dMarathi || ""), 0, 0]);
    }
    if (!talukaMap.has(tCode)) {
      talukaMap.set(tCode, [tCode, dCode, String(tName || ""), String(tMarathi || ""), 0]);
    }
    const ts  = tsVillages[vCode] || {};
    const typ = ts.type       || "rural";
    const pop = ts.population || 0;
    villageRows.push([vCode, tCode, dCode, String(vName || ""), String(vMarathi || ""), typ, pop]);
  }

  // Update district leader counts from TS data (districts that have leader-assigned villages)
  for (const [code, { leaders }] of Object.entries(tsVillages)) {
    if (leaders.length === 0) continue;
    const vRow = villageRows.find(r => r[0] === parseInt(code));
    if (!vRow) continue;
    const dCode = vRow[2];
    if (districtMap.has(dCode)) {
      districtMap.get(dCode)[4] += leaders.length;
    }
  }

  const districtRows = [...districtMap.values()];
  const talukaRows   = [...talukaMap.values()];

  console.log(`\nInserting ${districtRows.length} districts, ${talukaRows.length} talukas, ${villageRows.length} villages…`);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await batchInsert(client, "mh_districts",
      ["code","name","name_marathi","population","active_leaders"],
      districtRows);

    await batchInsert(client, "mh_talukas",
      ["code","district_code","name","name_marathi","total_villages"],
      talukaRows);

    await batchInsert(client, "mh_villages",
      ["code","taluka_code","district_code","name","name_marathi","type","population"],
      villageRows);

    // Update total_villages count per taluka
    await client.query(`
      UPDATE mh_talukas t SET total_villages = (
        SELECT COUNT(*) FROM mh_villages v WHERE v.taluka_code = t.code
      )
    `);

    // Insert leaders from TS data
    const leaderRows = [];
    for (const [codeStr, { leaders }] of Object.entries(tsVillages)) {
      const code = parseInt(codeStr);
      for (const l of leaders) {
        leaderRows.push([code, l.name, l.designation]);
      }
    }
    if (leaderRows.length > 0) {
      console.log(`Inserting ${leaderRows.length} leaders…`);
      await batchInsert(client, "mh_leaders",
        ["village_code","name","designation"],
        leaderRows);
    }

    await client.query("COMMIT");

    // Summary
    const [d, t, v, l] = await Promise.all([
      client.query("SELECT COUNT(*) FROM mh_districts"),
      client.query("SELECT COUNT(*) FROM mh_talukas"),
      client.query("SELECT COUNT(*) FROM mh_villages"),
      client.query("SELECT COUNT(*) FROM mh_leaders"),
    ]);
    console.log(`\nDone!`);
    console.log(`  Districts : ${d.rows[0].count}`);
    console.log(`  Talukas   : ${t.rows[0].count}`);
    console.log(`  Villages  : ${v.rows[0].count}`);
    console.log(`  Leaders   : ${l.rows[0].count}`);

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\nError:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
