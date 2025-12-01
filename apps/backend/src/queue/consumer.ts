import { getSandbox } from "@cloudflare/sandbox";
import {
  generateProblemText,
  generateTestCases,
  generateTestCaseInputCode,
  generateTestCaseInputs,
  generateSolution,
  generateTestCaseOutputs,
  Sandbox,
} from "@/problem-actions";
import { updateJobStatus, markStepComplete, getProblem } from "@repo/db";
import type { QueueMessage, GenerationStep } from "./types";
import { getNextStep } from "./types";
import { phClient } from "@/utils/analytics";

export async function handleQueueBatch(
  batch: MessageBatch<QueueMessage>,
  env: Env,
): Promise<void> {
  try {
    for (const message of batch.messages) {
      const { jobId, problemId, step, model, returnDummy } = message.body;

      console.log(`[Queue] Processing ${step} for problem ${problemId}`);

      try {
        // Update job status to show current step
        await updateJobStatus(jobId, "in_progress", step);

        // Execute the step
        await executeStep(step, problemId, env, model, returnDummy);

        // Mark step complete
        await markStepComplete(jobId, step);

        // Enqueue next step if exists
        const nextStep = getNextStep(step);
        if (nextStep) {
          await env.PROBLEM_GENERATION_QUEUE.send({
            jobId,
            problemId,
            step: nextStep,
            model,
            returnDummy,
          });
          console.log(`[Queue] Enqueued ${nextStep} for problem ${problemId}`);
        } else {
          // Pipeline complete
          await updateJobStatus(jobId, "completed");
          console.log(`[Queue] Pipeline complete for problem ${problemId}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[Queue] Error in ${step}: ${errorMsg}`);

        // Update job with error (will retry via Cloudflare's mechanism)
        await updateJobStatus(jobId, "failed", step, errorMsg);
        //   message.retry();
      } finally {
        message.ack();
        console.log(`[Queue] Message acknowledged for problem ${problemId}`);
      }
    }
  } finally {
    // Ensure PostHog events are flushed after batch processing
    await phClient.shutdown();
  }
}

async function executeStep(
  step: GenerationStep,
  problemId: string,
  env: Env,
  model: string,
  returnDummy?: boolean,
): Promise<void> {
  if (!model) {
    throw new Error("Model is required for generation steps");
  }

  const getSandboxInstance = (id: string): Sandbox => {
    const cloudflareSandbox = getSandbox(env.Sandbox, id);
    return new Sandbox(cloudflareSandbox);
  };

  // Fetch userId from problem for tracing
  const problem = await getProblem(problemId);
  const userId = problem.generatedByUserId || "unknown";

  switch (step) {
    case "generateProblemText":
      await generateProblemText(problemId, model, userId, false, returnDummy);
      break;
    case "generateTestCases":
      await generateTestCases(problemId, model, userId, false, returnDummy);
      break;
    case "generateTestCaseInputCode":
      await generateTestCaseInputCode(
        problemId,
        model,
        userId,
        false,
        returnDummy,
      );
      break;
    case "generateTestCaseInputs":
      await generateTestCaseInputs(
        problemId,
        getSandboxInstance(`inputs-${problemId}`),
      );
      break;
    case "generateSolution":
      await generateSolution(
        problemId,
        model,
        userId,
        true,
        false,
        returnDummy,
      );
      break;
    case "generateTestCaseOutputs":
      await generateTestCaseOutputs(
        problemId,
        getSandboxInstance(`outputs-${problemId}`),
      );
      break;
  }
}
