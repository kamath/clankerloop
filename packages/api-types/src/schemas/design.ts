import { z } from "@hono/zod-openapi";

// Message schema matching AI SDK UI's UIMessage format
// AI SDK's UIMessage can have content as string or array, and may use 'text' field
export const ChatMessageSchema = z
  .object({
    id: z.string().optional(),
    role: z.enum(["user", "assistant", "system", "tool"]).openapi({
      description: "The role of the message sender",
    }),
    // Accept both 'content' (string or array) and 'text' (string) for compatibility with AI SDK
    content: z
      .union([z.string(), z.array(z.any())])
      .optional()
      .openapi({
        description: "The message content (string or array of parts)",
      }),
    text: z.string().optional().openapi({
      description: "Alternative text field (used by some AI SDK transports)",
    }),
  })
  .passthrough(); // Allow additional fields

// Request schema for chat endpoint
export const ChatRequestSchema = z
  .object({
    messages: z.array(ChatMessageSchema).min(1).openapi({
      description: "Array of chat messages",
    }),
    model: z.string().optional().openapi({
      example: "openai:gpt-4",
      description: "Optional model to use for generation",
    }),
  })
  .openapi("ChatRequest");

// Response schema for create session endpoint
export const CreateSessionResponseSchema = z.object({
  sessionId: z.string().uuid().openapi({
    description: "The ID of the created design session",
  }),
});

// Design session schema
export const DesignSessionSchema = z.object({
  id: z.string().uuid().openapi({
    description: "The session ID",
  }),
  title: z.string().nullable().openapi({
    description: "The session title (auto-generated or null)",
  }),
  createdAt: z.string().openapi({
    description: "Session creation timestamp",
  }),
  updatedAt: z.string().openapi({
    description: "Session last update timestamp",
  }),
});

// Design message schema
export const DesignMessageSchema = z
  .object({
    id: z.string().uuid(),
    role: z.enum(["user", "assistant", "system"]),
    parts: z.array(
      z.object({
        type: z.enum(["text"]),
        text: z.string(),
      }),
    ),
    createdAt: z.string(),
    attachments: z
      .array(
        z.object({
          type: z.enum(["file"]),
          url: z.string(),
          mediaType: z.string(),
          filename: z.string(),
        }),
      )
      .nullable()
      .openapi({
        description: "Attachments for the message",
      }),
  })
  .openapi("DesignMessage");

// Inferred types
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type CreateSessionResponse = z.infer<typeof CreateSessionResponseSchema>;
export type DesignSession = z.infer<typeof DesignSessionSchema>;
export type DesignMessage = z.infer<typeof DesignMessageSchema>;
