import { eq, desc } from "drizzle-orm";
import defaultDb, { type Database } from "../index";
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

// Re-export Database type
export type { Database };

// Problem with test cases type for getProblem
export type ProblemWithTestCases = Problem & {
  testCases: TestCase[];
};

// Helper to get db instance (use provided or default)
const getDb = (db?: Database): Database => db ?? defaultDb;

// Model functions

export async function createModel(
  name: string,
  db?: Database,
): Promise<string> {
  const database = getDb(db);
  const [result] = await database
    .insert(models)
    .values({ name })
    .returning({ id: models.id });

  if (!result || !result.id) {
    throw new Error(`Failed to create model: ${name}`);
  }

  return result.id;
}

export async function getModel(
  modelId: string,
  db?: Database,
): Promise<Model | null> {
  const database = getDb(db);
  const model = await database.query.models.findFirst({
    where: eq(models.id, modelId),
  });
  return model ?? null;
}

export async function getModelByName(
  name: string,
  db?: Database,
): Promise<Model | null> {
  const database = getDb(db);
  const model = await database.query.models.findFirst({
    where: eq(models.name, name),
  });
  return model ?? null;
}

export async function listModels(db?: Database): Promise<Model[]> {
  const database = getDb(db);
  return database.query.models.findMany({
    orderBy: models.name,
  });
}

export async function getModelForProblem(
  problemId: string,
  db?: Database,
): Promise<string | null> {
  const database = getDb(db);
  const problem = await database.query.problems.findFirst({
    where: eq(problems.id, problemId),
  });

  if (!problem || !problem.generatedByModelId) {
    return null;
  }

  const model = await getModel(problem.generatedByModelId, db);
  return model?.name ?? null;
}

// Problem functions

export async function createProblem(
  data?: Partial<NewProblem>,
  db?: Database,
): Promise<string> {
  if (!data?.generatedByUserId) {
    throw new Error("generatedByUserId is required");
  }

  const database = getDb(db);
  const [result] = await database
    .insert(problems)
    .values({
      problemText: data?.problemText ?? "",
      functionSignature: data?.functionSignature ?? "",
      problemTextReworded: data?.problemTextReworded ?? "",
      solution: data?.solution ?? "",
      generatedByUserId: data?.generatedByUserId,
    })
    .returning({ id: problems.id });

  if (!result || !result.id) {
    throw new Error(`Failed to create problem`);
  }

  return result.id;
}

export async function getProblem(
  problemId: string,
  db?: Database,
): Promise<ProblemWithTestCases> {
  const database = getDb(db);
  const problem = await database.query.problems.findFirst({
    where: eq(problems.id, problemId),
  });

  if (!problem) {
    throw new Error(`Problem not found: ${problemId}`);
  }

  const problemTestCases = await database.query.testCases.findMany({
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
  db?: Database,
): Promise<void> {
  const database = getDb(db);
  await database
    .update(problems)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(problems.id, problemId));
}

export async function listProblems(db?: Database): Promise<string[]> {
  const database = getDb(db);
  const result = await database
    .select({ id: problems.id })
    .from(problems)
    .orderBy(problems.createdAt);

  return result.map((row) => row.id);
}

// TestCase functions

export async function createTestCase(
  problemId: string,
  data: Omit<NewTestCase, "id" | "problemId" | "createdAt">,
  db?: Database,
): Promise<string> {
  const database = getDb(db);
  const [result] = await database
    .insert(testCases)
    .values({
      problemId,
      description: data.description,
      isEdgeCase: data.isEdgeCase ?? false,
      isSampleCase: data.isSampleCase ?? false,
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
  db?: Database,
): Promise<void> {
  const database = getDb(db);
  await database
    .update(testCases)
    .set(data)
    .where(eq(testCases.id, testCaseId));
}

export async function deleteTestCases(
  problemId: string,
  db?: Database,
): Promise<void> {
  const database = getDb(db);
  await database.delete(testCases).where(eq(testCases.problemId, problemId));
}

export async function getTestCasesByProblemId(
  problemId: string,
  db?: Database,
): Promise<TestCase[]> {
  const database = getDb(db);
  return database.query.testCases.findMany({
    where: eq(testCases.problemId, problemId),
  });
}

export async function createTestCases(
  problemId: string,
  data: Omit<NewTestCase, "id" | "problemId" | "createdAt">[],
  db?: Database,
): Promise<TestCase[]> {
  if (data.length === 0) return [];

  const database = getDb(db);
  return database
    .insert(testCases)
    .values(
      data.map((tc) => ({
        problemId,
        description: tc.description,
        isEdgeCase: tc.isEdgeCase ?? false,
        isSampleCase: tc.isSampleCase ?? false,
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
  db?: Database,
): Promise<TestCase[]> {
  // Delete existing test cases and insert new ones
  await deleteTestCases(problemId, db);
  return createTestCases(problemId, data, db);
}

// Generation Job functions

export async function createGenerationJob(
  problemId: string,
  modelId?: string,
  db?: Database,
): Promise<string> {
  const database = getDb(db);
  const [result] = await database
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
  db?: Database,
): Promise<GenerationJob | null> {
  const database = getDb(db);
  const job = await database.query.generationJobs.findFirst({
    where: eq(generationJobs.id, jobId),
  });
  return job ?? null;
}

export async function getLatestJobForProblem(
  problemId: string,
  db?: Database,
): Promise<GenerationJob | null> {
  const database = getDb(db);
  const job = await database.query.generationJobs.findFirst({
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
  db?: Database,
): Promise<void> {
  const database = getDb(db);
  await database
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
  db?: Database,
): Promise<void> {
  const job = await getGenerationJob(jobId, db);
  if (!job) {
    throw new Error(`Generation job not found: ${jobId}`);
  }

  const completedSteps = [...(job.completedSteps || []), step];

  const database = getDb(db);
  await database
    .update(generationJobs)
    .set({
      completedSteps,
      updatedAt: new Date(),
    })
    .where(eq(generationJobs.id, jobId));
}
