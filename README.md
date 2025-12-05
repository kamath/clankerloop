# ClankerLoop

A monorepo containing a Next.js web app and Cloudflare Workers backend. Check it out at [ClankerLoop.com](https://ClankerLoop.com).

![Demo](public/demo.gif)

## Prerequisites

- [Bun](https://bun.sh/) v1.1.10+
- [Node.js](https://nodejs.org/) v18+
- PostgreSQL database

## Setup

1. **Install dependencies**

   ```sh
   bun install
   ```

2. **Configure environment variables**

   ```sh
   cp apps/web/.env.example apps/web/.env
   cp apps/backend/.env.example apps/backend/.env
   cp packages/db/.env.example packages/db/.env
   ```

   - Fill in the values in each `.env` file.
   - See [DEV_ENV_SETUP](./docs/DEV_ENV_SETUP.md) for detailed instructions and explanations for each variable.

3. **Set up the database**

   ```sh
   bun run db:generate
   bun run db:migrate
   ```

## Development

Start all apps:

```sh
bun run dev
```

Or run a specific app:

```sh
# Web app (Next.js)
bun run dev --filter=web

# Backend (Cloudflare Workers)
bun run dev --filter=backend
```

## Other Commands

```sh
bun run build          # Build all apps
bun run lint           # Lint all apps
bun run lint:fix       # Lint and fix issues
bun run format         # Format code with Prettier
bun run check-types    # Type check all apps
bun run db:studio      # Open Drizzle Studio
```

## Project Structure

```
apps/
  web/       # Next.js frontend
  backend/   # Cloudflare Workers API

packages/
  db/                  # Drizzle ORM database layer
  api-types/           # Shared API types
  eslint-config/       # ESLint configuration
  typescript-config/   # TypeScript configuration
```
