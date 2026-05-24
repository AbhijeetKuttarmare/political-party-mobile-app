/*
 * middleware/logger.js — Central logger
 *
 * Levels (set LOG_LEVEL in .env):
 *   error → only errors
 *   warn  → errors + warnings
 *   info  → errors + warnings + info (default for production)
 *   http  → + HTTP requests
 *   debug → everything including SQL queries (use in development)
 *
 * Output: colour-coded console + append to logs/app.log
 */

const fs   = require("fs");
const path = require("path");

const LEVELS = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };
const COLORS = {
  error: "\x1b[31m",  // red
  warn:  "\x1b[33m",  // yellow
  info:  "\x1b[36m",  // cyan
  http:  "\x1b[35m",  // magenta
  debug: "\x1b[90m",  // grey
  reset: "\x1b[0m",
};

const currentLevel = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.debug;

// Ensure logs/ directory exists
const logsDir = path.join(__dirname, "../../logs");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
const logFile = fs.createWriteStream(path.join(logsDir, "app.log"), { flags: "a" });

function log(level, message) {
  if (LEVELS[level] > currentLevel) return;

  const timestamp = new Date().toISOString();
  const line      = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

  // Console — coloured
  console.log(`${COLORS[level]}${line}${COLORS.reset}`);

  // File — plain text (no ANSI codes)
  logFile.write(line + "\n");
}

const logger = {
  error: (msg) => log("error", msg),
  warn:  (msg) => log("warn",  msg),
  info:  (msg) => log("info",  msg),
  http:  (msg) => log("http",  msg),
  debug: (msg) => log("debug", msg),
};

module.exports = logger;
