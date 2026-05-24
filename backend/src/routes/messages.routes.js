const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/messages.controller");
const auth    = require("../middleware/auth");

router.post("/upload",           auth(), ...ctrl.uploadMedia);
router.get("/conversations",     auth(), ctrl.getConversations);
router.post("/:msgId/reactions", auth(), ctrl.toggleReaction);
router.get("/:userId",           auth(), ctrl.getMessages);
router.post("/:userId",          auth(), ctrl.sendMessage);
router.patch("/:userId/read",    auth(), ctrl.markRead);

module.exports = router;
