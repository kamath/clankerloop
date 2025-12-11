import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { apiKeyAuth } from "./middleware/auth";
import { databaseMiddleware } from "./middleware/database";
import { problems } from "./routes/problems";
import { design } from "./routes/design";
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

// Public R2 file serving (no auth required)
app.get("/r2/*", async (c) => {
  const path = c.req.path.replace("/r2/", "");

  if (!path) {
    return c.json({ error: "File path required" }, 400);
  }

  try {
    const object = await c.env.clankerrank.get(path);

    if (!object) {
      return c.json({ error: "File not found" }, 404);
    }

    // Set appropriate headers
    const headers = new Headers();

    // Set content type if available
    if (object.httpMetadata?.contentType) {
      headers.set("Content-Type", object.httpMetadata.contentType);
    } else {
      // Try to infer from file extension
      const ext = path.split(".").pop()?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        webp: "image/webp",
        svg: "image/svg+xml",
        pdf: "application/pdf",
        json: "application/json",
      };
      headers.set(
        "Content-Type",
        mimeTypes[ext || ""] || "application/octet-stream",
      );
    }

    // Set cache headers
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    // Set CORS headers
    headers.set("Access-Control-Allow-Origin", "*");

    // Return the object body with headers
    return new Response(object.body, {
      headers,
      status: 200,
    });
  } catch (error) {
    console.error("Error serving R2 file:", error);
    return c.json(
      {
        error: "Failed to serve file",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

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
    isAdmin: boolean;
    db: Database;
  };
}>();
api.use("*", databaseMiddleware);
api.use("*", apiKeyAuth);
api.route("/problems", problems);
api.route("/design", design);

app.route("/api/v1", api);

// OpenAPI spec endpoint
app.doc("/api/v1/openapi.json", {
  openapi: "3.1.0",
  info: {
    title: "ClankerLoop API",
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
    { name: "Design", description: "Design text streaming" },
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
