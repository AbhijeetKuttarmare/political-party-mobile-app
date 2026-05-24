# Database Migrations

This directory contains all database schema migrations for the NCP Campaign App.

## Overview

Migrations are applied in numerical order (001, 002, 003, etc.). Each migration is idempotent and tracks which migrations have been applied via the `schema_migrations` table.

## Migration Files

- **001-post-likes.sql** — Post likes table with composite key to prevent duplicate likes
- **002-post-comments.sql** — Post comments with support for threaded replies (parent_id)
- **003-post-comment-likes.sql** — Likes on comments
- **004-post-bookmarks.sql** — Bookmarked/saved posts
- **005-campaign-event-likes.sql** — Likes on campaign events
- **006-campaign-event-rsvp.sql** — RSVP status (going/interested/declined) for events
- **007-post-updates-trigger.sql** — Auto-update trigger for posts.updated_at

## Running Migrations

### Manual

From the project root:

```bash
# Run all pending migrations
node database/run-migrations.js

# Or with npm script (if added)
npm run migrate
```

### Automatic (on Server Start)

To run migrations automatically when the server starts, uncomment the migration runner in `backend/server.js`:

```javascript
const { runMigrations } = require('./database/run-migrations');

// ... other initialization code ...

// Run pending migrations before starting server
runMigrations().then(() => {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
});
```

## Creating New Migrations

1. Create a new file in this directory with pattern: `NNN-description.sql`
   - Use the next sequential number (e.g., `008-new-feature.sql`)
   - Use lowercase with hyphens for file names

2. Write idempotent SQL using `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`

3. Run migrations to apply

Example:

```sql
-- Migration: Add new feature
-- Description: What this migration does
-- Run Date: 2026-05-22

CREATE TABLE IF NOT EXISTS new_table (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_new_table_name ON new_table(name);
```

## Tracking

The `schema_migrations` table tracks which migrations have been applied. Each migration is recorded with:
- `filename` — Name of the migration file
- `executed_at` — Timestamp when it was applied

## Troubleshooting

**Error: "relation 'schema_migrations' does not exist"**
- Run migrations again; the table will be created automatically

**Error: "relation 'posts' does not exist"**
- Ensure main schema.sql has been applied before running likes/comments migrations

**Migration failed but partially executed**
- Check the schema_migrations table to see what ran
- Fix the issue and re-run; migrations won't re-execute if already recorded
