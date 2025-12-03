import { Sandbox } from "./sandbox";
import {
  getProblem,
  updateTestCase,
  type TestCase,
  type Database,
} from "@repo/db";

export async function generateTestCaseInputs(
  problemId: string,
  sandbox: Sandbox,
  db: Database,
) {
  const { testCases } = await getProblem(problemId, db);
  if (!testCases) {
    throw new Error(
      "No code found to generate test case inputs for problem ID: " +
        problemId +
        ". You must generate the code first.",
    );
  }

  const results: unknown[] = [];
  for (const testCase of testCases) {
    const result = await sandbox.run(
      testCase.inputCode +
        "; const output = generateTestInput();" +
        "require('fs').writeFileSync('output.json', JSON.stringify(output));",
    );
    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to generate test case input for test case ${testCase.id}: exitCode ${result.exitCode}`,
      );
    }
    console.log("Result of running sandbox code:", result);
    results.push(JSON.parse(await sandbox.readFile("output.json")));
  }

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

  return results;
}

export async function getTestCaseInputs(problemId: string, db: Database) {
  const { testCases } = await getProblem(problemId, db);
  return testCases.map((testCase: TestCase) => testCase.input);
}
