import { Sandbox } from "./sandbox";
import {
  getProblem,
  updateTestCase,
  type TestCase,
  type Database,
} from "@repo/db";
import { getPostHogClient } from "@/utils/analytics";
import { pLimit, getConcurrency } from "./concurrency";

export async function generateTestCaseInputs(
  problemId: string,
  sandbox: Sandbox,
  db: Database,
  env: Env,
) {
  const { testCases, generatedByUserId } = await getProblem(problemId, db);
  if (!testCases) {
    throw new Error(
      "No code found to generate test case inputs for problem ID: " +
        problemId +
        ". You must generate the code first.",
    );
  }

  const limit = pLimit(getConcurrency(env));
  const results = await Promise.all(
    testCases.map((testCase, index) =>
      limit(async () => {
        const outputFile = `output_${index}.json`;
        const result = await sandbox.run(
          testCase.inputCode +
            "; const output = generateTestInput();" +
            `require('fs').writeFileSync('${outputFile}', JSON.stringify(output));`,
        );
        if (result.exitCode !== 0) {
          throw new Error(
            `Failed to generate test case input for test case ${testCase.id}: exitCode ${result.exitCode}`,
          );
        }
        console.log("Result of running sandbox code:", result);
        return JSON.parse(await sandbox.readFile(outputFile));
      }),
    ),
  );

  await sandbox.kill();

  for (let index = 0; index < testCases.length; index++) {
    const testCase = testCases[index];
    if (!testCase) {
      throw new Error(`Test case at index ${index} is undefined`);
    }
    const result = results[index];
    if (result === undefined) {
      throw new Error(`Failed to generate result for test case ${index + 1}`);
    }
    if (!Array.isArray(result)) {
      throw new Error(
        `Result for test case ${index + 1} is not an array, got: ${typeof result}`,
      );
    }
    await updateTestCase(testCase.id, { input: result }, db);
  }

  // Log PostHog event
  const userId = generatedByUserId || "unknown";
  const phClient = getPostHogClient(env);
  await phClient.capture({
    distinctId: userId,
    event: "generate_test_case_inputs",
    properties: {
      problemId,
      testCaseCount: testCases.length,
    },
  });

  return results;
}

export async function getTestCaseInputs(problemId: string, db: Database) {
  const { testCases } = await getProblem(problemId, db);
  return testCases.map((testCase: TestCase) => testCase.input);
}
