import { eq, and } from 'drizzle-orm';
import { db, solutions, languages } from '@repo/db';
import { getLanguageId } from './problems';

import type { Solution as AppSolution, Language as AppLanguage } from '../../types/index';

// Create a new solution
export async function createSolution(
  problemId: string,
  solution: AppSolution,
): Promise<string> {
  const languageId = await getLanguageId(solution.language);

  const [insertedSolution] = await db
    .insert(solutions)
    .values({
      problemId,
      languageId,
      code: solution.code,
      explanation: solution.explanation,
      timeComplexity: solution.timeComplexity,
      spaceComplexity: solution.spaceComplexity,
    })
    .returning({ id: solutions.id });

  return insertedSolution.id;
}

// Get solution by problem ID and language
export async function getSolutionByProblemAndLanguage(
  problemId: string,
  language: AppLanguage,
): Promise<AppSolution | null> {
  const languageId = await getLanguageId(language);

  const result = await db
    .select({
      id: solutions.id,
      code: solutions.code,
      explanation: solutions.explanation,
      timeComplexity: solutions.timeComplexity,
      spaceComplexity: solutions.spaceComplexity,
      languageName: languages.name,
    })
    .from(solutions)
    .innerJoin(languages, eq(solutions.languageId, languages.id))
    .where(and(eq(solutions.problemId, problemId), eq(solutions.languageId, languageId)))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const row = result[0];

  return {
    problemId,
    language: row.languageName as AppLanguage,
    code: row.code,
    explanation: row.explanation,
    timeComplexity: row.timeComplexity,
    spaceComplexity: row.spaceComplexity,
  };
}

// Get all solutions for a problem
export async function getSolutionsByProblem(
  problemId: string,
): Promise<AppSolution[]> {
  const result = await db
    .select({
      id: solutions.id,
      code: solutions.code,
      explanation: solutions.explanation,
      timeComplexity: solutions.timeComplexity,
      spaceComplexity: solutions.spaceComplexity,
      languageName: languages.name,
    })
    .from(solutions)
    .innerJoin(languages, eq(solutions.languageId, languages.id))
    .where(eq(solutions.problemId, problemId));

  return result.map((row) => ({
    problemId,
    language: row.languageName as AppLanguage,
    code: row.code,
    explanation: row.explanation,
    timeComplexity: row.timeComplexity,
    spaceComplexity: row.spaceComplexity,
  }));
}

// Delete a solution
export async function deleteSolution(solutionId: string): Promise<void> {
  await db.delete(solutions).where(eq(solutions.id, solutionId));
}
