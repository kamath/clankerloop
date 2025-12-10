import { OpenAPIHono } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { streamDesignText, streamDesignChat } from "@/design-actions";
import { streamDesignTextRoute, chatRoute } from "./design.routes";
import type { Database } from "@repo/db";
import { getModelByName } from "@repo/db";
import { convertToModelMessages, type UIMessage } from "ai";

const design = new OpenAPIHono<{
  Bindings: Env;
  Variables: {
    userId: string;
    isAdmin: boolean;
    db: Database;
  };
}>();

// Error handler for design routes to log validation errors
design.onError((err, c) => {
  console.error("Design route error:", err);
  console.error("Error details:", {
    message: err.message,
    status: "status" in err ? err.status : undefined,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
  });

  // Re-throw to let global error handler handle it
  throw err;
});

design.openapi(streamDesignTextRoute, async (c) => {
  console.log("MADE IT HERE - Request path:", c.req.path);
  const userId = c.get("userId");
  const db = c.get("db");

  let body;
  try {
    body = c.req.valid("json");
  } catch (error) {
    console.error("Validation error:", error);
    throw error;
  }

  // Get model - use default if not provided
  const modelName = body.model || "google/gemini-2.0-flash";

  // Validate model exists in database
  const model = await getModelByName(modelName, db);
  console.log("model", model);
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
      c.env
    );

    // Convert to streaming response
    return result.toTextStreamResponse() as any;
  } catch (error) {
    console.error("Error streaming design text:", error);
    throw new HTTPException(500, {
      message: "Failed to stream design text",
    });
  }
});

design.openapi(chatRoute, async (c) => {
  console.log("MADE IT HERE - Chat route - Request path:", c.req.path);

  const userId = c.get("userId");
  const db = c.get("db");

  let body;
  try {
    body = c.req.valid("json");
    console.log("Validated body:", JSON.stringify(body, null, 2));
  } catch (error) {
    console.error("Validation error:", error);
    throw error;
  }

  const modelName = body.model || "google/gemini-2.0-flash";

  const model = await getModelByName(modelName, db);
  if (!model) {
    throw new HTTPException(400, {
      message: `Invalid model: "${modelName}"`,
    });
  }

  try {
    // Normalize messages: extract text from 'content' (string or array) or 'text' field

    const result = await streamDesignChat(
      body.messages as unknown as UIMessage[],
      modelName,
      userId,
      c.env
    );

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Error streaming chat:", error);
    throw new HTTPException(500, {
      message: "Failed to stream chat response",
    });
  }
});

export { design };
