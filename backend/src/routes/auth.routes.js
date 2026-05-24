const router     = require("express").Router();
const { body }   = require("express-validator");
const validate   = require("../middleware/validate");
const authCtrl   = require("../controllers/auth.controller");
const auth       = require("../middleware/auth");

// POST /api/auth/login
router.post("/login", [
  body("mobile")
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage("Enter a valid 10-digit mobile number"),
  body("password")
    .notEmpty()
    .withMessage("Password is required"),
  validate,
], authCtrl.login);

// POST /api/auth/register  (taluka_leader or above — controller enforces who can register what)
router.post("/register", auth("taluka_leader"), [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("mobile").trim().matches(/^[6-9]\d{9}$/).withMessage("Invalid mobile number"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("role").trim().isLength({ min: 2, max: 50 }).withMessage("Role must be 2–50 characters"),
  validate,
], authCtrl.register);

// POST /api/auth/demo-login  — issues real JWT for known demo numbers, no password needed
router.post("/demo-login", authCtrl.demoLogin);

// GET /api/auth/me  — get current user info from token
router.get("/me", auth(), authCtrl.me);

// POST /api/auth/change-password
router.post("/change-password", auth(), [
  body("oldPassword").notEmpty().withMessage("Old password is required"),
  body("newPassword").isLength({ min: 6 }).withMessage("New password must be 6+ characters"),
  validate,
], authCtrl.changePassword);

module.exports = router;
