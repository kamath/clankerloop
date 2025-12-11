import { streamText } from "ai";
import { getTracedClient } from "../utils/ai";
import { getPostHogClient } from "../utils/analytics";
import type { ModelMessage } from "ai";

export async function streamDesignChat(
  messages: ModelMessage[],
  model: string,
  userId: string,
  env: Env
) {
  const requestId = `design-chat-${userId}-${Date.now()}`;
  const tracedModel = getTracedClient(model, userId, requestId, model, env);

  const result = streamText({
    model: tracedModel,
    system:
      "You are a helpful design assistant. Help users with system design, architecture diagrams, and technical design decisions.",
    messages,
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
