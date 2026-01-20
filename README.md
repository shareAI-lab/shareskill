# ShareSkill v2

Agent Skill Discovery & Management Platform

## Quick Start

```sh
# Install dependencies
pnpm install

# Build packages
pnpm build

# Start web dev server
pnpm --filter @shareskill/web dev

# Start hub locally
pnpm --filter shareskill dev
```

## Project Structure

```
shareskill-v2/
├── apps/
│   ├── web/          # SvelteKit web service (shareskill.run)
│   └── hub/          # npm package (npx shareskill)
├── packages/
│   ├── shared/       # Shared types and constants
│   └── db/           # Database schema and client
├── pipeline/         # Data processing scripts
└── docs/             # Documentation
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```sh
cp .env.example .env
```

## Development

### Web Service

```sh
pnpm --filter @shareskill/web dev
```

### Hub (MCP Server)

```sh
pnpm --filter shareskill build
npx shareskill setup
npx shareskill serve
```

### Pipeline

```sh
pnpm --filter @shareskill/pipeline start
```

## Deployment

- Web: Auto-deploys to Vercel on push to main
- Hub: Publish to npm with `git tag hub-v0.1.0 && git push --tags`
- Pipeline: Runs every 6 hours via GitHub Actions

## Documentation

See `docs/` folder for detailed documentation.
