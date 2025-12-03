import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./src/schema";

// In Cloudflare Workers, we cannot share database connections across requests.
// Each request must create its own connection to avoid I/O object conflicts.
// postgres-js automatically detects Workers environment and uses HTTP mode.

// Type for the database instance
export type Database = ReturnType<typeof drizzle<typeof schema>>;

// Create a function that returns a fresh db instance with a given connection string
// This ensures each request gets its own isolated connection
export function createDb(connectionString: string): Database {
  const client = postgres(connectionString, {
    max: 1, // Single connection - no pooling in Workers
  });
  return drizzle(client, { schema });
}

// For backwards compatibility (Node.js environments like drizzle.config.ts, migrations, etc.)
// This reads from process.env at module load time - only use in Node.js, not Workers
function getDefaultDb(): Database {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  return createDb(connectionString);
}

// Legacy proxy for backwards compatibility - DEPRECATED for Workers
// Only use in Node.js scripts, tests, or migrations, not in Cloudflare Workers
// For Workers, use createDb(connectionString) directly with c.env.DATABASE_URL
const db = new Proxy({} as Database, {
  get(_target, prop) {
    // Create a fresh db instance for each property access
    const freshDb = getDefaultDb();
    const value = freshDb[prop as keyof typeof freshDb];

    // If it's a function, bind it to the fresh db instance
    if (typeof value === "function") {
      return value.bind(freshDb);
    }

    // For objects (like .query), return them directly from the fresh connection
    return value;
  },
});

export default db;
export * from "./src/schema";
export * from "./src/queries";
