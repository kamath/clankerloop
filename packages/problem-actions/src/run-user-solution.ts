import { Sandbox } from "./sandbox";
import { getProblem } from "@repo/db";
import { getLanguageConfig, getRunnerTemplate } from "./runners";
import type { TestResult, SandboxConfig, SupportedLanguage } from "./types";

const WORK_DIR = "/home/daytona";

export async function runUserSolution(
  problemId: string,
  userCode: string,
  sandboxConfig: SandboxConfig,
  language: SupportedLanguage = "typescript"
): Promise<TestResult[]> {
  const { testCases } = await getProblem(problemId);
  if (!testCases || testCases.length === 0) {
    throw new Error(
      "No test cases found. Please generate test case descriptions and inputs first."
    );
  }

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    if (!testCase) {
      throw new Error(`Test case at index ${i} is undefined`);
    }
    if (testCase.input === null || testCase.input === undefined) {
      throw new Error(
        `Test case ${i + 1} is missing input. Please generate test case inputs first.`
      );
    }
    if (testCase.expected === null || testCase.expected === undefined) {
      throw new Error(
        `Test case ${i + 1} is missing expected output. Please generate test case outputs first.`
      );
    }
  }

  const config = getLanguageConfig(language);
  const runnerTemplate = getRunnerTemplate(language);

  const sandbox = await Sandbox.create(config.sandboxLanguage, sandboxConfig);
  const results: TestResult[] = [];

  const solutionPath = `${WORK_DIR}/solution.${config.extension}`;
  const runnerPath = `${WORK_DIR}/runner.${config.extension}`;
  const inputPath = `${WORK_DIR}/input.json`;

  try {
    // Upload user solution file
    await sandbox.uploadFile(Buffer.from(userCode, "utf-8"), solutionPath);

    // Upload runner file
    await sandbox.uploadFile(Buffer.from(runnerTemplate, "utf-8"), runnerPath);

    for (let index = 0; index < testCases.length; index++) {
      const testCase = testCases[index];
      if (!testCase) {
        throw new Error(`Test case at index ${index} is undefined`);
      }

      try {
        // Upload input JSON for this test case
        const inputJson = JSON.stringify(testCase.input);
        await sandbox.uploadFile(Buffer.from(inputJson, "utf-8"), inputPath);

        // Execute the runner
        const command = `${config.runCommand} runner.${config.extension} input.json`;
        const result = await sandbox.executeCommand(command, WORK_DIR);

        if (result.exitCode !== 0) {
          // Non-zero exit code indicates an error
          const errorMessage = result.stderr || result.stdout || "Execution failed";
          results.push({
            testCase,
            status: "error",
            actual: null,
            error: errorMessage,
          });
          continue;
        }

        // Parse stdout as JSON for the result
        const stdout = result.stdout.trim();
        let actualOutput: unknown;
        try {
          actualOutput = JSON.parse(stdout);
        } catch {
          results.push({
            testCase,
            status: "error",
            actual: null,
            error: `Failed to parse output as JSON: ${stdout}`,
          });
          continue;
        }

        const actualStr = JSON.stringify(actualOutput);
        const expectedStr = JSON.stringify(testCase.expected);
        const status = actualStr === expectedStr ? "pass" : "fail";

        results.push({
          testCase,
          status,
          actual: actualOutput,
        });
      } catch (error) {
        results.push({
          testCase,
          status: "error",
          actual: null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } finally {
    await sandbox.kill();
  }

  return results;
}
