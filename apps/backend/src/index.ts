import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { MessageBatch } from "@cloudflare/workers-types";
import { apiKeyAuth } from "./middleware/auth";
import { problems } from "./routes/problems";
import { handleQueueBatch } from "./queue/consumer";
import type { QueueMessage } from "./queue/types";

const app = new OpenAPIHono<{ Bindings: Env }>();

// Global middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    allowHeaders: ["Content-Type", "X-API-Key"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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
  };
}>();
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
    process.env.NODE_ENV === "production" && status === 500
      ? "An unexpected error occurred"
      : err.message;

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

  async queue(batch: MessageBatch<QueueMessage>, env: Env): Promise<void> {
    await handleQueueBatch(batch, env);
  },
};

export { Sandbox } from "@cloudflare/sandbox";
