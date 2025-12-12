import { createRoute } from "@hono/zod-openapi";
import {
  ApiErrorSchema,
  ChatRequestSchema,
  CreateSessionResponseSchema,
  DesignSessionSchema,
  DesignMessageSchema,
} from "@repo/api-types";
import { z } from "@hono/zod-openapi";

// Create session route
export const createSessionRoute = createRoute({
  method: "post",
  path: "/sessions",
  tags: ["Design"],
  summary: "Create a new design session",
  description: "Creates a new design session and returns the session ID",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: CreateSessionResponseSchema,
          }),
        },
      },
      description: "Session created successfully",
    },
    401: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description: "Unauthorized",
    },
  },
  security: [{ ApiKeyAuth: [] }],
});

// List sessions route
export const listSessionsRoute = createRoute({
  method: "get",
  path: "/sessions",
  tags: ["Design"],
  summary: "List user's design sessions",
  description: "Returns all design sessions for the authenticated user",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.array(DesignSessionSchema),
          }),
        },
      },
      description: "Sessions retrieved successfully",
    },
    401: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description: "Unauthorized",
    },
  },
  security: [{ ApiKeyAuth: [] }],
});

// Get session messages route
export const getSessionMessagesRoute = createRoute({
  method: "get",
  path: "/sessions/{sessionId}/messages",
  tags: ["Design"],
  summary: "Get session messages",
  description: "Retrieves all messages for a design session",
  request: {
    params: z.object({
      sessionId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.array(DesignMessageSchema),
          }),
        },
      },
      description: "Messages retrieved successfully",
    },
    403: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description: "Access denied",
    },
    404: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description: "Session not found",
    },
  },
  security: [{ ApiKeyAuth: [] }],
});

// Session-specific chat route
export const sessionChatRoute = createRoute({
  method: "post",
  path: "/sessions/{sessionId}/chat",
  tags: ["Design"],
  summary: "Chat with AI for design session",
  description: "Streams AI responses and persists messages to session",
  request: {
    params: z.object({
      sessionId: z.string().uuid(),
    }),
    body: {
      content: {
        "application/json": {
          schema: ChatRequestSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        "text/plain": {
          schema: z.string().openapi({
            description: "Streaming chat response",
          }),
        },
      },
      description: "Chat response streamed successfully",
    },
    403: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description: "Access denied",
    },
    404: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description: "Session not found",
    },
    400: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description: "Invalid model",
    },
  },
  security: [{ ApiKeyAuth: [] }],
});
