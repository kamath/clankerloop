import { createRoute } from "@hono/zod-openapi";
import {
	ApiErrorSchema,
	StreamDesignRequestSchema,
	ChatRequestSchema,
} from "@repo/api-types";
import { z } from "@hono/zod-openapi";

export const streamDesignTextRoute = createRoute({
	method: "post",
	path: "/stream",
	tags: ["Design"],
	summary: "Stream design text",
	description:
		"Streams AI-generated design text based on a prompt using streamText",
	request: {
		body: {
			content: {
				"application/json": {
					schema: StreamDesignRequestSchema,
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
						description: "Streaming text response",
					}),
				},
			},
			description: "Design text streamed successfully",
		},
		400: {
			content: {
				"application/json": {
					schema: ApiErrorSchema,
				},
			},
			description: "Invalid request",
		},
		401: {
			content: {
				"application/json": {
					schema: ApiErrorSchema,
				},
			},
			description: "Unauthorized",
		},
		500: {
			content: {
				"application/json": {
					schema: ApiErrorSchema,
				},
			},
			description: "Internal server error",
		},
	},
	security: [{ ApiKeyAuth: [] }],
});

export const chatRoute = createRoute({
	method: "post",
	path: "/chat",
	tags: ["Design"],
	summary: "Chat with AI for design assistance",
	description:
		"Streams AI responses in chat format compatible with AI SDK UI",
	request: {
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
		400: {
			content: {
				"application/json": {
					schema: ApiErrorSchema,
				},
			},
			description: "Invalid request",
		},
		401: {
			content: {
				"application/json": {
					schema: ApiErrorSchema,
				},
			},
			description: "Unauthorized",
		},
		500: {
			content: {
				"application/json": {
					schema: ApiErrorSchema,
				},
			},
			description: "Internal server error",
		},
	},
	security: [{ ApiKeyAuth: [] }],
});
