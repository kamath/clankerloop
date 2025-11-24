import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./src/schema";

const db = drizzle(process.env.DATABASE_URL!, { schema });

export default db;
export * from "./src/schema";
