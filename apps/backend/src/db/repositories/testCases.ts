import { eq } from 'drizzle-orm';
import {
  db,
  testCases,
  testCaseDescriptions,
  testInputCodes,
  languages,
} from '@repo/db';
import { getLanguageId } from './problems';

import type {
  TestCase as AppTestCase,
  TestCaseDescription as AppTestCaseDescription,
  TestCaseInputCode as AppTestCaseInputCode,
  Language as AppLanguage,
} from '../../types/index';

// Create a test case description
export async function createTestCaseDescription(
  problemId: string,
  description: AppTestCaseDescription,
): Promise<string> {
  const [inserted] = await db
    .insert(testCaseDescriptions)
    .values({
      problemId,
      description: description.description,
      expectedBehavior: description.expectedBehavior,
      isEdgeCase: description.isEdgeCase,
    })
    .returning({ id: testCaseDescriptions.id });

  return inserted.id;
}

// Create multiple test case descriptions
export async function createTestCaseDescriptions(
  problemId: string,
  descriptions: AppTestCaseDescription[],
): Promise<string[]> {
  if (descriptions.length === 0) {
    return [];
  }

  const inserted = await db
    .insert(testCaseDescriptions)
    .values(
      descriptions.map((desc) => ({
        problemId,
        description: desc.description,
        expectedBehavior: desc.expectedBehavior,
        isEdgeCase: desc.isEdgeCase,
      })),
    )
    .returning({ id: testCaseDescriptions.id });

  return inserted.map((row) => row.id);
}

// Get test case descriptions for a problem
export async function getTestCaseDescriptionsByProblem(
  problemId: string,
): Promise<AppTestCaseDescription[]> {
  const result = await db
    .select({
      id: testCaseDescriptions.id,
      description: testCaseDescriptions.description,
      expectedBehavior: testCaseDescriptions.expectedBehavior,
      isEdgeCase: testCaseDescriptions.isEdgeCase,
    })
    .from(testCaseDescriptions)
    .where(eq(testCaseDescriptions.problemId, problemId));

  return result.map((row) => ({
    id: row.id,
    description: row.description,
    expectedBehavior: row.expectedBehavior,
    isEdgeCase: row.isEdgeCase,
  }));
}

// Create a test case
export async function createTestCase(
  problemId: string,
  testCase: AppTestCase,
  testCaseDescriptionId?: string,
): Promise<string> {
  const [inserted] = await db
    .insert(testCases)
    .values({
      problemId,
      testCaseDescriptionId,
      description: testCase.description,
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      isEdgeCase: testCase.isEdgeCase,
      isSample: testCase.isSample,
    })
    .returning({ id: testCases.id });

  return inserted.id;
}

// Create multiple test cases
export async function createTestCases(
  problemId: string,
  testCasesData: AppTestCase[],
): Promise<string[]> {
  if (testCasesData.length === 0) {
    return [];
  }

  const inserted = await db
    .insert(testCases)
    .values(
      testCasesData.map((tc) => ({
        problemId,
        description: tc.description,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isEdgeCase: tc.isEdgeCase,
        isSample: tc.isSample,
      })),
    )
    .returning({ id: testCases.id });

  return inserted.map((row) => row.id);
}

// Get test cases for a problem
export async function getTestCasesByProblem(
  problemId: string,
): Promise<AppTestCase[]> {
  const result = await db
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

  return result.map((row) => ({
    id: row.id,
    description: row.description,
    input: row.input,
    expectedOutput: row.expectedOutput,
    isEdgeCase: row.isEdgeCase,
    isSample: row.isSample,
  }));
}

// Create test input code
export async function createTestInputCode(
  testCaseId: string,
  inputCode: AppTestCaseInputCode,
): Promise<string> {
  const languageId = await getLanguageId(inputCode.language);

  const [inserted] = await db
    .insert(testInputCodes)
    .values({
      testCaseId,
      languageId,
      code: inputCode.code,
    })
    .returning({ id: testInputCodes.id });

  return inserted.id;
}

// Get test input codes for a test case
export async function getTestInputCodesByTestCase(
  testCaseId: string,
): Promise<AppTestCaseInputCode[]> {
  const result = await db
    .select({
      id: testInputCodes.id,
      code: testInputCodes.code,
      languageName: languages.name,
    })
    .from(testInputCodes)
    .innerJoin(languages, eq(testInputCodes.languageId, languages.id))
    .where(eq(testInputCodes.testCaseId, testCaseId));

  return result.map((row) => ({
    testCaseId,
    language: row.languageName as AppLanguage,
    code: row.code,
  }));
}

// Delete a test case
export async function deleteTestCase(testCaseId: string): Promise<void> {
  await db.delete(testCases).where(eq(testCases.id, testCaseId));
}

// Delete a test case description
export async function deleteTestCaseDescription(
  descriptionId: string,
): Promise<void> {
  await db
    .delete(testCaseDescriptions)
    .where(eq(testCaseDescriptions.id, descriptionId));
}
