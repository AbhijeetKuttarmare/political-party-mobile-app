const router   = require("express").Router();
const { body } = require("express-validator");
const auth     = require("../middleware/auth");
const validate = require("../middleware/validate");
const ctrl     = require("../controllers/surveys.controller");

// POST /api/surveys  — submit a voter survey
router.post("/", auth("booth_worker"), [
  body("booth_id").isInt({ min: 1 }).withMessage("Valid booth_id required"),
  body("response")
    .isIn(["ncp", "undecided", "opposition", "refused"])
    .withMessage("response must be: ncp | undecided | opposition | refused"),
  body("voter_id").optional().isInt(),
  body("issues").optional().isArray(),
  validate,
], ctrl.submit);

// GET /api/surveys?booth=5&date=2025-05-21
router.get("/",         auth("taluka_leader"), ctrl.getAll);

// GET /api/surveys/booth/:booth_id/stats
router.get("/booth/:booth_id/stats", auth(), ctrl.getBoothStats);

module.exports = router;
