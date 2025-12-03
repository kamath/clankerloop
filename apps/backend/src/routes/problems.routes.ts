import { createRoute } from "@hono/zod-openapi";
import {
  ApiErrorSchema,
  ApiSuccessSchema,
  ProblemIdParamSchema,
  ModelSchema,
  CreateModelRequestSchema,
  ListModelsResponseSchema,
  CreateProblemRequestSchema,
  CreateProblemResponseSchema,
  GenerateRequestSchema,
  GenerateSolutionRequestSchema,
  RunSolutionRequestSchema,
  RunCustomTestsRequestSchema,
  ProblemTextSchema,
  ProblemTextGenerateResponseSchema,
  SolutionSchema,
  SolutionGenerateResponseSchema,
  TestCaseListSchema,
  TestCasesGenerateResponseSchema,
  InputCodeGenerateResponseSchema,
  InputCodeGetResponseSchema,
  TestInputsGenerateResponseSchema,
  TestInputsGetResponseSchema,
  TestOutputsGenerateResponseSchema,
  TestOutputsGetResponseSchema,
  TestResultsSchema,
  CustomTestResultsSchema,
  GenerationStatusSchema,
  WorkflowStatusResponseSchema,
  ProblemModelSchema,
  FunctionSignatureSchemaResponseSchema,
  FunctionSignatureSchemaGenerateResponseSchema,
  StarterCodeRequestSchema,
  StarterCodeResponseSchema,
  FocusAreaListSchema,
  ProblemFocusAreasResponseSchema,
} from "@repo/api-types";
import { z } from "@hono/zod-openapi";

// ============== Models Routes ==============

export const listModelsRoute = createRoute({
  method: "get",
  path: "/models",
  tags: ["Models"],
  summary: "List all models",
  description: "Returns a list of all available AI models",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiSuccessSchema(ListModelsResponseSchema),
        },
      },
      description: "List of models",
    },
  },
  security: [{ ApiKeyAuth: [] }],
});

export const createModelRoute = createRoute({
  method: "post",
  path: "/models",
  tags: ["Models"],
  summary: "Create a new model",
  description: "Creates a new AI model entry",
  request: {
    body: {
      content: {
        "application/json": { schema: CreateModelRequestSchema },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiSuccessSchema(ModelSchema),
        },
      },
      description: "Model created successfully",
    },
    400: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description: "Validation error",
    },
    409: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description: "Model already exists",
    },
  },
  security: [{ ApiKeyAuth: [] }],
});

// ============== Problem Routes ==============

export const createProblemRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Problems"],
  summary: "Create a new problem",
  description:
    "Creates a new problem and optionally starts auto-generation pipeline",
  request: {
    body: {
      content: {
        "application/json": { schema: CreateProblemRequestSchema },
      },
      required: true,
    },
    query: z.object({
      autoGenerate: z
        .enum(["true", "false"])
        .optional()
        .openapi({
          param: { name: "autoGenerate", in: "query" },
          description:
            "Whether to auto-generate problem content (default: true)",
          example: "true",
        }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiSuccessSchema(CreateProblemResponseSchema),
        },
      },
      description: "Problem created successfully",
    },
    400: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description: "Validation error",
    },
    500: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description: "Server error",
    },
  },
  security: [{ ApiKeyAuth: [] }],
});

// ============== Problem Text Routes ==============

export const generateProblemTextRoute = createRoute({
  method: "post",
  path: "/{problemId}/text/generate",
  tags: ["Problems"],
  summary: "Generate problem text",
  description: "Generates problem description and function signature using AI",
  request: {
    params: ProblemIdParamSchema,
    body: {
      content: {
        "application/json": { schema: GenerateRequestSchema },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiSuccessSchema(ProblemTextGenerateResponseSchema),
        },
      },
      description: "Problem text generated successfully",
    },
    400: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description: "Validation error",
    },
    409: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description:
        "Problem text already exists and generation step has completed or is in progress",
    },
  },
  security: [{ ApiKeyAuth: [] }],
});

export const getProblemTextRoute = createRoute({
  method: "get",
  path: "/{problemId}/text",
  tags: ["Problems"],
  summary: "Get problem text",
  description: "Retrieves the problem description and function signature",
  request: {
    params: ProblemIdParamSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiSuccessSchema(ProblemTextSchema),
        },
      },
      description: "Problem text retrieved",
    },
  },
  security: [{ ApiKeyAuth: [] }],
});

// ============== Function Signature Schema Routes ==============

export const parseFunctionSignatureRoute = createRoute({
  method: "post",
  path: "/{problemId}/function-signature/parse",
  tags: ["Problems"],
  summary: "Parse function signature to schema",
  description:
    "Parses the text function signature into a structured schema for multi-language code generation",
  request: {
    params: ProblemIdParamSchema,
    body: {
      content: {
        "application/json": { schema: GenerateRequestSchema },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiSuccessSchema(
            FunctionSignatureSchemaGenerateResponseSchema,
          ),
        },
      },
      description: "Function signature parsed successfully",
    },
    400: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description: "Validation error",
    },
    409: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description:
        "Function signature schema already exists and parsing step has completed or is in progress",
    },
  },
  security: [{ ApiKeyAuth: [] }],
});

export const getFunctionSignatureSchemaRoute = createRoute({
  method: "get",
  path: "/{problemId}/function-signature/schema",
  tags: ["Problems"],
  summary: "Get function signature schema",
  description: "Retrieves the structured function signature schema",
  request: {
    params: ProblemIdParamSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiSuccessSchema(FunctionSignatureSchemaResponseSchema),
        },
      },
      description: "Function signature schema retrieved",
    },
  },
  security: [{ ApiKeyAuth: [] }],
});

export const getStarterCodeRoute = createRoute({
  method: "get",
  path: "/{problemId}/starter-code",
  tags: ["Problems"],
  summary: "Get starter code",
  description:
    "Generates starter code for the problem in the specified language",
  request: {
    params: ProblemIdParamSchema,
    query: StarterCodeRequestSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiSuccessSchema(StarterCodeResponseSchema),
        },
      },
      description: "Starter code generated successfully",
    },
    400: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description: "Validation error or schema not available",
    },
  },
  security: [{ ApiKeyAuth: [] }],
});

// ============== Test Cases Routes ==============

export const generateTestCasesRoute = createRoute({
  method: "post",
  path: "/{problemId}/test-cases/generate",
  tags: ["Test Cases"],
  summary: "Generate test cases",
  description: "Generates test case descriptions for the problem",
  request: {
    params: ProblemIdParamSchema,
    body: {
      content: {
        "application/json": { schema: GenerateRequestSchema },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiSuccessSchema(TestCasesGenerateResponseSchema),
        },
      },
      description: "Test cases generated successfully",
    },
    400: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description: "Validation error",
    },
    409: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description:
        "Test cases already exist and generation step has completed or is in progress",
    },
  },
  security: [{ ApiKeyAuth: [] }],
});

export const getTestCasesRoute = createRoute({
  method: "get",
  path: "/{problemId}/test-cases",
  tags: ["Test Cases"],
  summary: "Get test cases",
  description: "Retrieves all test cases for a problem",
  request: {
    params: ProblemIdParamSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiSuccessSchema(TestCaseListSchema),
        },
      },
      description: "Test cases retrieved",
    },
    400: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description: "Validation error",
    },
  },
  security: [{ ApiKeyAuth: [] }],
});

// ============== Test Case Input Code Routes ==============

export const generateInputCodeRoute = createRoute({
  method: "post",
  path: "/{problemId}/test-cases/input-code/generate",
  tags: ["Test Cases"],
  summary: "Generate test case input code",
  description: "Generates code that produces test inputs",
  request: {
    params: ProblemIdParamSchema,
    body: {
      content: {
        "application/json": { schema: GenerateRequestSchema },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiSuccessSchema(InputCodeGenerateResponseSchema),
        },
      },
      description: "Input code generated successfully",
    },
    400: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description: "Validation error",
    },
    409: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description:
        "Test case input code already exists and generation step has completed or is in progress",
    },
  },
  security: [{ ApiKeyAuth: [] }],
});

export const getInputCodeRoute = createRoute({
  method: "get",
  path: "/{problemId}/test-cases/input-code",
  tags: ["Test Cases"],
  summary: "Get test case input code",
  description: "Retrieves the generated input code for test cases",
  request: {
    params: ProblemIdParamSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiSuccessSchema(InputCodeGetResponseSchema),
        },
      },
      description: "Input code retrieved",
    },
    400: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description: "Validation error",
    },
  },
  security: [{ ApiKeyAuth: [] }],
});

// ============== Test Case Inputs Routes ==============

export const generateInputsRoute = createRoute({
  method: "post",
  path: "/{problemId}/test-cases/inputs/generate",
  tags: ["Test Cases"],
  summary: "Generate test inputs",
  description: "Executes input code to produce actual test inputs",
  request: {
    params: ProblemIdParamSchema,
    body: {
      content: {
        "application/json": { schema: GenerateRequestSchema.partial() },
      },
      required: false,
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiSuccessSchema(TestInputsGenerateResponseSchema),
        },
      },
      description: "Test inputs generated successfully",
    },
    400: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description: "Validation error",
    },
    409: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description:
        "Test case inputs already exist and generation step has completed or is in progress",
    },
  },
  security: [{ ApiKeyAuth: [] }],
});

export const getInputsRoute = createRoute({
  method: "get",
  path: "/{problemId}/test-cases/inputs",
  tags: ["Test Cases"],
  summary: "Get test inputs",
  description: "Retrieves generated test inputs",
  request: {
    params: ProblemIdParamSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiSuccessSchema(TestInputsGetResponseSchema),
        },
      },
      description: "Test inputs retrieved",
    },
    400: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description: "Validation error",
    },
  },
  security: [{ ApiKeyAuth: [] }],
});

// ============== Solution Routes ==============

export const generateSolutionRoute = createRoute({
  method: "post",
  path: "/{problemId}/solution/generate",
  tags: ["Solutions"],
  summary: "Generate solution",
  description: "Generates a reference solution for the problem",
  request: {
    params: ProblemIdParamSchema,
    body: {
      content: {
        "application/json": { schema: GenerateSolutionRequestSchema },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiSuccessSchema(SolutionGenerateResponseSchema),
        },
      },
      description: "Solution generated successfully",
    },
    400: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description: "Validation error",
    },
    409: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description:
        "Solution already exists and generation step has completed or is in progress",
    },
  },
  security: [{ ApiKeyAuth: [] }],
});

export const getSolutionRoute = createRoute({
  method: "get",
  path: "/{problemId}/solution",
  tags: ["Solutions"],
  summary: "Get solution",
  description: "Retrieves the generated reference solution",
  request: {
    params: ProblemIdParamSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiSuccessSchema(SolutionSchema),
        },
      },
      description: "Solution retrieved",
    },
    400: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description: "Validation error",
    },
  },
  security: [{ ApiKeyAuth: [] }],
});

export const runSolutionRoute = createRoute({
  method: "post",
  path: "/{problemId}/solution/run",
  tags: ["Solutions"],
  summary: "Run user solution",
  description: "Executes user-submitted code against test cases",
  request: {
    params: ProblemIdParamSchema,
    body: {
      content: {
        "application/json": { schema: RunSolutionRequestSchema },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiSuccessSchema(TestResultsSchema),
        },
      },
      description: "Solution executed successfully",
    },
    400: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description: "Validation error",
    },
  },
  security: [{ ApiKeyAuth: [] }],
});

export const runCustomTestsRoute = createRoute({
  method: "post",
  path: "/{problemId}/solution/run-custom",
  tags: ["Solutions"],
  summary: "Run solution with custom test inputs",
  description:
    "Executes user code against custom test inputs (ephemeral, no persistence)",
  request: {
    params: ProblemIdParamSchema,
    body: {
      content: {
        "application/json": { schema: RunCustomTestsRequestSchema },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiSuccessSchema(CustomTestResultsSchema),
        },
      },
      description: "Custom tests executed successfully",
    },
    400: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description: "Validation error",
    },
  },
  security: [{ ApiKeyAuth: [] }],
});

// ============== Test Outputs Routes ==============

export const generateOutputsRoute = createRoute({
  method: "post",
  path: "/{problemId}/test-cases/outputs/generate",
  tags: ["Test Cases"],
  summary: "Generate test outputs",
  description: "Runs the reference solution to generate expected outputs",
  request: {
    params: ProblemIdParamSchema,
    body: {
      content: {
        "application/json": { schema: GenerateRequestSchema.partial() },
      },
      required: false,
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiSuccessSchema(TestOutputsGenerateResponseSchema),
        },
      },
      description: "Test outputs generated successfully",
    },
    400: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description: "Validation error",
    },
    409: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description:
        "Test case outputs already exist and generation step has completed or is in progress",
    },
  },
  security: [{ ApiKeyAuth: [] }],
});

export const getOutputsRoute = createRoute({
  method: "get",
  path: "/{problemId}/test-cases/outputs",
  tags: ["Test Cases"],
  summary: "Get test outputs",
  description: "Retrieves expected outputs for test cases",
  request: {
    params: ProblemIdParamSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiSuccessSchema(TestOutputsGetResponseSchema),
        },
      },
      description: "Test outputs retrieved",
    },
    400: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description: "Validation error",
    },
  },
  security: [{ ApiKeyAuth: [] }],
});

// ============== Generation Status Route ==============

export const getGenerationStatusRoute = createRoute({
  method: "get",
  path: "/{problemId}/generation-status",
  tags: ["Problems"],
  summary: "Get generation status",
  description: "Retrieves the current status of the problem generation job",
  request: {
    params: ProblemIdParamSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiSuccessSchema(GenerationStatusSchema),
        },
      },
      description: "Generation status retrieved",
    },
  },
  security: [{ ApiKeyAuth: [] }],
});

export const getWorkflowStatusRoute = createRoute({
  method: "get",
  path: "/{problemId}/workflow-status",
  tags: ["Problems"],
  summary: "Get workflow status",
  description:
    "Retrieves the Cloudflare Workflows instance status for the problem generation",
  request: {
    params: ProblemIdParamSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiSuccessSchema(WorkflowStatusResponseSchema),
        },
      },
      description: "Workflow status retrieved",
    },
    404: {
      content: { "application/json": { schema: ApiErrorSchema } },
      description: "No workflow instance found",
    },
  },
  security: [{ ApiKeyAuth: [] }],
});

export const getProblemModelRoute = createRoute({
  method: "get",
  path: "/{problemId}/model",
  tags: ["Problems"],
  summary: "Get problem model",
  description: "Retrieves the model name used to generate the problem",
  request: {
    params: ProblemIdParamSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiSuccessSchema(ProblemModelSchema),
        },
      },
      description: "Problem model retrieved",
    },
  },
  security: [{ ApiKeyAuth: [] }],
});

// ============== Focus Areas Routes ==============

export const listFocusAreasRoute = createRoute({
  method: "get",
  path: "/focus-areas",
  tags: ["Focus Areas"],
  summary: "List all focus areas",
  description: "Returns all active focus areas for problem generation",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiSuccessSchema(FocusAreaListSchema),
        },
      },
      description: "List of focus areas",
    },
  },
  security: [{ ApiKeyAuth: [] }],
});

export const getProblemFocusAreasRoute = createRoute({
  method: "get",
  path: "/{problemId}/focus-areas",
  tags: ["Problems"],
  summary: "Get problem focus areas",
  description: "Returns the focus areas associated with a problem",
  request: {
    params: ProblemIdParamSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiSuccessSchema(ProblemFocusAreasResponseSchema),
        },
      },
      description: "Focus areas for the problem",
    },
  },
  security: [{ ApiKeyAuth: [] }],
});
