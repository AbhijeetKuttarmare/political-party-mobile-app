const router   = require("express").Router();
const { body } = require("express-validator");
const auth     = require("../middleware/auth");
const validate = require("../middleware/validate");
const ctrl     = require("../controllers/volunteers.controller");

// POST /api/volunteers — create karyakarta/volunteer (any logged-in user)
router.post("/",           auth(),               ctrl.createVolunteer);

// GET  /api/volunteers?area=wardha-zp
router.get("/",            auth("taluka_leader"), ctrl.getAll);

// GET  /api/volunteers/:id
router.get("/:id",         auth(),               ctrl.getById);

// PUT  /api/volunteers/:id  — state_leader+ can edit
router.put("/:id",         auth("state_leader"), ctrl.updateVolunteer);

// POST /api/volunteers/checkin  — GPS check-in at booth
router.post("/checkin", auth("booth_worker"), [
  body("booth_id").isInt({ min: 1 }).withMessage("booth_id required"),
  body("lat").optional().isFloat({ min: -90,  max: 90  }),
  body("lng").optional().isFloat({ min: -180, max: 180 }),
  validate,
], ctrl.checkin);

// GET  /api/volunteers/active?area=wardha-zp  — live map data
router.get("/active",      auth("taluka_leader"), ctrl.getActive);

module.exports = router;
