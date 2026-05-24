const router   = require("express").Router();
const auth     = require("../middleware/auth");
const ctrl     = require("../controllers/elections.controller");

// GET /api/elections           — public (no auth needed for election list)
router.get("/", ctrl.getAll);

module.exports = router;
