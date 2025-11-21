import { eq } from 'drizzle-orm';
import {
  db,
  problems,
  functionSignatures,
  languages,
  difficulties,
  testCases,
} from '@repo/db';

import type {
  Problem as AppProblem,
  ProblemPackage,
  TestCase as AppTestCase,
  Language as AppLanguage,
} from '../../types/index';

// Helper to get language ID by name
export async function getLanguageId(languageName: AppLanguage): Promise<string> {
  const result = await db
    .select({ id: languages.id })
    .from(languages)
    .where(eq(languages.name, languageName))
    .limit(1);

  if (result.length === 0) {
    throw new Error(`Language not found: ${languageName}`);
  }

  return result[0].id;
}

// Helper to get difficulty ID by name
export async function getDifficultyId(difficultyName: string): Promise<string> {
  const result = await db
    .select({ id: difficulties.id })
    .from(difficulties)
    .where(eq(difficulties.name, difficultyName))
    .limit(1);

  if (result.length === 0) {
    throw new Error(`Difficulty not found: ${difficultyName}`);
  }

  return result[0].id;
}

// Create a new problem with function signatures
export async function createProblem(
  problem: AppProblem,
): Promise<string> {
  const difficultyId = await getDifficultyId(problem.difficulty);

  // Insert the problem
  const [insertedProblem] = await db
    .insert(problems)
    .values({
      title: problem.title,
      description: problem.description,
      difficultyId,
      constraints: problem.constraints,
    })
    .returning({ id: problems.id });

  const problemId = insertedProblem.id;

  // Insert function signatures for each language
  const signatureEntries = Object.entries(problem.functionSignature);
  if (signatureEntries.length > 0) {
    const signatureValues = await Promise.all(
      signatureEntries.map(async ([lang, signature]) => ({
        problemId,
        languageId: await getLanguageId(lang as AppLanguage),
        signature,
      })),
    );

    await db.insert(functionSignatures).values(signatureValues);
  }

  return problemId;
}

// Get a problem by ID
export async function getProblemById(
  problemId: string,
): Promise<AppProblem | null> {
  const result = await db
    .select({
      id: problems.id,
      title: problems.title,
      description: problems.description,
      difficultyName: difficulties.name,
      constraints: problems.constraints,
    })
    .from(problems)
    .innerJoin(difficulties, eq(problems.difficultyId, difficulties.id))
    .where(eq(problems.id, problemId))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const problemRow = result[0];

  // Get function signatures
  const signatures = await db
    .select({
      languageName: languages.name,
      signature: functionSignatures.signature,
    })
    .from(functionSignatures)
    .innerJoin(languages, eq(functionSignatures.languageId, languages.id))
    .where(eq(functionSignatures.problemId, problemId));

  const functionSignatureRecord: Record<string, string> = {};
  for (const sig of signatures) {
    functionSignatureRecord[sig.languageName] = sig.signature;
  }

  return {
    id: problemRow.id,
    title: problemRow.title,
    description: problemRow.description,
    difficulty: problemRow.difficultyName as AppProblem['difficulty'],
    constraints: problemRow.constraints || [],
    functionSignature: functionSignatureRecord as AppProblem['functionSignature'],
  };
}

// Get a complete problem package by problem ID
export async function getProblemPackage(
  problemId: string,
): Promise<ProblemPackage | null> {
  const problem = await getProblemById(problemId);

  if (!problem) {
    return null;
  }

  // Get all test cases for this problem
  const testCaseRows = await db
    .select({
      id: testCases.id,
      description: testCases.description,
      input: testCases.input,
      expectedOutput: testCases.expectedOutput,
      isEdgeCase: testCases.isEdgeCase,
      isSample: testCases.isSample,
    })
    .from(testCases)
    .where(eq(testCases.problemId, problemId));

  const sampleTestCases: AppTestCase[] = [];
  const hiddenTestCases: AppTestCase[] = [];

  for (const tc of testCaseRows) {
    const testCase: AppTestCase = {
      id: tc.id,
      description: tc.description,
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      isEdgeCase: tc.isEdgeCase,
      isSample: tc.isSample,
    };

    if (tc.isSample) {
      sampleTestCases.push(testCase);
    } else {
      hiddenTestCases.push(testCase);
    }
  }

  return {
    problem,
    sampleTestCases,
    hiddenTestCases,
  };
}

// Delete a problem (cascades to related entities)
export async function deleteProblem(problemId: string): Promise<void> {
  await db.delete(problems).where(eq(problems.id, problemId));
}

// Mark a problem as completed
export async function updateProblemCompletion(
  problemId: string,
  completed: boolean,
): Promise<void> {
  await db
    .update(problems)
    .set({ completed, updatedAt: new Date() })
    .where(eq(problems.id, problemId));
}

// List all problems
export async function listProblems(): Promise<
  Array<{
    id: string;
    title: string;
    difficulty: string;
    createdAt: Date;
  }>
> {
  const result = await db
    .select({
      id: problems.id,
      title: problems.title,
      difficulty: difficulties.name,
      createdAt: problems.createdAt,
    })
    .from(problems)
    .innerJoin(difficulties, eq(problems.difficultyId, difficulties.id))
    .orderBy(problems.createdAt);

  return result;
}
