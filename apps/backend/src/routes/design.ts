import { OpenAPIHono } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { streamDesignChat, createUploadBase64Image } from "@/design-actions";
import {
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
import {
  convertToModelMessages,
  createIdGenerator,
  type ModelMessage,
} from "ai";

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

  const messages = await loadDesignMessages(sessionId, db, c.env.R2_BASE_URL);
  console.log("Loaded messages:", JSON.stringify(messages, null, 2));

  // Filter out tool messages and transform parts to match schema
  const transformedMessages = messages
    .filter((msg) => msg.role !== "tool")
    .map((msg) => ({
      id: msg.id,
      role: msg.role as "user" | "assistant" | "system",
      parts: msg.parts
        .filter(
          (
            part
          ): part is
            | { type: "text"; text: string }
            | {
                type: "file";
                url: string;
                mediaType: string;
                filename: string;
              } => part.type === "text" || part.type === "file"
        )
        .map((part) => {
          if (part.type === "text") {
            return { type: "text" as const, text: part.text };
          }
          return {
            type: "file" as const,
            url: part.url,
            mediaType: part.mediaType,
            filename: part.filename,
          };
        }),
      createdAt: msg.createdAt,
    }));

  return c.json(
    {
      success: true as const,
      data: transformedMessages,
    },
    200
  );
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
  // The validated body.messages conforms to ChatMessageSchema which uses .passthrough()
  // Cast is needed because Zod's permissive schema doesn't match AI SDK's strict UIMessage type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allMessages = body.messages as any;
  const normalizedMessages = convertToModelMessages(allMessages);

  // Create R2 upload function for base64 images
  const uploadBase64Image = createUploadBase64Image(c.env.clankerrank);

  await saveDesignMessages(
    sessionId,
    normalizedMessages.map((m, index) => ({
      ...m,
      id: allMessages[index]?.id ?? crypto.randomUUID(),
    })),
    uploadBase64Image,
    db
  );

  const result = await streamDesignChat(
    normalizedMessages,
    modelName,
    userId,
    c.env
  );

  // Add onFinish callback to save both user and assistant messages
  const response = result.toUIMessageStreamResponse({
    generateMessageId: createIdGenerator({
      prefix: "design-message-",
      size: 16,
    }),
    async onFinish({ messages: updatedMessages }) {
      const modelMessages = convertToModelMessages(updatedMessages);

      // Save all messages (append-only will save any new user + assistant messages)
      await saveDesignMessages(
        sessionId,
        modelMessages.map((m, index) => ({
          ...m,
          id: updatedMessages[index].id,
        })),
        uploadBase64Image,
        db
      );

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
  });

  // OpenAPIHono doesn't properly type streaming responses
  // The toUIMessageStreamResponse returns a Response object which is correct for streaming
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return response as any;
});

export { design };
