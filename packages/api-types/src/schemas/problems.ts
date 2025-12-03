import { z } from "@hono/zod-openapi";
import { FunctionSignatureSchemaSchema } from "./function-signature";
import { FocusAreaListSchema } from "./focus-areas";

// Base problem entity schema
export const ProblemSchema = z
  .object({
    id: z.string().uuid(),
    problemText: z.string(),
    functionSignature: z.string(),
    functionSignatureSchema: FunctionSignatureSchemaSchema.nullable(),
    problemTextReworded: z.string().nullable(),
    solution: z.string().nullable(),
    generatedByModelId: z.string().uuid().nullable(),
    generatedByUserId: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("Problem");

// Request schemas
export const StartFromSchema = z
  .object({
    problemId: z.string().uuid().openapi({
      description: "ID of existing problem to base this new problem on",
    }),
    direction: z.enum(["easier", "harder", "similar"]).openapi({
      description: "Direction to adjust difficulty or regenerate similar",
    }),
  })
  .openapi("StartFrom");

export const CreateProblemRequestSchema = z
  .object({
    model: z.string().min(1).openapi({ example: "claude-3-5-sonnet-20241022" }),
    returnDummy: z.boolean().optional().openapi({
      description:
        "If true, return dummy data matching the expected schema instead of calling generateObject",
      example: false,
    }),
    startFrom: StartFromSchema.optional().openapi({
      description:
        "Create problem based on existing problem with adjusted difficulty",
    }),
    focusAreaIds: z
      .array(z.string().uuid())
      .optional()
      .openapi({
        description:
          "Focus area IDs to guide problem generation. Empty array or omitted = random selection from all areas.",
        example: ["uuid-1", "uuid-2"],
      }),
  })
  .openapi("CreateProblemRequest");

// Shared generate request schema - used by all generate endpoints
export const GenerateRequestSchema = z
  .object({
    model: z.string().min(1).openapi({ example: "claude-3-5-sonnet-20241022" }),
    enqueueNextStep: z.boolean().optional().default(true).openapi({
      description: "Whether to automatically enqueue the next generation step",
      example: true,
    }),
    forceError: z.boolean().optional().openapi({
      description: "If true, throw an error instead of calling generateObject",
      example: false,
    }),
    returnDummy: z.boolean().optional().openapi({
      description:
        "If true, return dummy data matching the expected schema instead of calling generateObject",
      example: false,
    }),
  })
  .openapi("GenerateRequest");

// Solution-specific generate request (extends base with updateProblem)
export const GenerateSolutionRequestSchema = GenerateRequestSchema.extend({
  updateProblem: z.boolean().optional().default(true).openapi({
    description: "Whether to update the problem with the generated solution",
    example: true,
  }),
}).openapi("GenerateSolutionRequest");

export const RunSolutionRequestSchema = z
  .object({
    code: z.string().min(1).openapi({
      example: "def solution(n: int) -> int:\n    return n * 2",
    }),
    language: z
      .enum(["typescript", "python"])
      .optional()
      .default("typescript")
      .openapi({
        example: "python",
        description: "The programming language of the code",
      }),
  })
  .openapi("RunSolutionRequest");

export const RunCustomTestsRequestSchema = z
  .object({
    code: z.string().min(1).openapi({
      example: "function runSolution(n: number): number { return n * 2; }",
    }),
    customInputs: z
      .array(z.array(z.unknown()))
      .min(1)
      .max(10)
      .openapi({
        example: [[[1, 2, 3]], [[4, 5, 6]]],
        description:
          "Array of test inputs. Each input is an array of function arguments.",
      }),
    language: z
      .enum(["typescript", "python"])
      .optional()
      .default("typescript")
      .openapi({
        example: "python",
        description: "The programming language of the code",
      }),
  })
  .openapi("RunCustomTestsRequest");

// Response schemas
export const CreateProblemResponseSchema = z
  .object({
    problemId: z.string().uuid(),
    jobId: z.string().uuid().nullable(),
  })
  .openapi("CreateProblemResponse");

export const ProblemTextSchema = z
  .object({
    problemText: z.string(),
    functionSignature: z.string(),
    problemTextReworded: z.string(),
    functionSignatureSchema: FunctionSignatureSchemaSchema.nullable(),
  })
  .openapi("ProblemText");

export const ProblemTextGenerateResponseSchema = ProblemTextSchema.extend({
  jobId: z.string().uuid().nullable(),
}).openapi("ProblemTextGenerateResponse");

export const SolutionSchema = z
  .object({
    solution: z.string().nullable(),
  })
  .openapi("Solution");

export const SolutionGenerateResponseSchema = SolutionSchema.extend({
  jobId: z.string().uuid().nullable(),
}).openapi("SolutionGenerateResponse");

export const ProblemModelSchema = z
  .object({
    model: z.string().nullable(),
  })
  .openapi("ProblemModel");

// Function signature schema response
export const FunctionSignatureSchemaResponseSchema = z
  .object({
    functionSignatureSchema: FunctionSignatureSchemaSchema.nullable(),
  })
  .openapi("FunctionSignatureSchemaResponse");

export const FunctionSignatureSchemaGenerateResponseSchema =
  FunctionSignatureSchemaResponseSchema.extend({
    jobId: z.string().uuid().nullable(),
  }).openapi("FunctionSignatureSchemaGenerateResponse");

// Focus areas response schema
export const ProblemFocusAreasResponseSchema = z
  .object({
    focusAreas: FocusAreaListSchema,
  })
  .openapi("ProblemFocusAreasResponse");

// Starter code request/response
export const StarterCodeRequestSchema = z
  .object({
    language: z.enum(["typescript", "python"]).openapi({
      example: "typescript",
      description: "The programming language for the starter code",
    }),
  })
  .openapi("StarterCodeRequest");

export const StarterCodeResponseSchema = z
  .object({
    starterCode: z.string(),
    language: z.enum(["typescript", "python"]),
  })
  .openapi("StarterCodeResponse");

// Inferred types
export type Problem = z.infer<typeof ProblemSchema>;
export type StartFrom = z.infer<typeof StartFromSchema>;
export type CreateProblemRequest = z.infer<typeof CreateProblemRequestSchema>;
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
export type GenerateSolutionRequest = z.infer<
  typeof GenerateSolutionRequestSchema
>;
export type RunSolutionRequest = z.infer<typeof RunSolutionRequestSchema>;
export type RunCustomTestsRequest = z.infer<typeof RunCustomTestsRequestSchema>;
export type CreateProblemResponse = z.infer<typeof CreateProblemResponseSchema>;
export type ProblemText = z.infer<typeof ProblemTextSchema>;
export type Solution = z.infer<typeof SolutionSchema>;
export type ProblemModel = z.infer<typeof ProblemModelSchema>;
export type FunctionSignatureSchemaResponse = z.infer<
  typeof FunctionSignatureSchemaResponseSchema
>;
export type StarterCodeRequest = z.infer<typeof StarterCodeRequestSchema>;
export type StarterCodeResponse = z.infer<typeof StarterCodeResponseSchema>;
export type ProblemFocusAreasResponse = z.infer<
  typeof ProblemFocusAreasResponseSchema
>;
