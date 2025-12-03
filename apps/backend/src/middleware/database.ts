import { createMiddleware } from "hono/factory";
import { createDb, type Database } from "@repo/db";

// Extend Hono's ContextVariableMap to include db
declare module "hono" {
  interface ContextVariableMap {
    db: Database;
  }
}

export const databaseMiddleware = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    // Get DATABASE_URL from Cloudflare Workers environment
    const connectionString = c.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    // Create a fresh database connection for this request
    const db = createDb(connectionString);

    // Store in context for use by route handlers
    c.set("db", db);

    await next();
  },
);
