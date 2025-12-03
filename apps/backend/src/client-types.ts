// This file exports the API types for frontend consumption
// We need to re-export the route types without using path aliases
// that the frontend can't resolve

import type { OpenAPIHono } from "@hono/zod-openapi";

// Define the app type structure based on our routes
// This provides type hints without needing to resolve the actual route implementations
export type AppType = OpenAPIHono<{
  Bindings: Record<string, unknown>;
  Variables: { userId: string, isAdmin: boolean };
}>;
