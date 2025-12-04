# Environment Variables Setup Guide

This guide explains how to configure all environment variables for local development.

---

# packages/db/.env

Database configuration for the Drizzle ORM layer.

#### `DATABASE_URL` • Required
PostgreSQL/Any SQL connection string for your local database.

**Setup:**
1. Start PostgreSQL
2. Create database: `psql postgres -c "CREATE DATABASE clankerrank;"`
3. Set value: `postgresql://localhost:5432/clankerrank`

---

# apps/backend/.env

Backend API configuration for the Cloudflare Workers service.

#### `AI_GATEWAY_API_KEY` • Required
API key for accessing AI models through Vercel AI Gateway.
- Sign up at [Vercel](https://vercel.com/)
- Navigate to your project → AI → Create Gateway
- Copy the API key from the dashboard

#### `DATABASE_URL` • Required
PostgreSQL connection string (same as `packages/db/.env`)
- Value: `postgresql://localhost:5432/clankerrank`

#### `PROJECT_NAME` • Optional
Display name for your project
- Default: `Clankerrank`

#### `WORKOS_API_KEY` • Required
WorkOS AuthKit API key for authentication and user management
- Sign up at [WorkOS](https://workos.com/)
- Create a new project with AuthKit enabled
- Navigate to API Keys tab → copy Secret Key (starts with `sk_test_`)

#### `WORKOS_CLIENT_ID` • Required
WorkOS AuthKit Client ID for your application
- Find in WorkOS dashboard → API Keys tab → copy Client ID (starts with `client_`)

#### `WORKOS_COOKIE_PASSWORD` • Required
Secret key used by AuthKit to encrypt session cookies (must be at least 32 characters)
- Generate: `openssl rand -base64 32`
- Keep secure - changing this invalidates all existing sessions

#### `NEXT_PUBLIC_WORKOS_REDIRECT_URI` • Required (pre-configured)
OAuth callback URL for WorkOS AuthKit authentication
- Local dev value: `http://localhost:3000/callback`
- In WorkOS dashboard → Redirects tab → add `http://localhost:3000/callback` as sign-in callback
- Also set app homepage URL to `http://localhost:3000`

#### `POSTHOG_API_KEY` • Optional
PostHog API key for product analytics
- Sign up at [PostHog](https://posthog.com/) → copy Project API Key
- App functions normally if not provided

---

# `apps/web/.env`

Frontend web application configuration (Next.js).

#### `AI_GATEWAY_API_KEY` • Required
Same as backend - API key for Vercel AI Gateway access
- Value: Same as `apps/backend/.env`

#### `DATABASE_URL` • Required
PostgreSQL connection string for server-side database access
- Value: `postgresql://localhost:5432/clankerrank`

#### `PROJECT_NAME` • Optional
Display name for your project
- Default: `Clankerrank`

#### `NEXT_PUBLIC_BACKEND_URL` • Required (pre-configured)
URL where the backend API is running
- Local dev value: `http://localhost:8787`
- Production: Update to your deployed backend URL

#### `NEXT_PUBLIC_BACKEND_API_KEY` • Optional (leave empty)
Default encrypted user ID for API authentication (fallback value)
- Local dev: Leave empty (`NEXT_PUBLIC_BACKEND_API_KEY=`)
- Why it's optional: Users authenticate via WorkOS before making API calls, their encrypted user ID is dynamically generated
- Advanced: See [Generating a Test API Key](#generating-a-test-api-key-advanced) section below if needed

#### `WORKOS_API_KEY` • Required
Same as backend - WorkOS AuthKit API key
- Value: Same as `apps/backend/.env`

#### `WORKOS_CLIENT_ID` • Required
Same as backend - WorkOS AuthKit Client ID
- Value: Same as `apps/backend/.env`

#### `WORKOS_COOKIE_PASSWORD` • Required
Same as backend - AuthKit session cookie encryption secret
- Value: Same as `apps/backend/.env` (must match exactly)

#### `NEXT_PUBLIC_WORKOS_REDIRECT_URI` • Required (pre-configured)
OAuth callback URL for WorkOS authentication
- Value: `http://localhost:3000/callback`

---

# Generating a Test API Key (Advanced)

If you need to test API calls without going through WorkOS authentication, you can generate an encrypted API key:

1. First, create a test user in WorkOS and get their user ID (format: `user_01XXXXX`)

2. Create a script to encrypt the user ID:

```typescript
// scripts/generate-test-api-key.ts
import { createCipheriv, randomBytes, pbkdf2Sync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 16;
const ITERATIONS = 100000;

function deriveKey(password: string, salt: Buffer): Buffer {
  return pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, "sha256");
}

function encryptUserId(userId: string, password: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = deriveKey(password, salt);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(userId, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([salt, iv, encrypted, tag]);

  return combined.toString("base64");
}

const userId = process.argv[2];
const password = process.env.WORKOS_COOKIE_PASSWORD;

if (!userId || !password) {
  console.error("Usage: WORKOS_COOKIE_PASSWORD=xxx tsx scripts/generate-test-api-key.ts user_01ABC123");
  process.exit(1);
}

console.log("Encrypted API Key:", encryptUserId(userId, password));
```

3. Run it:
```sh
WORKOS_COOKIE_PASSWORD=your_cookie_password tsx scripts/generate-test-api-key.ts user_01ABC123
```

4. Add the output to `NEXT_PUBLIC_BACKEND_API_KEY` in `apps/web/.env`

**Note:** This is rarely needed for local development since you can just log in normally.