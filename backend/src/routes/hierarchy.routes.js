const router = require("express").Router();
const auth   = require("../middleware/auth");
const ctrl   = require("../controllers/hierarchy.controller");

router.get("/districts", auth(), ctrl.getDistricts);
router.get("/talukas",   auth(), ctrl.getTalukas);
router.get("/villages",  auth(), ctrl.getVillages);
router.get("/search",    auth(), ctrl.search);

module.exports = router;
