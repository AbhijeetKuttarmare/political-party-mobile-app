const router   = require("express").Router();
const auth     = require("../middleware/auth");
const ctrl     = require("../controllers/booths.controller");
const path     = require("path");
const fs       = require("fs");

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../../../uploads/voter-lists");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// GET  /api/booths
router.get("/",              auth(),               ctrl.getBooths);

// GET  /api/booths/meta
router.get("/meta",          auth(),               ctrl.getBoothMeta);

// GET  /api/booths/districts
router.get("/districts",     auth(),               ctrl.getBoothDistricts);

// GET  /api/booths/talukas?district_id=X
router.get("/talukas",       auth(),               ctrl.getBoothTalukas);

// GET  /api/booths/villages?taluka_code=X
router.get("/villages",      auth(),               ctrl.getBoothVillages);

// POST /api/booths — create booth
router.post("/",         auth("state_leader"),     ctrl.createBooth);

// POST /api/booths/bulk — bulk CSV upload
router.post("/bulk",     auth("state_leader"),     ctrl.bulkCreateBooths);

// GET  /api/booths/:id
router.get("/:id",       auth(),                   ctrl.getBoothById);

// GET  /api/booths/:id/summary
router.get("/:id/summary", auth(),                 ctrl.getBoothSummary);

// PUT  /api/booths/:id — full update
router.put("/:id",          auth("state_leader"),  ctrl.updateBooth);

// PATCH /api/booths/:id/status
router.patch("/:id/status", auth("taluka_leader"), ctrl.updateStatus);

// POST /api/booths/:id/voter-list — upload PDF as base64 JSON (state_leader+)
router.post("/:id/voter-list",   auth("state_leader"), ctrl.uploadVoterList);

// DELETE /api/booths/:id/voter-list
router.delete("/:id/voter-list", auth("state_leader"), ctrl.deleteVoterList);

module.exports = router;
