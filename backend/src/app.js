/*
 * app.js — Express application setup
 * All middleware and routes are wired here.
 */

const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const morgan     = require("morgan");
const rateLimit  = require("express-rate-limit");
const path       = require("path");
const fs         = require("fs");

const routes       = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const logger       = require("./middleware/logger");

const app = express();

/* ─── Security Headers ──────────────────────────────────────── */
app.use(helmet());

/* ─── CORS ──────────────────────────────────────────────────── */
app.use(cors({
  origin:      process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true,
  methods:     ["GET", "POST", "PUT", "PATCH", "DELETE"],
}));

/* ─── Body Parser ───────────────────────────────────────────── */
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true }));

/* ─── Static uploads (voter list PDFs) ─────────────────────── */
const uploadsDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

/* ─── HTTP Request Logger (morgan → our logger) ─────────────── */
app.use(morgan(
  ":method :url :status :res[content-length]B — :response-time ms",
  { stream: { write: (msg) => logger.http(msg.trim()) } }
));

/* ─── Global Rate Limiter ───────────────────────────────────── */
app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max:      500,              // 500 requests per window
  message:  { error: "Too many requests. Please wait 15 minutes." },
  skip: () => process.env.NODE_ENV === "development",
}));

/* ─── Strict rate limit for auth routes ────────────────────── */
app.use("/api/auth", rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  message:  { error: "Too many login attempts. Try again in 15 minutes." },
  skip: () => process.env.NODE_ENV === "development",
}));

/* ─── Routes ────────────────────────────────────────────────── */
app.use("/api", routes);

/* ─── 404 Handler ───────────────────────────────────────────── */
app.use((req, res) => {
  res.status(404).json({
    error:   "Route not found",
    path:    req.originalUrl,
    method:  req.method,
    tip:     "Check /api/health to verify the server is running",
  });
});

/* ─── Global Error Handler (must be last) ───────────────────── */
app.use(errorHandler);

module.exports = app;
