import { OpenAPIHono } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { streamDesignChat } from "@/design-actions";
import { chatRoute } from "./design.routes";
import type { Database } from "@repo/db";
import { getModelByName } from "@repo/db";
import type { UIMessage } from "ai";

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
      c.env,
    );

    return result.toUIMessageStreamResponse() as any;
  } catch (error) {
    console.error("Error streaming chat:", error);
    throw new HTTPException(500, {
      message: "Failed to stream chat response",
    });
  }
});

export { design };
