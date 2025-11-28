/// <reference path="../worker-configuration.d.ts" />
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { apiKeyAuth } from "./middleware/auth";
import { problems } from "./routes/problems";

const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    allowHeaders: ["Content-Type", "X-API-Key"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// Health check (no auth required)
app.get("/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() })
);

// API routes (auth required)
const api = new Hono();
api.use("*", apiKeyAuth);
api.route("/problems", problems);

app.route("/api/v1", api);

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
    status
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
    404
  );
});

// Cloudflare Workers export format
// Workers don't use ports - they're invoked via fetch events
export default {
  fetch: app.fetch,
};

export { Sandbox } from "@cloudflare/sandbox";
