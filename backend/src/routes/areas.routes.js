const router = require("express").Router();
const auth   = require("../middleware/auth");
const ctrl   = require("../controllers/areas.controller");

// GET /api/areas?election=zp&district=wardha
router.get("/",     auth(), ctrl.getAreas);

// GET /api/areas/:id
router.get("/:id",  auth(), ctrl.getAreaById);

module.exports = router;
