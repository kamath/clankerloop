import { streamText } from "ai";
import { getTracedClient } from "../utils/ai";
import { getPostHogClient } from "../utils/analytics";
import type { ModelMessage, TextPart, ImagePart, FilePart } from "ai";

export async function streamDesignChat(
  messages: ModelMessage[],
  model: string,
  userId: string,
  env: Env,
) {
  const requestId = `design-chat-${userId}-${Date.now()}`;
  const tracedModel = getTracedClient(model, userId, requestId, model, env);

  const result = streamText({
    model: tracedModel,
    system:
      "You are a helpful design assistant. Help users with system design, architecture diagrams, and technical design decisions.",
    messages: messages.map((m, index) => {
      if (m.role === "system" || m.role === "tool" || !Array.isArray(m.content))
        return m;

      // Don't send images from previous messages
      const isLastMessage = index === messages.length - 1;
      if (m.role === "user") {
        return {
          ...m,
          content: m.content.filter(
            (p): p is TextPart | ImagePart | FilePart =>
              p.type === "text" ||
              p.type === "image" ||
              (p.type === "file" && isLastMessage),
          ),
        };
      }
      return {
        ...m,
        content: m.content.filter(
          (p): p is TextPart | FilePart =>
            p.type === "text" || (p.type === "file" && isLastMessage),
        ),
      };
    }),
  });

  const phClient = getPostHogClient(env);
  phClient.capture({
    distinctId: userId,
    event: "stream_design_chat",
    properties: {
      userId,
      model,
      requestId,
      messageCount: messages.length,
    },
  });

  return result;
}
