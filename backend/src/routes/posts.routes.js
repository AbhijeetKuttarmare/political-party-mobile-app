const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/posts.controller");
const auth    = require("../middleware/auth");

// More specific routes FIRST to avoid collision with /:id
router.get(  "/me/count",           auth(), ctrl.myPostCount);
router.get(  "/me",                 auth(), ctrl.myPosts);
router.post("/comments/:id/like",   auth(), ctrl.toggleCommentLike);
router.post("/comments/:id/report", auth(), ctrl.reportComment);
router.get( "/reported",            auth("super_admin"), ctrl.getReported);
router.patch("/reports/:id",        auth("super_admin"), ctrl.updateReport);

// General routes
router.get("/",                   auth(), ctrl.getFeed);
router.post("/",                  auth(), ctrl.createPost);
router.delete("/:id",             auth(), ctrl.deletePost);
router.post("/:id/like",          auth(), ctrl.toggleLike);
router.get("/:id/comments",       auth(), ctrl.getComments);
router.post("/:id/comments",      auth(), ctrl.addComment);
router.post("/:id/bookmark",      auth(), ctrl.toggleBookmark);
router.post("/:id/report",        auth(), ctrl.reportPost);

module.exports = router;
