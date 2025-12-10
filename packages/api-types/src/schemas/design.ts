import { z } from "@hono/zod-openapi";

// Request schema for streaming design text
export const StreamDesignRequestSchema = z
	.object({
		prompt: z
			.string()
			.min(1)
			.openapi({
				example: "Design a scalable REST API for a social media platform",
				description: "The prompt to generate design text for",
			}),
		model: z
			.string()
			.optional()
			.openapi({
				example: "openai:gpt-4",
				description: "Optional model to use for generation",
			}),
	})
	.openapi("StreamDesignRequest");

// Inferred types
export type StreamDesignRequest = z.infer<typeof StreamDesignRequestSchema>;
