# Database Setup & Migrations Guide

## Overview

The application uses PostgreSQL with a migration-based schema management system. All database changes are tracked and applied sequentially to ensure consistency across environments.

## Prerequisites

- PostgreSQL 12+ installed and running
- Environment variables configured in `backend/.env`:
  ```env
  DB_HOST=localhost
  DB_PORT=5432
  DB_NAME=ncp_campaign
  DB_USER=postgres
  DB_PASSWORD=your_password
  ```

## Initial Setup

### 1. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create the database
CREATE DATABASE ncp_campaign;

# Exit
\q
```

### 2. Apply Base Schema

```bash
# Run the main schema file
psql -U postgres -d ncp_campaign -f database/schema.sql
```

This creates the core tables:
- elections
- districts
- areas
- booths
- voters
- volunteers
- posts
- etc.

### 3. Run Migrations

Migrations handle all additional schema changes including likes, comments, and bookmarks:

```bash
# Option A: Run via npm script (from backend directory)
cd backend
npm run migrate

# Option B: Run directly
node database/run-migrations.js

# Option C: Migrations run automatically on server start
npm run dev
```

## Migration System

### How It Works

1. **Migrations Directory**: All `.sql` files in `database/migrations/` are tracked
2. **Execution Order**: Files are executed alphabetically (use `001-`, `002-` prefixes)
3. **Tracking**: The `schema_migrations` table records which migrations have been applied
4. **Idempotency**: All migrations use `IF NOT EXISTS` to prevent duplicate creation errors
5. **Auto-Run**: Server automatically runs pending migrations on startup (if enabled)

### Current Migrations

| File | Table | Purpose |
|------|-------|---------|
| 001-post-likes.sql | post_likes | Users can like posts |
| 002-post-comments.sql | post_comments | Users can comment on posts |
| 003-post-comment-likes.sql | post_comment_likes | Users can like comments |
| 004-post-bookmarks.sql | post_bookmarks | Users can bookmark posts |
| 005-campaign-event-likes.sql | campaign_event_likes | Users can like campaign events |
| 006-campaign-event-rsvp.sql | campaign_event_rsvp | Users can RSVP to events (going/interested) |
| 007-post-updates-trigger.sql | trigger | Auto-update posts.updated_at timestamp |

## Common Tasks

### Check Migration Status

```bash
# Query the schema_migrations table
psql -U postgres -d ncp_campaign -c "SELECT * FROM schema_migrations ORDER BY filename;"
```

### View Database Schema

```bash
# List all tables
psql -U postgres -d ncp_campaign -c "\dt"

# View specific table structure
psql -U postgres -d ncp_campaign -c "\d post_likes"
```

### Add Seed Data

```bash
# Load demo users
psql -U postgres -d ncp_campaign -f database/seed_demo_users.sql

# Or full seed
psql -U postgres -d ncp_campaign -f database/seed_full.sql
```

## Creating New Migrations

When adding new features, create migrations instead of modifying existing files:

### 1. Create Migration File

```bash
# Create numbered SQL file in database/migrations/
# Example: 008-new-feature.sql

cat > database/migrations/008-new-feature.sql << 'EOF'
-- Migration: New feature description
-- Description: What this migration adds/modifies
-- Run Date: 2026-05-22

CREATE TABLE IF NOT EXISTS new_table (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_new_table_name ON new_table(name);
EOF
```

### 2. Run Migration

```bash
node database/run-migrations.js
```

### 3. Commit to Git

```bash
git add database/migrations/008-new-feature.sql
git commit -m "Add migration: 008-new-feature"
```

## API Endpoints (Using These Tables)

### Posts with Likes & Comments

```
GET    /api/posts?limit=20&offset=0    # Get feed with like/comment counts
POST   /api/posts                       # Create new post
DELETE /api/posts/:id                   # Delete post
POST   /api/posts/:id/like              # Toggle like
GET    /api/posts/:id/comments          # Get comments
POST   /api/posts/:id/comments          # Add comment
```

## Troubleshooting

### Issue: "relation 'post_likes' does not exist"

**Cause**: Migrations weren't run

**Fix**:
```bash
# Run migrations
npm run migrate

# Or verify server automatically runs them
npm run dev
```

### Issue: "database 'ncp_campaign' does not exist"

**Cause**: Database wasn't created

**Fix**:
```bash
psql -U postgres -c "CREATE DATABASE ncp_campaign;"
psql -U postgres -d ncp_campaign -f database/schema.sql
npm run migrate
```

### Issue: Migration fails with "permission denied"

**Cause**: PostgreSQL user lacks privileges

**Fix**:
```bash
# As postgres superuser:
psql -U postgres -d ncp_campaign -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;"
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO your_user;
```

### Issue: Migrations table doesn't exist

**Cause**: First time running migrations

**Fix**: Run migrations again; the table will be created automatically
```bash
npm run migrate
```

## Best Practices

1. **Always use migrations** for schema changes, never modify production databases directly
2. **Test migrations locally** before deploying to production
3. **Keep migrations small** - one logical change per migration
4. **Use descriptive names** - `001-add-post-likes.sql` is better than `001-migration.sql`
5. **Make migrations idempotent** - use `IF NOT EXISTS` and `IF NOT` conditions
6. **Document changes** - add comments explaining the purpose
7. **Never delete migrations** - delete only if they haven't been deployed
8. **Review migrations** in pull requests before merging

## Environment-Specific Setup

### Development

```bash
cd backend
npm run dev    # Runs migrations automatically + starts server
```

### Production

```bash
# Run migrations before deploying code
npm run migrate

# Then start server
npm start
```

### Testing

```bash
# Create test database
psql -U postgres -c "CREATE DATABASE ncp_campaign_test;"

# Run migrations
DB_NAME=ncp_campaign_test npm run migrate

# Run tests
npm test
```
