const router = require("express").Router();
const auth   = require("../middleware/auth");
const ctrl   = require("../controllers/voters.controller");

// GET  /api/voters/search?q=Rajesh&booth=5
router.get("/search",  auth(), ctrl.search);

// GET  /api/voters/:id
router.get("/:id",     auth(), ctrl.getById);

// PATCH /api/voters/:id/support  — update NCP support flag
router.patch("/:id/support", auth("booth_worker"), ctrl.updateSupport);

module.exports = router;
