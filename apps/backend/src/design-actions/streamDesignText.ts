import { streamText } from "ai";
import { getTracedClient } from "../utils/ai";
import { getPostHogClient } from "../utils/analytics";

export async function streamDesignText(
	prompt: string,
	model: string,
	userId: string,
	env: Env,
) {
	const requestId = `design-${userId}-${Date.now()}`;
	const tracedModel = getTracedClient(model, userId, requestId, model, env);

	const result = await streamText({
		model: tracedModel,
		prompt: prompt,
	});

	const phClient = getPostHogClient(env);
	await phClient.capture({
		distinctId: userId,
		event: "stream_design_text",
		properties: {
			userId,
			model,
			requestId,
			promptLength: prompt.length,
		},
	});

	return result;
}
