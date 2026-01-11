# API Package - Cloudflare Workers + tRPC

This package contains the tRPC API server that runs on Cloudflare Workers with D1 database.

## Setup

### 1. Create a D1 Database

```bash
cd packages/api
npx wrangler d1 create knitcount
```

This will output a database ID. Copy it and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "knitcount"
database_id = "YOUR_DATABASE_ID_HERE"
```

### 2. Run Migrations

Apply the initial schema to your D1 database:

```bash
npx wrangler d1 execute knitcount --remote --file=../db/migrations/0001_initial.sql
```

For local development:

```bash
npx wrangler d1 execute knitcount --local --file=../db/migrations/0001_initial.sql
```

### 3. Development

Run the development server:

```bash
pnpm dev
```

This will start the Cloudflare Workers dev server with hot reloading.

### 4. Deploy

Deploy to Cloudflare Workers:

```bash
pnpm deploy
```

## Environment Variables

No environment variables needed! The database binding is configured in `wrangler.toml`.

## API Endpoints

The tRPC server is available at `/trpc` endpoint.

### Available Procedures

- `post.all` - Get all posts (latest 10)
- `post.byId` - Get a post by ID
- `post.create` - Create a new post
- `post.delete` - Delete a post by ID

## Database Schema

The database uses D1 (SQLite) with the following schema:

- **post** table
  - `id` (TEXT, PRIMARY KEY)
  - `title` (TEXT)
  - `content` (TEXT)
  - `created_at` (INTEGER, timestamp)
  - `updated_at` (INTEGER, timestamp)

## Notes

- Authentication has been removed from this API
- All endpoints are now public
- The database has been migrated from Vercel Postgres to Cloudflare D1
