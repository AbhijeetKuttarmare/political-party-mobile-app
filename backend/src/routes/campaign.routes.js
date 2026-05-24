const router    = require("express").Router();
const auth      = require("../middleware/auth");
const ctrl      = require("../controllers/campaign.controller");
const postCtrl  = require("../controllers/posts.controller");

// More specific comment routes FIRST to avoid /:id collision
router.post("/events/comments/:id/like", auth(), ctrl.toggleEventCommentLike);

// GET  /api/campaign/events  — any logged-in user
router.get("/events",             auth(),               ctrl.getEvents);

// POST /api/campaign/events  — any logged-in user
router.post("/events",            auth(),               ctrl.createEvent);

// PUT  /api/campaign/events/:id
router.put("/events/:id",         auth("state_leader"), ctrl.updateEvent);

// DELETE /api/campaign/events/:id
router.delete("/events/:id",      auth("state_leader"), ctrl.deleteEvent);

// RSVP  /api/campaign/events/:id/rsvp  — any logged-in user (going / interested)
router.post("/events/:id/rsvp",      auth(), postCtrl.toggleRsvp);

// Like  /api/campaign/events/:id/like  — any logged-in user
router.post("/events/:id/like",      auth(), ctrl.toggleEventLike);

// Bookmark  /api/campaign/events/:id/bookmark
router.post("/events/:id/bookmark",  auth(), ctrl.toggleEventBookmark);

// Comments  /api/campaign/events/:id/comments
router.get("/events/:id/comments",   auth(), ctrl.getEventComments);
router.post("/events/:id/comments",  auth(), ctrl.addEventComment);

module.exports = router;
