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

// Inferred types
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// Legacy: Request schema for streaming design text (kept for backwards compatibility)
export const StreamDesignRequestSchema = z
  .object({
    prompt: z.string().min(1).openapi({
      example: "Design a scalable REST API for a social media platform",
      description: "The prompt to generate design text for",
    }),
    model: z.string().optional().openapi({
      example: "openai:gpt-4",
      description: "Optional model to use for generation",
    }),
  })
  .openapi("StreamDesignRequest");

export type StreamDesignRequest = z.infer<typeof StreamDesignRequestSchema>;
