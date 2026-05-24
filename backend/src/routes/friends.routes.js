const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/friends.controller");
const auth    = require("../middleware/auth");

router.get("/count",                       auth(), ctrl.getFriendsCount);
router.get("/",                            auth(), ctrl.getFriends);
router.delete("/:friendshipId",            auth(), ctrl.unfriend);
router.post("/request",                    auth(), ctrl.sendRequest);
router.get("/requests",                    auth(), ctrl.getRequests);
router.patch("/requests/:id",              auth(), ctrl.updateRequest);

module.exports = router;
