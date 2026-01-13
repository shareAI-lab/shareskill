# Skill Search Frontend

A simple Next.js frontend for browsing and searching skills backed by a
remote Supabase Postgres database.

## Features
- List/search skills with tags, categories, and metadata
- Detail page with description, usage, and download links
- Powered by Supabase for data storage

## Quick Start
1) Install dependencies
```bash
pnpm install
```

2) Configure Supabase credentials
Create `.env.local`:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# or use an anon key instead of the service role key:
# SUPABASE_ANON_KEY=your-anon-key
```

3) Run dev server
```bash
pnpm dev
```

## Build
```bash
pnpm build
pnpm start
```

## Notes
- The API routes use Supabase server-side; set the environment variables
  in the deployment environment as well.
- The GitHub icon in the header links to the project repo.
