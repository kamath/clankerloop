import {
  WorkflowEntrypoint,
  WorkflowStep,
  type WorkflowEvent,
} from "cloudflare:workers";
import { getSandbox } from "@cloudflare/sandbox";
import {
  generateProblemText,
  parseFunctionSignature,
  generateTestCases,
  generateTestCaseInputCode,
  generateTestCaseInputs,
  generateSolution,
  generateTestCaseOutputs,
  Sandbox,
} from "@/problem-actions";
import {
  updateJobStatus,
  markStepComplete,
  getProblem,
  createDb,
} from "@repo/db";
import { STEP_ORDER, type GenerationStep } from "../queue/types";
import { getPostHogClient } from "@/utils/analytics";

type WorkflowParams = {
  jobId: string;
  problemId: string;
  model: string;
  returnDummy?: boolean;
  startingStep?: GenerationStep; // Optional: skip steps before this one
  baseProblem?: {
    problemText: string;
    direction: "easier" | "harder" | "similar";
  }; // For difficulty adjustment or regeneration
  focusAreaGuidance?: string; // Optional: guidance for focus areas
};

export class ProblemGenerationWorkflow extends WorkflowEntrypoint<
  Env,
  WorkflowParams
> {
  async run(event: WorkflowEvent<WorkflowParams>, step: WorkflowStep) {
    const {
      jobId,
      problemId,
      model,
      returnDummy,
      startingStep,
      baseProblem,
      focusAreaGuidance,
    } = event.payload;

    // Create database instance from environment
    const db = createDb(this.env.DATABASE_URL);

    // Helper to check if step should be skipped
    const shouldRunStep = (stepName: GenerationStep) => {
      if (!startingStep) return true;
      return STEP_ORDER.indexOf(stepName) >= STEP_ORDER.indexOf(startingStep);
    };

    // Helper to get sandbox instance
    const getSandboxInstance = (id: string): Sandbox => {
      const cloudflareSandbox = getSandbox(this.env.Sandbox, id);
      return new Sandbox(cloudflareSandbox);
    };

    // Fetch userId from problem for tracing
    const problem = await getProblem(problemId, db);
    const userId = problem.generatedByUserId || "unknown";

    try {
      // Step 1: Generate Problem Text
      if (shouldRunStep("generateProblemText")) {
        await step.do("generateProblemText", async () => {
          console.log(
            `[Workflow] Processing generateProblemText for problem ${problemId}`,
          );
          await updateJobStatus(
            jobId,
            "in_progress",
            "generateProblemText",
            undefined,
            db,
          );
          await generateProblemText(
            problemId,
            model,
            userId,
            this.env,
            db,
            false,
            returnDummy,
            baseProblem,
            focusAreaGuidance,
          );
          await markStepComplete(jobId, "generateProblemText", db);
        });
      }

      // Step 2: Parse Function Signature to Schema
      if (shouldRunStep("parseFunctionSignature")) {
        await step.do("parseFunctionSignature", async () => {
          console.log(
            `[Workflow] Processing parseFunctionSignature for problem ${problemId}`,
          );
          await updateJobStatus(
            jobId,
            "in_progress",
            "parseFunctionSignature",
            undefined,
            db,
          );
          await parseFunctionSignature(
            problemId,
            model,
            userId,
            this.env,
            db,
            false,
            returnDummy,
          );
          await markStepComplete(jobId, "parseFunctionSignature", db);
        });
      }

      // Step 3: Generate Test Case Descriptions
      if (shouldRunStep("generateTestCases")) {
        await step.do("generateTestCases", async () => {
          console.log(
            `[Workflow] Processing generateTestCases for problem ${problemId}`,
          );
          await updateJobStatus(
            jobId,
            "in_progress",
            "generateTestCases",
            undefined,
            db,
          );
          await generateTestCases(
            problemId,
            model,
            userId,
            this.env,
            db,
            false,
            returnDummy,
          );
          await markStepComplete(jobId, "generateTestCases", db);
        });
      }

      // Step 4: Generate Test Case Input Code and Execute to Get Inputs
      if (shouldRunStep("generateTestCaseInputCode")) {
        await step.do("generateTestCaseInputCode", async () => {
          console.log(
            `[Workflow] Processing generateTestCaseInputCode for problem ${problemId}`,
          );
          await updateJobStatus(
            jobId,
            "in_progress",
            "generateTestCaseInputCode",
            undefined,
            db,
          );
          // Generate test case input code
          await generateTestCaseInputCode(
            problemId,
            model,
            userId,
            this.env,
            db,
            false,
            returnDummy,
          );
          // Immediately execute the generated code to get inputs
          await generateTestCaseInputs(
            problemId,
            getSandboxInstance(`inputs-${problemId}`),
            db,
          );
          await markStepComplete(jobId, "generateTestCaseInputCode", db);
        });
      }

      // Step 5: Generate Solution and Execute to Get Outputs
      if (shouldRunStep("generateSolution")) {
        await step.do("generateSolution", async () => {
          console.log(
            `[Workflow] Processing generateSolution for problem ${problemId}`,
          );
          await updateJobStatus(
            jobId,
            "in_progress",
            "generateSolution",
            undefined,
            db,
          );
          // Generate solution
          await generateSolution(
            problemId,
            model,
            userId,
            this.env,
            db,
            true,
            false,
            returnDummy,
          );
          // Immediately execute solution with test inputs to get outputs
          await generateTestCaseOutputs(
            problemId,
            getSandboxInstance(`outputs-${problemId}`),
            db,
          );
          await markStepComplete(jobId, "generateSolution", db);
        });
      }

      // Pipeline complete
      await updateJobStatus(jobId, "completed", undefined, undefined, db);
      console.log(`[Workflow] Pipeline complete for problem ${problemId}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Workflow] Error in pipeline: ${errorMsg}`);
      await updateJobStatus(jobId, "failed", undefined, errorMsg, db);
      throw error; // Re-throw to let Workflows handle retry logic
    } finally {
      // Ensure PostHog events are flushed after workflow completes
      const phClient = getPostHogClient(this.env);
      await phClient.shutdown();
    }
  }
}
