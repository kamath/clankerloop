import type { MessageBatch } from "@cloudflare/workers-types";
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
import { updateJobStatus, markStepComplete } from "@repo/db";
import type { QueueMessage, GenerationStep } from "./types";
import { getNextStep } from "./types";

export async function handleQueueBatch(
  batch: MessageBatch<QueueMessage>,
  env: Env,
): Promise<void> {
  for (const message of batch.messages) {
    const { jobId, problemId, step, model } = message.body;

    console.log(`[Queue] Processing ${step} for problem ${problemId}`);

    try {
      // Update job status to show current step
      await updateJobStatus(jobId, "in_progress", step);

      // Execute the step
      await executeStep(step, problemId, env, model);

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
        });
        console.log(`[Queue] Enqueued ${nextStep} for problem ${problemId}`);
      } else {
        // Pipeline complete
        await updateJobStatus(jobId, "completed");
        console.log(`[Queue] Pipeline complete for problem ${problemId}`);
      }

      message.ack();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Queue] Error in ${step}: ${errorMsg}`);

      // Update job with error (will retry via Cloudflare's mechanism)
      await updateJobStatus(jobId, "in_progress", step, errorMsg);
      message.retry();
    }
  }
}

async function executeStep(
  step: GenerationStep,
  problemId: string,
  env: Env,
  model: string,
): Promise<void> {
  if (!model) {
    throw new Error("Model is required for generation steps");
  }

  const getSandboxInstance = (id: string): Sandbox => {
    const cloudflareSandbox = getSandbox(env.Sandbox, id);
    return new Sandbox(cloudflareSandbox);
  };

  switch (step) {
    case "generateProblemText":
      await generateProblemText(problemId, model);
      break;
    case "generateTestCases":
      await generateTestCases(problemId, model);
      break;
    case "generateTestCaseInputCode":
      await generateTestCaseInputCode(problemId, model);
      break;
    case "generateTestCaseInputs":
      await generateTestCaseInputs(
        problemId,
        getSandboxInstance(`inputs-${problemId}`),
      );
      break;
    case "generateSolution":
      await generateSolution(problemId, model);
      break;
    case "generateTestCaseOutputs":
      await generateTestCaseOutputs(
        problemId,
        getSandboxInstance(`outputs-${problemId}`),
      );
      break;
  }
}
