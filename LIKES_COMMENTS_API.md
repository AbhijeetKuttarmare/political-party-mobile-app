# Posts, Likes & Comments - API Documentation

## Overview

The application now has a fully functional posts, likes, and comments system with database persistence. All likes and comment counts are properly tracked and persist across page refreshes.

## Database Schema

### Tables Created by Migrations

**post_likes** - Stores which users liked which posts
```sql
- post_id (INT, FK → posts.id)
- volunteer_id (INT, FK → volunteers.id)
- PRIMARY KEY (post_id, volunteer_id)
```

**post_comments** - Stores comments on posts with thread support
```sql
- id (SERIAL PRIMARY KEY)
- post_id (INT, FK → posts.id)
- author_id (INT, FK → volunteers.id)
- parent_id (INT, FK → post_comments.id) — NULL for top-level comments
- content (TEXT)
- created_at (TIMESTAMPTZ)
```

**post_comment_likes** - Stores which users liked which comments
```sql
- comment_id (INT, FK → post_comments.id)
- volunteer_id (INT, FK → volunteers.id)
- PRIMARY KEY (comment_id, volunteer_id)
```

**post_bookmarks** - Stores bookmarked posts
```sql
- post_id (INT, FK → posts.id)
- volunteer_id (INT, FK → volunteers.id)
- PRIMARY KEY (post_id, volunteer_id)
```

**campaign_event_likes** - Stores likes on campaign events
```sql
- event_id (INT, FK → campaign_events.id)
- volunteer_id (INT, FK → volunteers.id)
- PRIMARY KEY (event_id, volunteer_id)
```

**campaign_event_rsvp** - Stores RSVP status for events
```sql
- event_id (INT, FK → campaign_events.id)
- volunteer_id (INT, FK → volunteers.id)
- status (VARCHAR 'going' | 'interested' | 'declined')
- PRIMARY KEY (event_id, volunteer_id)
```

## API Endpoints

### Posts Feed

**GET /api/posts**
- Fetches all active posts with like/comment counts
- Query parameters: `limit` (default 20, max 50), `offset` (default 0)
- Returns: Array of posts with `like_count`, `comment_count`, `liked_by_me`, `bookmarked_by_me`

```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3001/api/posts?limit=20&offset=0"
```

Response:
```json
[
  {
    "id": 1,
    "type": "post",
    "content": "Hello world!",
    "author_id": 5,
    "author_name": "John Doe",
    "author_role": "state_leader",
    "like_count": 3,
    "comment_count": 2,
    "liked_by_me": true,
    "bookmarked_by_me": false,
    "created_at": "2026-05-22T10:30:00.000Z"
  }
]
```

### Create Post

**POST /api/posts**
- Creates a new post
- Body: `{ type, content, event_title?, event_date?, ... }`

```bash
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"post","content":"Great news!"}' \
  "http://localhost:3001/api/posts"
```

### Delete Post

**DELETE /api/posts/:id**
- Deletes/hides a post (soft delete)
- Only post author and admins can delete

```bash
curl -X DELETE -H "Authorization: Bearer TOKEN" \
  "http://localhost:3001/api/posts/1"
```

### Like/Unlike Post

**POST /api/posts/:id/like**
- Toggles like status on a post
- Returns: `{ liked: boolean, count: number }`

```bash
curl -X POST -H "Authorization: Bearer TOKEN" \
  "http://localhost:3001/api/posts/1/like"
```

Response:
```json
{
  "liked": true,
  "count": 3
}
```

### Get Comments

**GET /api/posts/:id/comments**
- Fetches all comments for a post
- Returns: Array of comments with `like_count`, `liked_by_me`

```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3001/api/posts/1/comments"
```

Response:
```json
[
  {
    "id": 1,
    "post_id": 1,
    "content": "Great post!",
    "author_name": "Jane Smith",
    "author_role": "district_leader",
    "like_count": 1,
    "liked_by_me": true,
    "parent_id": null,
    "created_at": "2026-05-22T10:35:00.000Z"
  }
]
```

### Add Comment

**POST /api/posts/:id/comments**
- Adds a new comment to a post
- Body: `{ content, parent_id? }`
- `parent_id` enables threaded replies

```bash
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Great post!"}' \
  "http://localhost:3001/api/posts/1/comments"
```

Response:
```json
{
  "id": 1,
  "post_id": 1,
  "content": "Great post!",
  "author_name": "Jane Smith",
  "author_role": "district_leader",
  "like_count": 0,
  "liked_by_me": false,
  "created_at": "2026-05-22T10:35:00.000Z"
}
```

### Like/Unlike Comment

**POST /api/posts/comments/:id/like**
- Toggles like status on a comment
- Returns: `{ liked: boolean, count: number }`

```bash
curl -X POST -H "Authorization: Bearer TOKEN" \
  "http://localhost:3001/api/posts/comments/1/like"
```

### Bookmark Post

**POST /api/posts/:id/bookmark**
- Toggles bookmark status
- Returns: `{ bookmarked: boolean }`

```bash
curl -X POST -H "Authorization: Bearer TOKEN" \
  "http://localhost:3001/api/posts/1/bookmark"
```

### Campaign Events - Like

**POST /api/campaign/events/:id/like**
- Toggles like on a campaign event
- Returns: `{ liked: boolean, count: number }`

```bash
curl -X POST -H "Authorization: Bearer TOKEN" \
  "http://localhost:3001/api/campaign/events/1/like"
```

### Campaign Events - RSVP

**POST /api/campaign/events/:id/rsvp**
- Sets RSVP status for an event
- Body: `{ status: "going" | "interested" | "declined" }`

```bash
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"going"}' \
  "http://localhost:3001/api/campaign/events/1/rsvp"
```

## Testing

Run the API test suite:

```bash
cd backend
node test-api.js
```

This will:
1. Login with a demo account
2. Create a test post
3. Like the post
4. Add a comment
5. Like the comment
6. Verify all data persists correctly

Expected output:
```
🎉 All tests passed!
✨ Likes and comments are persisting correctly after refresh.
```

## Migration System

All database changes are tracked via migrations:

```bash
# View all applied migrations
cd backend
npm run migrate
```

Migrations directory: `backend/database/migrations/`

Files:
- 001-post-likes.sql
- 002-post-comments.sql
- 003-post-comment-likes.sql
- 004-post-bookmarks.sql
- 005-campaign-event-likes.sql
- 006-campaign-event-rsvp.sql
- 007-post-updates-trigger.sql

## Frontend Integration

### Example: Fetch Feed with Likes/Comments

```typescript
const response = await fetch('http://localhost:3001/api/posts', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const posts = await response.json();

posts.forEach(post => {
  console.log(`${post.author_name}: ${post.like_count} likes, ${post.comment_count} comments`);
  console.log(`You liked it: ${post.liked_by_me}`);
  console.log(`You bookmarked it: ${post.bookmarked_by_me}`);
});
```

### Example: Like a Post

```typescript
const response = await fetch(`http://localhost:3001/api/posts/${postId}/like`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
const { liked, count } = await response.json();
console.log(`Like: ${liked}, Total: ${count}`);
```

### Example: Add Comment

```typescript
const response = await fetch(`http://localhost:3001/api/posts/${postId}/comments`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ content: 'Great post!' })
});
const comment = await response.json();
console.log(`Comment added: ${comment.id}`);
```

## Troubleshooting

### Likes/Comments Not Persisting

1. Check migrations were applied:
   ```bash
   cd backend
   npm run migrate
   ```

2. Verify database tables exist:
   ```bash
   psql -U postgres -d ncp_campaign -c "\dt post_*"
   ```

3. Check server logs for SQL errors

### Port 3001 Already in Use

```bash
# Kill all node processes
taskkill /F /IM node.exe

# Restart server
npm run dev
```

### Authentication Failed

Demo accounts (no password required):
- Mobile: `9999999999` - State Leader
- Mobile: `8888888888` - Super Admin
- Mobile: `7777777777` - District Leader

### Response Shows 0 Likes but I Just Liked It

This usually means:
1. API request succeeded but response not yet rendered
2. Frontend needs to refresh the feed
3. Check network tab in browser DevTools

All counts ARE being saved to the database and will be visible on page refresh.

## Performance Notes

- Post feeds are sorted by `created_at DESC` (newest first)
- Like counts use `COUNT(DISTINCT)` to handle edge cases
- Comment queries are indexed by `post_id` for fast lookups
- All INSERT operations use `ON CONFLICT DO NOTHING` to prevent duplicates

## Security

- All endpoints require authentication (`auth()` middleware)
- Users can only like/comment if they're valid volunteers
- Delete operations verify ownership or admin status
- Rate limiting applies to /api routes (500/15min global, 20/15min auth)

---

**Created:** May 22, 2026
**Database:** PostgreSQL (ncp_campaign)
**Backend:** Node.js + Express + pg
**Status:** ✅ Production Ready
