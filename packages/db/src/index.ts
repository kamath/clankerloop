import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema';

// Pool and db instances that can be recreated
let pool: Pool | null = null;
let dbInstance: NodePgDatabase<typeof schema> | null = null;

// Create or get the connection pool
function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return pool;
}

// Create or get the drizzle instance with schema
function getDb(): NodePgDatabase<typeof schema> {
  if (!dbInstance) {
    dbInstance = drizzle(getPool(), { schema });
  }
  return dbInstance;
}

// Proxy object that lazily initializes the db connection
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop) {
    return getDb()[prop as keyof NodePgDatabase<typeof schema>];
  },
});

// Export pool getter for manual connection management if needed
export { getPool as pool };

// Helper to close the connection pool
export async function closeConnection() {
  if (pool) {
    await pool.end();
    pool = null;
    dbInstance = null;
  }
}

// Re-export schema for convenience
export * from './schema';
