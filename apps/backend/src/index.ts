import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { apiKeyAuth } from "./middleware/auth";
import { databaseMiddleware } from "./middleware/database";
import { problems } from "./routes/problems";
import { ProblemGenerationWorkflow } from "./workflows/problem-generation";
import type { Database } from "@repo/db";

const app = new OpenAPIHono<{ Bindings: Env }>();

// Global middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*", // Allow all origins - safe because we use API key auth, not cookies
    allowHeaders: ["Content-Type", "X-API-Key", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    exposeHeaders: ["Content-Type"],
    maxAge: 86400, // 24 hours
  }),
);

// Health check (no auth required)
app.get("/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() }),
);

// Register security scheme for OpenAPI docs
app.openAPIRegistry.registerComponent("securitySchemes", "ApiKeyAuth", {
  type: "apiKey",
  in: "header",
  name: "X-API-Key",
  description: "API Key for authentication (encrypted user ID)",
});

// API routes (auth required)
const api = new OpenAPIHono<{
  Bindings: Env;
  Variables: {
    userId: string;
    db: Database;
  };
}>();
api.use("*", databaseMiddleware);
api.use("*", apiKeyAuth);
api.route("/problems", problems);

app.route("/api/v1", api);

// OpenAPI spec endpoint
app.doc("/api/v1/openapi.json", {
  openapi: "3.1.0",
  info: {
    title: "ClankerRank API",
    version: "1.0.0",
    description:
      "AI-powered competitive programming problem generation and evaluation API",
  },
  servers: [{ url: "http://localhost:8787", description: "Development" }],
  tags: [
    { name: "Models", description: "AI model management" },
    { name: "Problems", description: "Problem generation and retrieval" },
    { name: "Test Cases", description: "Test case generation and management" },
    { name: "Solutions", description: "Solution generation and execution" },
  ],
});

// Swagger UI at /docs
app.get("/docs", swaggerUI({ url: "/api/v1/openapi.json" }));

// Global error handler
app.onError((err, c) => {
  console.error("Error:", err);

  const status = ("status" in err ? err.status : 500) as ContentfulStatusCode;
  const message =
    err instanceof Error ? err.message : "An unexpected error occurred";

  return c.json(
    {
      success: false,
      error: {
        code: `HTTP_${status}`,
        message,
      },
      timestamp: new Date().toISOString(),
    },
    status,
  );
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: `Route ${c.req.path} not found`,
      },
      timestamp: new Date().toISOString(),
    },
    404,
  );
});

// Cloudflare Workers export format
// Workers don't use ports - they're invoked via fetch events
export default {
  fetch: app.fetch,
};

export { Sandbox } from "@cloudflare/sandbox";
export { ProblemGenerationWorkflow };
