import { z } from "@hono/zod-openapi";

// Base problem entity schema
export const ProblemSchema = z
  .object({
    id: z.string().uuid(),
    problemText: z.string(),
    functionSignature: z.string(),
    solution: z.string().nullable(),
    generatedByModelId: z.string().uuid().nullable(),
    generatedByUserId: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("Problem");

// Request schemas
export const CreateProblemRequestSchema = z
  .object({
    model: z.string().min(1).openapi({ example: "claude-3-5-sonnet-20241022" }),
    returnDummy: z.boolean().optional().openapi({
      description:
        "If true, return dummy data matching the expected schema instead of calling generateObject",
      example: false,
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
  })
  .openapi("RunSolutionRequest");

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

// Inferred types
export type Problem = z.infer<typeof ProblemSchema>;
export type CreateProblemRequest = z.infer<typeof CreateProblemRequestSchema>;
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
export type GenerateSolutionRequest = z.infer<
  typeof GenerateSolutionRequestSchema
>;
export type RunSolutionRequest = z.infer<typeof RunSolutionRequestSchema>;
export type CreateProblemResponse = z.infer<typeof CreateProblemResponseSchema>;
export type ProblemText = z.infer<typeof ProblemTextSchema>;
export type Solution = z.infer<typeof SolutionSchema>;
export type ProblemModel = z.infer<typeof ProblemModelSchema>;
