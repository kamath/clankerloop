"use server";

import { Sandbox } from "@/lib/sandbox";
import { DEFAULT_LANGUAGE } from "@/lib/consts";
import { getSolution } from "./generate-solution";
import { getTestCases } from "./generate-test-cases";
import { getProblem, updateTestCase, type TestCase } from "@repo/db";

export async function generateTestCaseOutputs(problemId: string) {
  const solution = await getSolution(problemId);
  // Get existing test cases
  const { testCases } = await getProblem(problemId);
  if (!testCases) {
    throw new Error(
      "No test cases found. Please generate test case descriptions and inputs first."
    );
  }
  const sandbox = await Sandbox.create(DEFAULT_LANGUAGE);

  // Run executions sequentially to avoid conflicts with single-process sandbox
  const results: unknown[] = [];
  for (const testCase of testCases) {
    // TODO: handle errors
    await sandbox.run(
      solution +
        "; const output = runSolution(..." +
        JSON.stringify(testCase.input) +
        ");" +
        // Write the output to a file
        "require('fs').writeFileSync('output.json', JSON.stringify(output));"
    );
    results.push(JSON.parse(await sandbox.readFile("output.json")));
  }

  await sandbox.kill();

  // Update each test case with its expected output
  for (let index = 0; index < testCases.length; index++) {
    const testCase = testCases[index];
    const result = results[index];
    if (result === undefined) {
      throw new Error(`Failed to generate result for test case ${index + 1}`);
    }
    if (!testCase) {
      throw new Error(`Test case at index ${index} is undefined`);
    }
    await updateTestCase(testCase.id, { expected: result });
  }

  return results;
}

export async function getTestCaseOutputs(problemId: string) {
  const { testCases } = await getProblem(problemId);
  return testCases.map((testCase: TestCase) => testCase.expected);
}
