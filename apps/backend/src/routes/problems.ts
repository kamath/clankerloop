import { OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import {
  generateProblemText,
  getProblemText,
  generateTestCases,
  getTestCases,
  generateTestCaseInputCode,
  getTestCaseInputCode,
  generateTestCaseInputs,
  getTestCaseInputs,
  generateSolution,
  getSolution,
  generateTestCaseOutputs,
  getTestCaseOutputs,
  runUserSolution,
} from "@/problem-actions";
import { getSandbox } from "@cloudflare/sandbox";
import { Sandbox } from "@/problem-actions";
import {
  createProblem,
  createGenerationJob,
  getLatestJobForProblem,
  createModel,
  getModelByName,
  listModels,
  updateProblem,
  getProblem,
} from "@repo/db";
import { getNextStep, STEP_ORDER, type GenerationStep } from "../queue/types";
import {
  listModelsRoute,
  createModelRoute,
  createProblemRoute,
  generateProblemTextRoute,
  getProblemTextRoute,
  generateTestCasesRoute,
  getTestCasesRoute,
  generateInputCodeRoute,
  getInputCodeRoute,
  generateInputsRoute,
  getInputsRoute,
  generateSolutionRoute,
  getSolutionRoute,
  runSolutionRoute,
  generateOutputsRoute,
  getOutputsRoute,
  getGenerationStatusRoute,
} from "./problems.routes";

const problems = new OpenAPIHono<{
  Bindings: Env;
  Variables: {
    userId: string;
  };
}>();

const getSandboxInstance = (env: Env, sandboxId: string): Sandbox => {
  const cloudflareSandbox = getSandbox(env.Sandbox, sandboxId);
  return new Sandbox(cloudflareSandbox);
};

// Helper to get or create model
async function getOrCreateModel(modelName: string): Promise<string> {
  const model = await getModelByName(modelName);
  if (!model) {
    const modelId = await createModel(modelName);
    return modelId;
  }
  return model.id;
}

// Helper to enqueue first step if autoGenerate is enabled (for problem creation)
async function enqueueFirstStepIfAuto(
  c: Context<{ Bindings: Env; Variables: { userId: string } }>,
  problemId: string,
  model?: string,
  autoGenerate: boolean = true,
): Promise<string | null> {
  if (!autoGenerate) return null;

  // Create job
  const modelId = model ? await getOrCreateModel(model) : undefined;
  const jobId = await createGenerationJob(problemId, modelId);

  // Enqueue the first step: generateProblemText
  const firstStep = STEP_ORDER[0];
  if (firstStep) {
    await c.env.PROBLEM_GENERATION_QUEUE.send({
      jobId,
      problemId,
      step: firstStep,
      model,
    });
  }

  return jobId;
}

// Helper to enqueue next step if enqueueNextStep is enabled
async function enqueueNextStepIfEnabled(
  c: Context<{ Bindings: Env; Variables: { userId: string } }>,
  problemId: string,
  currentStep: GenerationStep,
  model?: string,
  enqueueNextStep: boolean = true,
): Promise<string | null> {
  if (!enqueueNextStep) return null;

  // Get or create job
  let job = await getLatestJobForProblem(problemId);
  if (!job || job.status === "completed" || job.status === "failed") {
    const modelId = model ? await getOrCreateModel(model) : undefined;
    const jobId = await createGenerationJob(problemId, modelId);
    job = {
      id: jobId,
      problemId,
      modelId: modelId ?? null,
      status: "pending",
      completedSteps: [],
      currentStep: null,
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  const nextStep = getNextStep(currentStep);
  if (nextStep) {
    await c.env.PROBLEM_GENERATION_QUEUE.send({
      jobId: job.id,
      problemId,
      step: nextStep,
      model,
    });
  }

  return job.id;
}

// ============== Models Routes ==============

problems.openapi(listModelsRoute, async (c) => {
  const models = await listModels();
  return c.json({ success: true as const, data: models }, 200);
});

problems.openapi(createModelRoute, async (c) => {
  const body = c.req.valid("json");

  try {
    await createModel(body.name);
    const model = await getModelByName(body.name);
    return c.json({ success: true as const, data: model! }, 200);
  } catch {
    return c.json(
      {
        success: false as const,
        error: {
          code: "DUPLICATE_ERROR",
          message: "Model with this name already exists",
        },
      },
      409,
    );
  }
});

// ============== Problem Routes ==============

problems.openapi(createProblemRoute, async (c) => {
  const userId = c.get("userId");
  if (!userId || typeof userId !== "string") {
    return c.json(
      {
        success: false as const,
        error: { code: "AUTH_ERROR", message: "User ID not found in context" },
      },
      500,
    );
  }

  const body = c.req.valid("json");
  const query = c.req.valid("query");

  const problemId = await createProblem({ generatedByUserId: userId });

  // Get or create model and update problem
  const modelId = await getOrCreateModel(body.model);
  await updateProblem(problemId, { generatedByModelId: modelId });

  const autoGenerate = query.autoGenerate !== "false";
  const jobId = await enqueueFirstStepIfAuto(
    c,
    problemId,
    body.model,
    autoGenerate,
  );

  return c.json({ success: true as const, data: { problemId, jobId } }, 200);
});

// ============== Problem Text Routes ==============

problems.openapi(generateProblemTextRoute, async (c) => {
  const { problemId } = c.req.valid("param");
  const body = c.req.valid("json");

  // Update problem with model if not set
  const problem = await getProblem(problemId);
  if (!problem.generatedByModelId) {
    const modelId = await getOrCreateModel(body.model);
    await updateProblem(problemId, { generatedByModelId: modelId });
  }

  const result = await generateProblemText(problemId, body.model);

  const enqueueNext = body.enqueueNextStep !== false;
  const jobId = await enqueueNextStepIfEnabled(
    c,
    problemId,
    "generateProblemText",
    body.model,
    enqueueNext,
  );

  return c.json({ success: true as const, data: { ...result, jobId } }, 200);
});

problems.openapi(getProblemTextRoute, async (c) => {
  const { problemId } = c.req.valid("param");
  const result = await getProblemText(problemId);
  return c.json({ success: true as const, data: result }, 200);
});

// ============== Test Cases Routes ==============

problems.openapi(generateTestCasesRoute, async (c) => {
  const { problemId } = c.req.valid("param");
  const body = c.req.valid("json");

  // Update problem with model if not set
  const problem = await getProblem(problemId);
  if (!problem.generatedByModelId) {
    const modelId = await getOrCreateModel(body.model);
    await updateProblem(problemId, { generatedByModelId: modelId });
  }

  const result = await generateTestCases(problemId, body.model);

  const enqueueNext = body.enqueueNextStep !== false;
  const jobId = await enqueueNextStepIfEnabled(
    c,
    problemId,
    "generateTestCases",
    body.model,
    enqueueNext,
  );

  return c.json(
    { success: true as const, data: { testCases: result, jobId } },
    200,
  );
});

problems.openapi(getTestCasesRoute, async (c) => {
  const { problemId } = c.req.valid("param");
  const result = await getTestCases(problemId);
  return c.json({ success: true as const, data: result }, 200);
});

// ============== Test Case Input Code Routes ==============

problems.openapi(generateInputCodeRoute, async (c) => {
  const { problemId } = c.req.valid("param");
  const body = c.req.valid("json");

  // Update problem with model if not set
  const problem = await getProblem(problemId);
  if (!problem.generatedByModelId) {
    const modelId = await getOrCreateModel(body.model);
    await updateProblem(problemId, { generatedByModelId: modelId });
  }

  const result = await generateTestCaseInputCode(problemId, body.model);

  const enqueueNext = body.enqueueNextStep !== false;
  const jobId = await enqueueNextStepIfEnabled(
    c,
    problemId,
    "generateTestCaseInputCode",
    body.model,
    enqueueNext,
  );

  return c.json(
    { success: true as const, data: { inputCodes: result, jobId } },
    200,
  );
});

problems.openapi(getInputCodeRoute, async (c) => {
  const { problemId } = c.req.valid("param");
  const result = await getTestCaseInputCode(problemId);
  return c.json({ success: true as const, data: result }, 200);
});

// ============== Test Case Inputs Routes ==============

problems.openapi(generateInputsRoute, async (c) => {
  const { problemId } = c.req.valid("param");
  const body = c.req.valid("json");

  const sandboxId = `test-inputs-${problemId}`;
  const sandbox = getSandboxInstance(c.env, sandboxId);
  const result = await generateTestCaseInputs(problemId, sandbox);

  const enqueueNext = body?.enqueueNextStep !== false;
  const jobId = await enqueueNextStepIfEnabled(
    c,
    problemId,
    "generateTestCaseInputs",
    body?.model,
    enqueueNext,
  );

  return c.json(
    { success: true as const, data: { testCases: result, jobId } },
    200,
  );
});

problems.openapi(getInputsRoute, async (c) => {
  const { problemId } = c.req.valid("param");
  const result = await getTestCaseInputs(problemId);
  return c.json({ success: true as const, data: result }, 200);
});

// ============== Solution Routes ==============

problems.openapi(generateSolutionRoute, async (c) => {
  const { problemId } = c.req.valid("param");
  const body = c.req.valid("json");

  // Update problem with model if not set
  const problem = await getProblem(problemId);
  if (!problem.generatedByModelId) {
    const modelId = await getOrCreateModel(body.model);
    await updateProblem(problemId, { generatedByModelId: modelId });
  }

  const updateProblemInDb = body.updateProblem !== false;
  const result = await generateSolution(
    problemId,
    body.model,
    updateProblemInDb,
  );

  const enqueueNext = body.enqueueNextStep !== false;
  const jobId = await enqueueNextStepIfEnabled(
    c,
    problemId,
    "generateSolution",
    body.model,
    enqueueNext,
  );

  return c.json(
    { success: true as const, data: { solution: result, jobId } },
    200,
  );
});

problems.openapi(getSolutionRoute, async (c) => {
  const { problemId } = c.req.valid("param");
  const result = await getSolution(problemId);
  return c.json({ success: true as const, data: { solution: result } }, 200);
});

problems.openapi(runSolutionRoute, async (c) => {
  const { problemId } = c.req.valid("param");
  const body = c.req.valid("json");

  const sandboxId = `solution-run-${problemId}`;
  const sandbox = getSandboxInstance(c.env, sandboxId);
  const result = await runUserSolution(problemId, body.code, sandbox);
  return c.json({ success: true as const, data: result }, 200);
});

// ============== Test Outputs Routes ==============

problems.openapi(generateOutputsRoute, async (c) => {
  const { problemId } = c.req.valid("param");
  const body = c.req.valid("json");

  const sandboxId = `test-outputs-${problemId}`;
  const sandbox = getSandboxInstance(c.env, sandboxId);
  const result = await generateTestCaseOutputs(problemId, sandbox);

  const enqueueNext = body?.enqueueNextStep !== false;
  const jobId = await enqueueNextStepIfEnabled(
    c,
    problemId,
    "generateTestCaseOutputs",
    body?.model,
    enqueueNext,
  );

  return c.json(
    { success: true as const, data: { testCases: result, jobId } },
    200,
  );
});

problems.openapi(getOutputsRoute, async (c) => {
  const { problemId } = c.req.valid("param");
  const result = await getTestCaseOutputs(problemId);
  return c.json({ success: true as const, data: result }, 200);
});

// ============== Generation Status Route ==============

problems.openapi(getGenerationStatusRoute, async (c) => {
  const { problemId } = c.req.valid("param");
  const job = await getLatestJobForProblem(problemId);

  if (!job) {
    return c.json(
      {
        success: true as const,
        data: { status: "none" as const },
      },
      200,
    );
  }

  const totalSteps = STEP_ORDER.length;
  const completedCount = job.completedSteps?.length || 0;

  return c.json(
    {
      success: true as const,
      data: {
        jobId: job.id,
        status: job.status,
        currentStep: job.currentStep as GenerationStep | null,
        completedSteps: job.completedSteps as GenerationStep[],
        progress: {
          completed: completedCount,
          total: totalSteps,
          percent: Math.round((completedCount / totalSteps) * 100),
        },
        error: job.error ?? undefined,
      },
    },
    200,
  );
});

export { problems };
