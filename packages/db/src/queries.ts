import { eq, desc } from "drizzle-orm";
import db from "../index";
import {
  models,
  problems,
  testCases,
  generationJobs,
  type Model,
  type Problem,
  type TestCase,
  type NewModel,
  type NewProblem,
  type NewTestCase,
  type GenerationJob,
  type NewGenerationJob,
} from "./schema";

// Re-export types for convenience
export type {
  Model,
  Problem,
  TestCase,
  NewModel,
  NewProblem,
  NewTestCase,
  GenerationJob,
  NewGenerationJob,
};

// Problem with test cases type for getProblem
export type ProblemWithTestCases = Problem & {
  testCases: TestCase[];
};

// Model functions

export async function createModel(name: string): Promise<string> {
  const [result] = await db
    .insert(models)
    .values({ name })
    .returning({ id: models.id });

  if (!result || !result.id) {
    throw new Error(`Failed to create model: ${name}`);
  }

  return result.id;
}

export async function getModel(modelId: string): Promise<Model | null> {
  const model = await db.query.models.findFirst({
    where: eq(models.id, modelId),
  });
  return model ?? null;
}

export async function getModelByName(name: string): Promise<Model | null> {
  const model = await db.query.models.findFirst({
    where: eq(models.name, name),
  });
  return model ?? null;
}

export async function listModels(): Promise<Model[]> {
  return db.query.models.findMany({
    orderBy: models.name,
  });
}

export async function getModelForProblem(
  problemId: string,
): Promise<string | null> {
  const problem = await db.query.problems.findFirst({
    where: eq(problems.id, problemId),
  });

  if (!problem || !problem.generatedByModelId) {
    return null;
  }

  const model = await getModel(problem.generatedByModelId);
  return model?.name ?? null;
}

// Problem functions

export async function createProblem(
  data?: Partial<NewProblem>,
): Promise<string> {
  if (!data?.generatedByUserId) {
    throw new Error("generatedByUserId is required");
  }

  const [result] = await db
    .insert(problems)
    .values({
      problemText: data?.problemText ?? "",
      functionSignature: data?.functionSignature ?? "",
      problemTextReworded: data?.problemTextReworded ?? "",
      solution: data?.solution ?? "",
      generatedByUserId: data?.generatedByUserId,
      easierThan: data?.easierThan ?? null,
      harderThan: data?.harderThan ?? null,
    })
    .returning({ id: problems.id });

  if (!result || !result.id) {
    throw new Error(`Failed to create problem`);
  }

  return result.id;
}

export async function getProblem(
  problemId: string,
): Promise<ProblemWithTestCases> {
  const problem = await db.query.problems.findFirst({
    where: eq(problems.id, problemId),
  });

  if (!problem) {
    throw new Error(`Problem not found: ${problemId}`);
  }

  const problemTestCases = await db.query.testCases.findMany({
    where: eq(testCases.problemId, problemId),
    orderBy: testCases.createdAt,
  });

  return {
    ...problem,
    testCases: problemTestCases,
  };
}

export async function updateProblem(
  problemId: string,
  data: Partial<Omit<NewProblem, "id">>,
): Promise<void> {
  await db
    .update(problems)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(problems.id, problemId));
}

export async function listProblems(): Promise<string[]> {
  const result = await db
    .select({ id: problems.id })
    .from(problems)
    .orderBy(problems.createdAt);

  return result.map((row) => row.id);
}

// TestCase functions

export async function createTestCase(
  problemId: string,
  data: Omit<NewTestCase, "id" | "problemId" | "createdAt">,
): Promise<string> {
  const [result] = await db
    .insert(testCases)
    .values({
      problemId,
      description: data.description,
      isEdgeCase: data.isEdgeCase ?? false,
      inputCode: data.inputCode,
      input: data.input,
      expected: data.expected,
    })
    .returning({ id: testCases.id });

  if (!result || !result.id) {
    throw new Error(`Failed to create test case`);
  }

  return result.id;
}

export async function updateTestCase(
  testCaseId: string,
  data: Partial<Omit<NewTestCase, "id" | "problemId" | "createdAt">>,
): Promise<void> {
  await db.update(testCases).set(data).where(eq(testCases.id, testCaseId));
}

export async function deleteTestCases(problemId: string): Promise<void> {
  await db.delete(testCases).where(eq(testCases.problemId, problemId));
}

export async function getTestCasesByProblemId(
  problemId: string,
): Promise<TestCase[]> {
  return db.query.testCases.findMany({
    where: eq(testCases.problemId, problemId),
  });
}

export async function createTestCases(
  problemId: string,
  data: Omit<NewTestCase, "id" | "problemId" | "createdAt">[],
): Promise<TestCase[]> {
  if (data.length === 0) return [];

  return db
    .insert(testCases)
    .values(
      data.map((tc) => ({
        problemId,
        description: tc.description,
        isEdgeCase: tc.isEdgeCase ?? false,
        inputCode: tc.inputCode,
        input: tc.input,
        expected: tc.expected,
      })),
    )
    .returning();
}

export async function replaceTestCases(
  problemId: string,
  data: Omit<NewTestCase, "id" | "problemId" | "createdAt">[],
): Promise<TestCase[]> {
  // Delete existing test cases and insert new ones
  await deleteTestCases(problemId);
  return createTestCases(problemId, data);
}

// Generation Job functions

export async function createGenerationJob(
  problemId: string,
  modelId?: string,
): Promise<string> {
  const [result] = await db
    .insert(generationJobs)
    .values({
      problemId,
      modelId: modelId ?? null,
      status: "pending",
      completedSteps: [],
    })
    .returning({ id: generationJobs.id });

  if (!result || !result.id) {
    throw new Error(`Failed to create generation job`);
  }

  return result.id;
}

export async function getGenerationJob(
  jobId: string,
): Promise<GenerationJob | null> {
  const job = await db.query.generationJobs.findFirst({
    where: eq(generationJobs.id, jobId),
  });
  return job ?? null;
}

export async function getLatestJobForProblem(
  problemId: string,
): Promise<GenerationJob | null> {
  const job = await db.query.generationJobs.findFirst({
    where: eq(generationJobs.problemId, problemId),
    orderBy: desc(generationJobs.createdAt),
  });
  return job ?? null;
}

export async function updateJobStatus(
  jobId: string,
  status: "pending" | "in_progress" | "completed" | "failed",
  currentStep?: string,
  error?: string,
): Promise<void> {
  await db
    .update(generationJobs)
    .set({
      status,
      currentStep: currentStep ?? null,
      error: error ?? null,
      updatedAt: new Date(),
    })
    .where(eq(generationJobs.id, jobId));
}

export async function markStepComplete(
  jobId: string,
  step: string,
): Promise<void> {
  const job = await getGenerationJob(jobId);
  if (!job) {
    throw new Error(`Generation job not found: ${jobId}`);
  }

  const completedSteps = [...(job.completedSteps || []), step];

  await db
    .update(generationJobs)
    .set({
      completedSteps,
      updatedAt: new Date(),
    })
    .where(eq(generationJobs.id, jobId));
}
