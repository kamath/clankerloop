import { z } from "@hono/zod-openapi";

// Generation step enum
export const GenerationStepSchema = z
  .enum([
    "generateProblemText",
    "parseFunctionSignature",
    "generateTestCases",
    "generateTestCaseInputCode",
    "generateSolution",
  ])
  .openapi("GenerationStep");

// Generation job status enum
export const GenerationJobStatusSchema = z
  .enum(["pending", "in_progress", "completed", "failed"])
  .openapi("GenerationJobStatus");

// Generation job entity schema
export const GenerationJobSchema = z
  .object({
    id: z.string().uuid(),
    problemId: z.string().uuid(),
    modelId: z.string().uuid().nullable(),
    status: GenerationJobStatusSchema,
    currentStep: z.string().nullable(),
    completedSteps: z.array(z.string()),
    error: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("GenerationJob");

// Generation status response (used by generation-status endpoint)
export const GenerationStatusSchema = z
  .object({
    jobId: z.string().uuid().optional(),
    status: z.enum(["none", "pending", "in_progress", "completed", "failed"]),
    currentStep: GenerationStepSchema.optional(),
    completedSteps: z.array(GenerationStepSchema).optional(),
    progress: z
      .object({
        completed: z.number(),
        total: z.number(),
        percent: z.number(),
      })
      .optional(),
    error: z.string().optional(),
  })
  .openapi("GenerationStatus");

// Workflow status schema (Cloudflare Workflows instance status)
export const WorkflowStatusSchema = z
  .enum([
    "queued",
    "running",
    "paused",
    "errored",
    "terminated",
    "complete",
    "waiting",
    "waitingForPause",
    "unknown",
  ])
  .openapi("WorkflowStatus");

export const WorkflowStatusResponseSchema = z
  .object({
    status: WorkflowStatusSchema,
    error: z.string().optional(),
    output: z.unknown().optional(),
  })
  .openapi("WorkflowStatusResponse");

// Inferred types
export type GenerationStep = z.infer<typeof GenerationStepSchema>;
export type GenerationJobStatus = z.infer<typeof GenerationJobStatusSchema>;
export type GenerationJob = z.infer<typeof GenerationJobSchema>;
export type GenerationStatus = z.infer<typeof GenerationStatusSchema>;
export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;
export type WorkflowStatusResponse = z.infer<
  typeof WorkflowStatusResponseSchema
>;
