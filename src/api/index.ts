import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createHonoApp } from "../adapters/hono.js";
import { generateCommand, solveCommand } from "../commands/index.js";

// Create the Hono app with commands
const baseApp = createHonoApp([generateCommand, solveCommand]);

// Create main app with middleware
const app = new Hono();

// Add middleware
app.use("*", logger());
app.use("*", cors());

// Mount the API routes
app.route("/", baseApp);

// Root endpoint
app.get("/", (c) => {
  return c.json({
    name: "AI LeetCode Generator API",
    version: "1.0.0",
    endpoints: {
      "POST /api/generate": "Generate a new coding problem",
      "POST /api/solve": "Test a solution against problem test cases",
      "GET /api/health": "Health check",
    },
  });
});

export default app;
