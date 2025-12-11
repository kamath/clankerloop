import { OpenAPIHono } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { streamDesignChat } from "@/design-actions";
import {
  chatRoute,
  createSessionRoute,
  listSessionsRoute,
  getSessionMessagesRoute,
  sessionChatRoute,
} from "./design.routes";
import type { Database } from "@repo/db";
import {
  getModelByName,
  createDesignSession,
  listDesignSessionsByUser,
  getDesignSession,
  loadDesignMessages,
  saveDesignMessages,
  updateDesignSessionTitle,
} from "@repo/db";
import { convertToModelMessages, type ModelMessage, type UIMessage } from "ai";

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

  const normalizedMessages = convertToModelMessages(
    body.messages as unknown as UIMessage[]
  );

  try {
    // Normalize messages: extract text from 'content' (string or array) or 'text' field

    const result = await streamDesignChat(
      normalizedMessages,
      modelName,
      userId,
      c.env
    );

    return result.toUIMessageStreamResponse() as any;
  } catch (error) {
    console.error("Error streaming chat:", error);
    throw new HTTPException(500, {
      message: "Failed to stream chat response",
    });
  }
});

// Create session
design.openapi(createSessionRoute, async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");

  const sessionId = await createDesignSession(userId, undefined, db);

  return c.json({ success: true as const, data: { sessionId } }, 200);
});

// List sessions
design.openapi(listSessionsRoute, async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");

  const sessions = await listDesignSessionsByUser(userId, db);

  return c.json({ success: true as const, data: sessions }, 200);
});

// Get session messages
design.openapi(getSessionMessagesRoute, async (c) => {
  const { sessionId } = c.req.valid("param");
  const userId = c.get("userId");
  const db = c.get("db");

  // Verify session belongs to user
  const session = await getDesignSession(sessionId, db);
  if (!session) {
    throw new HTTPException(404, { message: "Session not found" });
  }
  if (session.userId !== userId) {
    throw new HTTPException(403, { message: "Access denied" });
  }

  const messages = await loadDesignMessages(sessionId, db);

  return c.json({ success: true as const, data: messages }, 200);
});

// Helper function for title generation
function generateTitleFromMessage(message: ModelMessage): string {
  const content =
    typeof message.content === "string"
      ? message.content
      : JSON.stringify(message.content);

  // Simple heuristic: take first 50 chars
  const title = content.substring(0, 50).trim();
  return title.length < content.length ? `${title}...` : title;
}

// Session-specific chat (with persistence)
design.openapi(sessionChatRoute, async (c) => {
  const { sessionId } = c.req.valid("param");
  const userId = c.get("userId");
  const db = c.get("db");
  const body = c.req.valid("json");

  // Verify session ownership
  const session = await getDesignSession(sessionId, db);
  if (!session) {
    throw new HTTPException(404, { message: "Session not found" });
  }
  if (session.userId !== userId) {
    throw new HTTPException(403, { message: "Access denied" });
  }

  const modelName = body.model || "google/gemini-2.0-flash";
  const model = await getModelByName(modelName, db);
  if (!model) {
    throw new HTTPException(400, { message: `Invalid model: "${modelName}"` });
  }

  // Use messages from request (client sends full conversation)
  const allMessages = body.messages as unknown as UIMessage[];
  const normalizedMessages = convertToModelMessages(allMessages);

  const result = await streamDesignChat(
    normalizedMessages,
    modelName,
    userId,
    c.env
  );

  // Add onFinish callback for persistence
  return result.toUIMessageStreamResponse({
    async onFinish({ messages: updatedMessages }) {
      const modelMessages = convertToModelMessages(updatedMessages);
      // Save all messages (replace strategy)
      await saveDesignMessages(sessionId, modelMessages, db);

      // Auto-generate title from first assistant message if needed
      if (!session.title && modelMessages.length >= 2) {
        const firstAssistantMsg = modelMessages.find(
          (m) => m.role === "assistant"
        );
        if (firstAssistantMsg) {
          const title = generateTitleFromMessage(firstAssistantMsg);
          await updateDesignSessionTitle(sessionId, title, db);
        }
      }
    },
  }) as any;
});

export { design };
