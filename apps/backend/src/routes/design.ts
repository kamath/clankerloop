import { OpenAPIHono } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { streamDesignText } from "@/design-actions";
import { streamDesignTextRoute } from "./design.routes";
import type { Database } from "@repo/db";
import { getModelByName } from "@repo/db";

const design = new OpenAPIHono<{
	Bindings: Env;
	Variables: {
		userId: string;
		isAdmin: boolean;
		db: Database;
	};
}>();

design.openapi(
	streamDesignTextRoute,
	async (c) => {
		const userId = c.get("userId");
		const db = c.get("db");
		const body = c.req.valid("json");

		// Get model - use default if not provided
		const modelName = body.model || "openai:gpt-4";

		// Validate model exists in database
		const model = await getModelByName(modelName, db);
		if (!model) {
			throw new HTTPException(400, {
				message: `Invalid model: "${modelName}". Please use a valid model name.`,
			});
		}

		try {
			// Get streaming result from action
			const result = await streamDesignText(
				body.prompt,
				modelName,
				userId,
				c.env,
			);

			// Convert to streaming response
			return result.toTextStreamResponse() as any;
		} catch (error) {
			console.error("Error streaming design text:", error);
			throw new HTTPException(500, {
				message: "Failed to stream design text",
			});
		}
	},
);

export { design };
