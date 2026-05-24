const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/groups.controller");
const auth    = require("../middleware/auth");

router.post("/",                                auth(), ctrl.createGroup);
router.get("/",                                 auth(), ctrl.getMyGroups);
router.get("/:id",                              auth(), ctrl.getGroupInfo);
router.post("/:id/members",                     auth(), ctrl.addMember);
router.delete("/:id/leave",                     auth(), ctrl.leaveGroup);
router.get("/:id/messages",                     auth(), ctrl.getGroupMessages);
router.post("/:id/messages",                    auth(), ctrl.sendGroupMessage);
router.patch("/:id/read",                       auth(), ctrl.markGroupRead);
router.post("/:id/messages/:msgId/reactions",   auth(), ctrl.toggleGroupReaction);

module.exports = router;
