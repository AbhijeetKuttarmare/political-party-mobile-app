/*
 * routes/index.js — Master route aggregator
 * All routes are prefixed with /api (set in app.js)
 */

const router = require("express").Router();

const authRoutes       = require("./auth.routes");
const electionRoutes   = require("./elections.routes");
const areaRoutes       = require("./areas.routes");
const boothRoutes      = require("./booths.routes");
const voterRoutes      = require("./voters.routes");
const surveyRoutes     = require("./surveys.routes");
const volunteerRoutes  = require("./volunteers.routes");
const analyticsRoutes  = require("./analytics.routes");
const hierarchyRoutes  = require("./hierarchy.routes");
const leadersRoutes    = require("./leaders.routes");
const campaignRoutes   = require("./campaign.routes");
const postsRoutes      = require("./posts.routes");
const friendsRoutes    = require("./friends.routes");
const messagesRoutes   = require("./messages.routes");
const groupsRoutes     = require("./groups.routes");

/* ── Health check (no auth required) ─────────────────────────── */
const db = require("../config/database");
router.get("/health", async (req, res) => {
  try {
    const result = await db.query("SELECT NOW() AS time, current_database() AS db");
    res.json({
      status:      "ok",
      database:    result.rows[0].db,
      server_time: result.rows[0].time,
      environment: process.env.NODE_ENV,
    });
  } catch (err) {
    res.status(503).json({ status: "error", message: err.message });
  }
});

/* ── Mount all route groups ───────────────────────────────────── */
router.use("/auth",        authRoutes);
router.use("/elections",   electionRoutes);
router.use("/areas",       areaRoutes);
router.use("/booths",      boothRoutes);
router.use("/voters",      voterRoutes);
router.use("/surveys",     surveyRoutes);
router.use("/volunteers",  volunteerRoutes);
router.use("/analytics",   analyticsRoutes);
router.use("/hierarchy",   hierarchyRoutes);
router.use("/leaders",     leadersRoutes);
router.use("/campaign",    campaignRoutes);
router.use("/posts",       postsRoutes);
router.use("/friends",     friendsRoutes);
router.use("/messages",    messagesRoutes);
router.use("/groups",      groupsRoutes);

module.exports = router;
