const router = require("express").Router();
const auth   = require("../middleware/auth");
const ctrl   = require("../controllers/leaders.controller");

router.get("/",      auth(),               ctrl.getAll);
router.post("/import-cabinet", auth("super_admin"), ctrl.importCabinetUpload, ctrl.importCabinet);
router.get("/:id",   auth(),               ctrl.getById);
router.post("/",     auth("super_admin"),  ctrl.create);
router.put("/:id",   auth("super_admin"),  ctrl.update);
router.post("/:id/photo", auth("super_admin"), ctrl.uploadPhotoMiddleware, ctrl.uploadPhoto);
router.delete("/cabinet/all", auth("super_admin"), ctrl.removeAllCabinet);
router.delete("/:id",         auth("super_admin"), ctrl.remove);

module.exports = router;
