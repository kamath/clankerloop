import { OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import {
  generateProblemText,
  getProblemText,
  parseFunctionSignature,
  getFunctionSignatureSchema,
  createCodeGenerator,
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
  runUserSolutionWithCustomInputs,
  CodeGenLanguageSchema,
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
  getModelForProblem,
  updateJobStatus,
  markStepComplete,
} from "@repo/db";
import { STEP_ORDER, type GenerationStep } from "../queue/types";
import {
  listModelsRoute,
  createModelRoute,
  createProblemRoute,
  generateProblemTextRoute,
  getProblemTextRoute,
  parseFunctionSignatureRoute,
  getFunctionSignatureSchemaRoute,
  getStarterCodeRoute,
  generateTestCasesRoute,
  getTestCasesRoute,
  generateInputCodeRoute,
  getInputCodeRoute,
  generateInputsRoute,
  getInputsRoute,
  generateSolutionRoute,
  getSolutionRoute,
  runSolutionRoute,
  runCustomTestsRoute,
  generateOutputsRoute,
  getOutputsRoute,
  getGenerationStatusRoute,
  getWorkflowStatusRoute,
  getProblemModelRoute,
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

// Helper to check if a generate step should be idempotent (return 409)
async function shouldReturnIdempotentError(
  problemId: string,
  step: GenerationStep,
  dataExists: boolean,
): Promise<boolean> {
  // If data doesn't exist, allow generation
  if (!dataExists) {
    return false;
  }

  // Get the latest job for the problem
  const job = await getLatestJobForProblem(problemId);
  if (!job) {
    // No job exists, but data exists - allow regeneration
    return false;
  }

  // Check if step is completed successfully (in completedSteps and job not failed)
  const isCompleted =
    job.completedSteps?.includes(step) && job.status !== "failed";

  // Check if step is currently in progress
  const isInProgress =
    job.currentStep === step &&
    (job.status === "in_progress" || job.status === "pending");

  // Return true if step is completed or in progress
  return isCompleted || isInProgress;
}

// Helper to start workflow if autoGenerate is enabled (for problem creation)
async function startWorkflowIfAuto(
  c: Context<{ Bindings: Env; Variables: { userId: string } }>,
  problemId: string,
  model?: string,
  autoGenerate: boolean = true,
  returnDummy?: boolean,
  baseProblem?: { problemText: string; direction: "easier" | "harder" },
): Promise<string | null> {
  if (!autoGenerate) return null;

  // Create job
  const modelId = model ? await getOrCreateModel(model) : undefined;
  const jobId = await createGenerationJob(problemId, modelId);

  // Start the workflow
  await c.env.PROBLEM_GENERATION_WORKFLOW.create({
    id: jobId,
    params: {
      jobId,
      problemId,
      model: model || "",
      returnDummy,
      baseProblem,
    },
  });

  return jobId;
}

// Helper to start workflow from a specific step if enqueueNextStep is enabled
async function startWorkflowFromStepIfEnabled(
  c: Context<{ Bindings: Env; Variables: { userId: string } }>,
  problemId: string,
  currentStep: GenerationStep,
  model?: string,
  enqueueNextStep: boolean = true,
  returnDummy?: boolean,
): Promise<string | null> {
  if (!enqueueNextStep) return null;

  // Get the next step index
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  const nextIndex = currentIndex + 1;

  // If there's no next step, return null
  if (nextIndex >= STEP_ORDER.length) return null;

  const nextStep = STEP_ORDER[nextIndex];

  // Get or create job
  let job = await getLatestJobForProblem(problemId);
  if (!job || job.status === "completed") {
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
  } else if (job.status === "failed") {
    // Reset failed job to pending since current step succeeded
    await updateJobStatus(job.id, "pending", undefined, undefined);
    // Mark the current step as complete since it succeeded
    await markStepComplete(job.id, currentStep);
  }

  // Start workflow from the next step
  await c.env.PROBLEM_GENERATION_WORKFLOW.create({
    id: job.id,
    params: {
      jobId: job.id,
      problemId,
      model: model || "",
      returnDummy,
      startingStep: nextStep,
    },
  });

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

  // Handle difficulty adjustment if startFrom is provided
  let baseProblem:
    | { problemText: string; direction: "easier" | "harder" }
    | undefined;
  const problemCreateData: {
    generatedByUserId: string;
    easierThan?: string;
    harderThan?: string;
  } = {
    generatedByUserId: userId,
  };

  if (body.startFrom) {
    // Fetch the original problem to get its text
    const originalProblem = await getProblem(body.startFrom.problemId);
    baseProblem = {
      problemText: originalProblem.problemText,
      direction: body.startFrom.direction,
    };

    // Set the FK based on direction
    if (body.startFrom.direction === "harder") {
      // New problem is harder, so the original is easier
      problemCreateData.easierThan = body.startFrom.problemId;
    } else {
      // New problem is easier, so the original is harder
      problemCreateData.harderThan = body.startFrom.problemId;
    }
  }

  const problemId = await createProblem(problemCreateData);

  // Get or create model and update problem
  const modelId = await getOrCreateModel(body.model);
  await updateProblem(problemId, { generatedByModelId: modelId });

  const autoGenerate = query.autoGenerate !== "false";
  const jobId = await startWorkflowIfAuto(
    c,
    problemId,
    body.model,
    autoGenerate,
    body.returnDummy,
    baseProblem,
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

  // Check idempotency: if data exists and step completed/in progress, return 409
  const dataExists =
    problem.problemText &&
    problem.functionSignature &&
    problem.problemText.trim() !== "" &&
    problem.functionSignature.trim() !== "";
  if (
    await shouldReturnIdempotentError(
      problemId,
      "generateProblemText",
      dataExists ? true : false, // Cast as boolean since operation can return string
    )
  ) {
    return c.json(
      {
        success: false as const,
        error: {
          code: "IDEMPOTENT_ERROR",
          message:
            "Problem text already exists and generation step has completed or is in progress",
        },
      },
      409,
    );
  }

  const userId = problem.generatedByUserId || "unknown";
  const result = await generateProblemText(
    problemId,
    body.model,
    userId,
    c.env,
    body.forceError,
    body.returnDummy,
  );

  const enqueueNext = body.enqueueNextStep !== false;
  const jobId = await startWorkflowFromStepIfEnabled(
    c,
    problemId,
    "generateProblemText",
    body.model,
    enqueueNext,
    body.returnDummy,
  );

  return c.json({ success: true as const, data: { ...result, jobId } }, 200);
});

problems.openapi(getProblemTextRoute, async (c) => {
  const { problemId } = c.req.valid("param");
  const result = await getProblemText(problemId);
  return c.json({ success: true as const, data: result }, 200);
});

// ============== Function Signature Schema Routes ==============

problems.openapi(parseFunctionSignatureRoute, async (c) => {
  const { problemId } = c.req.valid("param");
  const body = c.req.valid("json");

  // Validate prerequisite: problem text must exist
  const problem = await getProblem(problemId);
  if (
    !problem.problemText ||
    !problem.functionSignature ||
    problem.problemText.trim() === "" ||
    problem.functionSignature.trim() === ""
  ) {
    return c.json(
      {
        success: false as const,
        error: {
          code: "PREREQUISITE_ERROR",
          message:
            "Problem text must be generated before function signature can be parsed",
        },
      },
      400,
    );
  }

  // Check idempotency: if schema already exists and step completed/in progress, return 409
  const dataExists = problem.functionSignatureSchema !== null;
  if (
    await shouldReturnIdempotentError(
      problemId,
      "parseFunctionSignature",
      dataExists,
    )
  ) {
    return c.json(
      {
        success: false as const,
        error: {
          code: "IDEMPOTENT_ERROR",
          message:
            "Function signature schema already exists and parsing step has completed or is in progress",
        },
      },
      409,
    );
  }

  const userId = problem.generatedByUserId || "unknown";
  const result = await parseFunctionSignature(
    problemId,
    body.model,
    userId,
    c.env,
    body.forceError,
    body.returnDummy,
  );

  const enqueueNext = body.enqueueNextStep !== false;
  const jobId = await startWorkflowFromStepIfEnabled(
    c,
    problemId,
    "parseFunctionSignature",
    body.model,
    enqueueNext,
    body.returnDummy,
  );

  return c.json(
    {
      success: true as const,
      data: { functionSignatureSchema: result, jobId },
    },
    200,
  );
});

problems.openapi(getFunctionSignatureSchemaRoute, async (c) => {
  const { problemId } = c.req.valid("param");
  const result = await getFunctionSignatureSchema(problemId);
  return c.json(
    { success: true as const, data: { functionSignatureSchema: result } },
    200,
  );
});

problems.openapi(getStarterCodeRoute, async (c) => {
  const { problemId } = c.req.valid("param");
  const { language } = c.req.valid("query");

  const schema = await getFunctionSignatureSchema(problemId);
  if (!schema) {
    return c.json(
      {
        success: false as const,
        error: {
          code: "PREREQUISITE_ERROR",
          message:
            "Function signature schema must be parsed before starter code can be generated",
        },
      },
      400,
    );
  }

  const generator = createCodeGenerator(language);
  const starterCode = generator.generateStarterCode(schema);

  return c.json(
    { success: true as const, data: { starterCode, language } },
    200,
  );
});

// ============== Test Cases Routes ==============

problems.openapi(generateTestCasesRoute, async (c) => {
  const { problemId } = c.req.valid("param");
  const body = c.req.valid("json");

  // Validate prerequisite: problem text must exist
  const problem = await getProblem(problemId);
  if (
    !problem.problemText ||
    !problem.functionSignature ||
    problem.problemText.trim() === "" ||
    problem.functionSignature.trim() === ""
  ) {
    return c.json(
      {
        success: false as const,
        error: {
          code: "PREREQUISITE_ERROR",
          message:
            "Problem text must be generated before test cases can be created",
        },
      },
      400,
    );
  }

  // Check idempotency: if data exists and step completed/in progress, return 409
  const dataExists = problem.testCases && problem.testCases.length > 0;
  if (
    await shouldReturnIdempotentError(
      problemId,
      "generateTestCases",
      dataExists,
    )
  ) {
    return c.json(
      {
        success: false as const,
        error: {
          code: "IDEMPOTENT_ERROR",
          message:
            "Test cases already exist and generation step has completed or is in progress",
        },
      },
      409,
    );
  }

  // Update problem with model if not set
  if (!problem.generatedByModelId) {
    const modelId = await getOrCreateModel(body.model);
    await updateProblem(problemId, { generatedByModelId: modelId });
  }

  const userId = problem.generatedByUserId || "unknown";
  const result = await generateTestCases(
    problemId,
    body.model,
    userId,
    c.env,
    body.forceError,
    body.returnDummy,
  );

  const enqueueNext = body.enqueueNextStep !== false;
  const jobId = await startWorkflowFromStepIfEnabled(
    c,
    problemId,
    "generateTestCases",
    body.model,
    enqueueNext,
    body.returnDummy,
  );

  return c.json(
    { success: true as const, data: { testCases: result, jobId } },
    200,
  );
});

problems.openapi(getTestCasesRoute, async (c) => {
  const { problemId } = c.req.valid("param");

  // Validate prerequisite: problem text must exist
  const problem = await getProblem(problemId);
  if (
    !problem.problemText ||
    !problem.functionSignature ||
    problem.problemText.trim() === "" ||
    problem.functionSignature.trim() === ""
  ) {
    return c.json(
      {
        success: false as const,
        error: {
          code: "PREREQUISITE_ERROR",
          message:
            "Problem text must be generated before test cases can be retrieved",
        },
      },
      400,
    );
  }

  const result = await getTestCases(problemId);
  return c.json({ success: true as const, data: result }, 200);
});

// ============== Test Case Input Code Routes ==============

problems.openapi(generateInputCodeRoute, async (c) => {
  const { problemId } = c.req.valid("param");
  const body = c.req.valid("json");

  // Validate prerequisite: test cases must exist
  const problem = await getProblem(problemId);
  if (!problem.testCases || problem.testCases.length === 0) {
    return c.json(
      {
        success: false as const,
        error: {
          code: "PREREQUISITE_ERROR",
          message:
            "Test case descriptions must be generated before input code can be created",
        },
      },
      400,
    );
  }

  // Check idempotency: if data exists and step completed/in progress, return 409
  // Now checking for both inputCode AND inputs since we combine operations
  const dataExists = problem.testCases.every(
    (tc) =>
      tc.inputCode &&
      tc.inputCode.trim() !== "" &&
      tc.input !== null &&
      tc.input !== undefined,
  );
  if (
    await shouldReturnIdempotentError(
      problemId,
      "generateTestCaseInputCode",
      dataExists,
    )
  ) {
    return c.json(
      {
        success: false as const,
        error: {
          code: "IDEMPOTENT_ERROR",
          message:
            "Test case input code and inputs already exist and generation step has completed or is in progress",
        },
      },
      409,
    );
  }

  // Update problem with model if not set
  if (!problem.generatedByModelId) {
    const modelId = await getOrCreateModel(body.model);
    await updateProblem(problemId, { generatedByModelId: modelId });
  }

  const userId = problem.generatedByUserId || "unknown";

  // Generate test case input code
  const inputCodesResult = await generateTestCaseInputCode(
    problemId,
    body.model,
    userId,
    c.env,
    body.forceError,
    body.returnDummy,
  );

  // Immediately execute the generated code to get inputs
  const sandboxId = `test-inputs-${problemId}`;
  const sandbox = getSandboxInstance(c.env, sandboxId);
  const testCasesResult = await generateTestCaseInputs(problemId, sandbox);

  const enqueueNext = body.enqueueNextStep !== false;
  const jobId = await startWorkflowFromStepIfEnabled(
    c,
    problemId,
    "generateTestCaseInputCode",
    body.model,
    enqueueNext,
    body.returnDummy,
  );

  return c.json(
    {
      success: true as const,
      data: { inputCodes: inputCodesResult, testCases: testCasesResult, jobId },
    },
    200,
  );
});

problems.openapi(getInputCodeRoute, async (c) => {
  const { problemId } = c.req.valid("param");

  // Validate prerequisite: test cases must exist
  const problem = await getProblem(problemId);
  if (!problem.testCases || problem.testCases.length === 0) {
    return c.json(
      {
        success: false as const,
        error: {
          code: "PREREQUISITE_ERROR",
          message:
            "Test case descriptions must be generated before input code can be retrieved",
        },
      },
      400,
    );
  }

  const result = await getTestCaseInputCode(problemId);
  return c.json({ success: true as const, data: result }, 200);
});

// ============== Test Case Inputs Routes ==============

problems.openapi(generateInputsRoute, async (c) => {
  const { problemId } = c.req.valid("param");
  const body = c.req.valid("json");

  // Validate prerequisite: all test cases must have inputCode
  const problem = await getProblem(problemId);
  if (
    !problem.testCases ||
    problem.testCases.length === 0 ||
    !problem.testCases.every((tc) => tc.inputCode && tc.inputCode.trim() !== "")
  ) {
    return c.json(
      {
        success: false as const,
        error: {
          code: "PREREQUISITE_ERROR",
          message:
            "Test case input code must be generated before test inputs can be created",
        },
      },
      400,
    );
  }

  // Check idempotency: if data exists and step completed/in progress, return 409
  const dataExists = problem.testCases.every(
    (tc) => tc.input !== null && tc.input !== undefined,
  );
  if (
    await shouldReturnIdempotentError(
      problemId,
      "generateTestCaseInputCode",
      dataExists,
    )
  ) {
    return c.json(
      {
        success: false as const,
        error: {
          code: "IDEMPOTENT_ERROR",
          message:
            "Test case inputs already exist and generation step has completed or is in progress",
        },
      },
      409,
    );
  }

  const sandboxId = `test-inputs-${problemId}`;
  const sandbox = getSandboxInstance(c.env, sandboxId);
  const result = await generateTestCaseInputs(problemId, sandbox);

  const enqueueNext = body?.enqueueNextStep !== false;
  const jobId = await startWorkflowFromStepIfEnabled(
    c,
    problemId,
    "generateTestCaseInputCode",
    body?.model,
    enqueueNext,
    undefined,
  );

  return c.json(
    { success: true as const, data: { testCases: result, jobId } },
    200,
  );
});

problems.openapi(getInputsRoute, async (c) => {
  const { problemId } = c.req.valid("param");

  // Validate prerequisite: all test cases must have inputCode
  const problem = await getProblem(problemId);
  if (
    !problem.testCases ||
    problem.testCases.length === 0 ||
    !problem.testCases.every((tc) => tc.inputCode && tc.inputCode.trim() !== "")
  ) {
    return c.json(
      {
        success: false as const,
        error: {
          code: "PREREQUISITE_ERROR",
          message:
            "Test case input code must be generated before test inputs can be retrieved",
        },
      },
      400,
    );
  }

  const result = await getTestCaseInputs(problemId);
  return c.json({ success: true as const, data: result }, 200);
});

// ============== Solution Routes ==============

problems.openapi(generateSolutionRoute, async (c) => {
  const { problemId } = c.req.valid("param");
  const body = c.req.valid("json");

  // Validate prerequisite: all test cases must have input field populated
  const problem = await getProblem(problemId);
  if (
    !problem.testCases ||
    problem.testCases.length === 0 ||
    !problem.testCases.every(
      (tc) => tc.input !== null && tc.input !== undefined,
    )
  ) {
    return c.json(
      {
        success: false as const,
        error: {
          code: "PREREQUISITE_ERROR",
          message:
            "Test case inputs must be generated before solution can be created",
        },
      },
      400,
    );
  }

  // Check idempotency: if data exists and step completed/in progress, return 409
  // Now checking for both solution AND outputs since we combine operations
  const dataExists =
    problem.solution &&
    problem.solution.trim() !== "" &&
    problem.testCases &&
    problem.testCases.length > 0 &&
    problem.testCases.every(
      (tc) => tc.expected !== null && tc.expected !== undefined,
    );
  if (
    await shouldReturnIdempotentError(
      problemId,
      "generateSolution",
      dataExists ? true : false, // Cast as boolean since operation can return string
    )
  ) {
    return c.json(
      {
        success: false as const,
        error: {
          code: "IDEMPOTENT_ERROR",
          message:
            "Solution and test case outputs already exist and generation step has completed or is in progress",
        },
      },
      409,
    );
  }

  // Update problem with model if not set
  if (!problem.generatedByModelId && body.updateProblem) {
    const modelId = await getOrCreateModel(body.model);
    await updateProblem(problemId, { generatedByModelId: modelId });
  }

  const userId = problem.generatedByUserId || "unknown";
  const updateProblemInDb = body.updateProblem !== false;

  // Generate solution
  const solutionResult = await generateSolution(
    problemId,
    body.model,
    userId,
    c.env,
    updateProblemInDb,
    body.forceError,
    body.returnDummy,
  );

  // Immediately execute solution with test inputs to get outputs
  const sandboxId = `test-outputs-${problemId}`;
  const sandbox = getSandboxInstance(c.env, sandboxId);
  const testCasesResult = await generateTestCaseOutputs(problemId, sandbox);

  const enqueueNext = body.enqueueNextStep !== false;
  const jobId = await startWorkflowFromStepIfEnabled(
    c,
    problemId,
    "generateSolution",
    body.model,
    enqueueNext,
    body.returnDummy,
  );

  return c.json(
    {
      success: true as const,
      data: { solution: solutionResult, testCases: testCasesResult, jobId },
    },
    200,
  );
});

problems.openapi(getSolutionRoute, async (c) => {
  const { problemId } = c.req.valid("param");

  // Validate prerequisite: all test cases must have input field populated
  const problem = await getProblem(problemId);
  if (
    !problem.testCases ||
    problem.testCases.length === 0 ||
    !problem.testCases.every(
      (tc) => tc.input !== null && tc.input !== undefined,
    )
  ) {
    return c.json(
      {
        success: false as const,
        error: {
          code: "PREREQUISITE_ERROR",
          message:
            "Test case inputs must be generated before solution can be retrieved",
        },
      },
      400,
    );
  }

  const result = await getSolution(problemId);
  return c.json({ success: true as const, data: { solution: result } }, 200);
});

problems.openapi(runSolutionRoute, async (c) => {
  const { problemId } = c.req.valid("param");
  const body = c.req.valid("json");

  const sandboxId = `solution-run-${problemId}`;
  const sandbox = getSandboxInstance(c.env, sandboxId);
  const language = CodeGenLanguageSchema.parse(body.language);
  const result = await runUserSolution(problemId, body.code, sandbox, language);
  return c.json({ success: true as const, data: result }, 200);
});

problems.openapi(runCustomTestsRoute, async (c) => {
  const { problemId } = c.req.valid("param");
  const body = c.req.valid("json");

  const sandboxId = `custom-run-${problemId}-${Date.now()}`;
  const sandbox = getSandboxInstance(c.env, sandboxId);
  const language = CodeGenLanguageSchema.parse(body.language);
  const result = await runUserSolutionWithCustomInputs(
    problemId,
    body.code,
    body.customInputs,
    sandbox,
    language,
  );
  return c.json({ success: true as const, data: result }, 200);
});

// ============== Test Outputs Routes ==============

problems.openapi(generateOutputsRoute, async (c) => {
  const { problemId } = c.req.valid("param");
  const body = c.req.valid("json");

  // Validate prerequisite: solution must exist
  const problem = await getProblem(problemId);
  if (!problem.solution || problem.solution.trim() === "") {
    return c.json(
      {
        success: false as const,
        error: {
          code: "PREREQUISITE_ERROR",
          message:
            "Solution must be generated before test outputs can be created",
        },
      },
      400,
    );
  }

  // Check idempotency: if data exists and step completed/in progress, return 409
  const dataExists =
    problem.testCases &&
    problem.testCases.length > 0 &&
    problem.testCases.every(
      (tc) => tc.expected !== null && tc.expected !== undefined,
    );
  if (
    await shouldReturnIdempotentError(problemId, "generateSolution", dataExists)
  ) {
    return c.json(
      {
        success: false as const,
        error: {
          code: "IDEMPOTENT_ERROR",
          message:
            "Test case outputs already exist and generation step has completed or is in progress",
        },
      },
      409,
    );
  }

  const sandboxId = `test-outputs-${problemId}`;
  const sandbox = getSandboxInstance(c.env, sandboxId);
  const result = await generateTestCaseOutputs(problemId, sandbox);

  const enqueueNext = body?.enqueueNextStep !== false;
  const jobId = await startWorkflowFromStepIfEnabled(
    c,
    problemId,
    "generateSolution",
    body?.model,
    enqueueNext,
    undefined,
  );

  return c.json(
    { success: true as const, data: { testCases: result, jobId } },
    200,
  );
});

problems.openapi(getOutputsRoute, async (c) => {
  const { problemId } = c.req.valid("param");

  // Validate prerequisite: solution must exist
  const problem = await getProblem(problemId);
  if (!problem.solution || problem.solution.trim() === "") {
    return c.json(
      {
        success: false as const,
        error: {
          code: "PREREQUISITE_ERROR",
          message:
            "Solution must be generated before test outputs can be retrieved",
        },
      },
      400,
    );
  }

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
        currentStep: (job.currentStep as GenerationStep | null) ?? undefined,
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

// ============== Workflow Status Route ==============

problems.openapi(getWorkflowStatusRoute, async (c) => {
  const { problemId } = c.req.valid("param");
  const job = await getLatestJobForProblem(problemId);

  if (!job) {
    return c.json(
      {
        success: false as const,
        error: {
          code: "NOT_FOUND",
          message: "No generation job found for this problem",
        },
      },
      404,
    );
  }

  try {
    // Get the workflow instance using jobId as the instance ID
    const workflowInstance = await c.env.PROBLEM_GENERATION_WORKFLOW.get(
      job.id,
    );
    const status = await workflowInstance.status();

    return c.json(
      {
        success: true as const,
        data: {
          status: status.status,
          error: status.error,
          output: status.output,
        },
      },
      200,
    );
  } catch (error) {
    // Workflow instance might not exist yet or might have been cleaned up
    return c.json(
      {
        success: false as const,
        error: {
          code: "NOT_FOUND",
          message:
            error instanceof Error
              ? error.message
              : "Workflow instance not found",
        },
      },
      404,
    );
  }
});

problems.openapi(getProblemModelRoute, async (c) => {
  const { problemId } = c.req.valid("param");
  const modelName = await getModelForProblem(problemId);
  return c.json({ success: true as const, data: { model: modelName } }, 200);
});

export { problems };
