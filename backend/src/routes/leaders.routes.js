const router = require("express").Router();
const auth   = require("../middleware/auth");
const ctrl   = require("../controllers/leaders.controller");

router.get("/",      auth(),               ctrl.getAll);
router.get("/:id",   auth(),               ctrl.getById);
router.post("/",     auth("super_admin"),  ctrl.create);
router.put("/:id",   auth("super_admin"),  ctrl.update);
router.delete("/:id",auth("super_admin"),  ctrl.remove);

module.exports = router;
