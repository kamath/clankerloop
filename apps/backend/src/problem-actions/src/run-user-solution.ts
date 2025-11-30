import { Sandbox } from "./sandbox";
import { getProblem } from "@repo/db";
import { getLanguageConfig, getRunnerTemplate } from "./runners";
import type { TestResult, SupportedLanguage } from "./types";

const WORK_DIR = ".";

export async function runUserSolution(
  problemId: string,
  userCode: string,
  sandbox: Sandbox,
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

  const results: TestResult[] = [];

  const solutionPath = `${WORK_DIR}/solution.${config.extension}`;
  const runnerPath = `${WORK_DIR}/runner.${config.extension}`;
  const inputPath = `${WORK_DIR}/input.json`;

  // Prepare code using language-specific preparation function
  const preparedCode = config.prepareCode(userCode);

  try {
    // Upload user solution file
    await sandbox.uploadFile(Buffer.from(preparedCode, "utf-8"), solutionPath);
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
        console.log("result", JSON.stringify(result, null, 2));

        const outputPath = `${WORK_DIR}/output.json`;

        // If exitCode !== 0, treat as runner execution failure
        if (result.exitCode !== 0) {
          results.push({
            testCase,
            status: "error",
            actual: null,
            error:
              "Execution failed. Please abide by the given function signature and structure.",
          });
          continue;
        }

        // Try to read output.json
        let outputData: {
          success: boolean;
          result?: unknown;
          error?: string;
          trace?: string;
          stdout?: string;
        };

        try {
          const outputContent = await sandbox.readFile(outputPath);
          outputData = JSON.parse(outputContent);
        } catch {
          // If output.json doesn't exist or is malformed, treat as runner execution failure
          results.push({
            testCase,
            status: "error",
            actual: null,
            error:
              "Execution failed. Please abide by the given function signature and structure.",
          });
          continue;
        }

        // Handle user code error (success === false)
        if (outputData.success === false) {
          const errorMessage = outputData.error || "Unknown error";
          const trace = outputData.trace || "";
          const errorWithTrace = trace
            ? `${errorMessage}\n\n${trace}`
            : errorMessage;
          results.push({
            testCase,
            status: "error",
            actual: null,
            error: errorWithTrace,
            stdout: outputData.stdout,
          });
          continue;
        }

        // Handle success (success === true)
        if (outputData.success === true) {
          const actualStr = JSON.stringify(outputData.result);
          const expectedStr = JSON.stringify(testCase.expected);
          const status = actualStr === expectedStr ? "pass" : "fail";
          results.push({
            testCase,
            status,
            actual: outputData.result,
            stdout: outputData.stdout,
          });
          continue;
        }

        console.warn(
          "Unexpected output format",
          JSON.stringify(outputData, null, 2)
        );

        // Unexpected output format
        results.push({
          testCase,
          status: "error",
          actual: null,
          error:
            "Execution failed. Please abide by the given function signature and structure.",
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
