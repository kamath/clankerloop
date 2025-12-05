import { Sandbox } from "./sandbox";
import { getSolution } from "./generate-solution";
import {
  getProblem,
  updateTestCase,
  type TestCase,
  type Database,
} from "@repo/db";
import { getPostHogClient } from "@/utils/analytics";
import { pLimit, getConcurrency } from "./concurrency";

/**
 * Runs the reference solution on an arbitrary input and returns the expected output.
 * Uses inline code execution (TypeScript/JavaScript only).
 *
 * @param problemId - The problem ID to fetch the solution for
 * @param input - The input to run the solution on (array of function arguments)
 * @param sandbox - The sandbox instance to execute code in
 * @param db - The database instance
 * @param outputFileName - The output file name to write results to (for parallel execution)
 * @returns The expected output value, or null if execution failed
 */
export async function runReferenceSolutionOnInput(
  problemId: string,
  input: unknown,
  sandbox: Sandbox,
  db: Database,
  outputFileName: string = "output.json",
): Promise<unknown | null> {
  try {
    const solution = await getSolution(problemId, db);
    if (!solution) {
      return null;
    }

    await sandbox.run(
      solution +
        "; const output = runSolution(..." +
        JSON.stringify(input) +
        ");" +
        `require('fs').writeFileSync('${outputFileName}', JSON.stringify(output));`,
    );
    const outputContent = await sandbox.readFile(outputFileName);
    return JSON.parse(outputContent);
  } catch {
    // Return null on any error (execution failure, parse failure, etc.)
    return null;
  }
}

export async function generateTestCaseOutputs(
  problemId: string,
  sandbox: Sandbox,
  db: Database,
  env: Env,
) {
  const { testCases, generatedByUserId } = await getProblem(problemId, db);
  if (!testCases) {
    throw new Error(
      "No test cases found. Please generate test case descriptions and inputs first.",
    );
  }

  const limit = pLimit(getConcurrency(env));
  const results = await Promise.all(
    testCases.map((testCase, index) =>
      limit(async () => {
        const outputFile = `output_${index}.json`;
        const result = await runReferenceSolutionOnInput(
          problemId,
          testCase.input,
          sandbox,
          db,
          outputFile,
        );
        if (result === null) {
          throw new Error(
            `Failed to generate result for test case ${testCase.id || "unknown"}`,
          );
        }
        return result;
      }),
    ),
  );

  await sandbox.kill();

  for (let index = 0; index < testCases.length; index++) {
    const testCase = testCases[index];
    const result = results[index];
    if (result === undefined) {
      throw new Error(`Failed to generate result for test case ${index + 1}`);
    }
    if (!testCase) {
      throw new Error(`Test case at index ${index} is undefined`);
    }
    await updateTestCase(testCase.id, { expected: result }, db);
  }

  // Log PostHog event
  const userId = generatedByUserId || "unknown";
  const phClient = getPostHogClient(env);
  await phClient.capture({
    distinctId: userId,
    event: "generate_test_case_outputs",
    properties: {
      problemId,
      testCaseCount: testCases.length,
    },
  });

  return results;
}

export async function getTestCaseOutputs(problemId: string, db: Database) {
  const { testCases } = await getProblem(problemId, db);
  return testCases.map((testCase: TestCase) => testCase.expected);
}
