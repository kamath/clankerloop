"use server";

import { initLogger, wrapAISDK } from "braintrust";
import * as ai from "ai";

if (process.env.NODE_ENV === "production") {
  initLogger({
    projectName: "ClankerLoop",
    apiKey: process.env.BRAINTRUST_API_KEY!,
  });
}
const { generateText } = wrapAISDK(ai);

export async function testTrace() {
  // This will automatically log the request, response, and metrics to Braintrust
  const { text } = await generateText({
    model: "google/gemini-2.0-flash",
    prompt: "What is the capital of France?",
  });
  console.log(text);
}
