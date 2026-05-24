const router = require("express").Router();
const auth   = require("../middleware/auth");
const ctrl   = require("../controllers/analytics.controller");

router.get("/issues",  auth(), ctrl.getIssues);
router.get("/summary", auth(), ctrl.getSummary);

module.exports = router;
