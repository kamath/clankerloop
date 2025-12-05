import { Sandbox } from "./sandbox";
import { getProblem, type Database } from "@repo/db";
import { getLanguageConfig, getRunnerTemplate } from "./runners";
import type { TestResult, SupportedLanguage, CustomTestResult } from "./types";
import { runReferenceSolutionOnInput } from "./generate-test-case-outputs";
import { getPostHogClient } from "@/utils/analytics";
import { pLimit, getConcurrency } from "./concurrency";

const WORK_DIR = ".";

export async function runUserSolution(
  problemId: string,
  userCode: string,
  sandbox: Sandbox,
  db: Database,
  language: SupportedLanguage = "typescript",
  env: Env,
): Promise<TestResult[]> {
  const { testCases, generatedByUserId } = await getProblem(problemId, db);
  if (!testCases || testCases.length === 0) {
    throw new Error(
      "No test cases found. Please generate test case descriptions and inputs first.",
    );
  }

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    if (!testCase) {
      throw new Error(`Test case at index ${i} is undefined`);
    }
    if (testCase.input === null || testCase.input === undefined) {
      throw new Error(
        `Test case ${i + 1} is missing input. Please generate test case inputs first.`,
      );
    }
    if (testCase.expected === null || testCase.expected === undefined) {
      throw new Error(
        `Test case ${i + 1} is missing expected output. Please generate test case outputs first.`,
      );
    }
  }

  const config = getLanguageConfig(language);
  const runnerTemplate = getRunnerTemplate(language);

  const solutionPath = `${WORK_DIR}/solution.${config.extension}`;
  const runnerPath = `${WORK_DIR}/runner.${config.extension}`;

  // Prepare code using language-specific preparation function
  const preparedCode = config.prepareCode(userCode);

  let results: TestResult[] = [];

  try {
    // Upload user solution file and runner once
    await sandbox.uploadFile(Buffer.from(preparedCode, "utf-8"), solutionPath);
    await sandbox.uploadFile(Buffer.from(runnerTemplate, "utf-8"), runnerPath);

    const limit = pLimit(getConcurrency(env));
    const settledResults = await Promise.allSettled(
      testCases.map((testCase, index) =>
        limit(async (): Promise<TestResult> => {
          if (!testCase) {
            throw new Error(`Test case at index ${index} is undefined`);
          }

          const inputPath = `${WORK_DIR}/input_${index}.json`;
          const outputPath = `${WORK_DIR}/output_${index}.json`;

          // Upload input JSON for this test case
          const inputJson = JSON.stringify(testCase.input);
          await sandbox.uploadFile(Buffer.from(inputJson, "utf-8"), inputPath);

          // Execute the runner with unique input/output paths
          const command = `${config.runCommand} runner.${config.extension} ${inputPath} ${outputPath}`;
          const result = await sandbox.executeCommand(command, WORK_DIR);
          console.log("result", JSON.stringify(result, null, 2));

          // If exitCode !== 0, treat as runner execution failure
          if (result.exitCode !== 0) {
            return {
              testCase,
              status: "error",
              actual: null,
              expected: testCase.expected,
              error:
                "Execution failed. Please abide by the given function signature and structure.",
            };
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
            return {
              testCase,
              status: "error",
              actual: null,
              expected: testCase.expected,
              error:
                "Execution failed. Please abide by the given function signature and structure.",
            };
          }

          // Handle user code error (success === false)
          if (outputData.success === false) {
            const errorMessage = outputData.error || "Unknown error";
            const trace = outputData.trace || "";
            const errorWithTrace = trace
              ? `${errorMessage}\n\n${trace}`
              : errorMessage;
            return {
              testCase,
              status: "error",
              actual: null,
              expected: testCase.expected,
              error: errorWithTrace,
              stdout: outputData.stdout,
            };
          }

          // Handle success (success === true)
          if (outputData.success === true) {
            const actualStr = JSON.stringify(outputData.result);
            const expectedStr = JSON.stringify(testCase.expected);
            const status = actualStr === expectedStr ? "pass" : "fail";
            return {
              testCase,
              status,
              actual: outputData.result,
              expected: testCase.expected,
              stdout: outputData.stdout,
            };
          }

          console.warn(
            "Unexpected output format",
            JSON.stringify(outputData, null, 2),
          );

          // Unexpected output format
          return {
            testCase,
            status: "error",
            actual: null,
            expected: testCase.expected,
            error:
              "Execution failed. Please abide by the given function signature and structure.",
          };
        }),
      ),
    );

    // Convert settled results to TestResult array
    results = settledResults.map((settled, index) => {
      if (settled.status === "fulfilled") {
        return settled.value;
      }
      const testCase = testCases[index]!;
      return {
        testCase,
        status: "error" as const,
        actual: null,
        expected: testCase.expected,
        error:
          settled.reason instanceof Error
            ? settled.reason.message
            : String(settled.reason),
      };
    });
  } finally {
    await sandbox.kill();
  }

  // Log PostHog event
  const userId = generatedByUserId || "unknown";
  const allTestsPassed = results.every((r) => r.status === "pass");
  const phClient = getPostHogClient(env);
  await phClient.capture({
    distinctId: userId,
    event: "run_user_solution",
    properties: {
      problemId,
      language,
      testCaseCount: testCases.length,
      allTestsPassed,
    },
  });

  return results;
}

export async function runUserSolutionWithCustomInputs(
  problemId: string,
  userCode: string,
  customInputs: unknown[][],
  sandbox: Sandbox,
  db: Database,
  language: SupportedLanguage = "typescript",
  env: Env,
): Promise<CustomTestResult[]> {
  // Validate inputs
  if (!customInputs || customInputs.length === 0) {
    throw new Error("No custom inputs provided.");
  }

  // Fetch problem to get function signature for validation and reference solution
  const problem = await getProblem(problemId, db);
  const schema = problem.functionSignatureSchema;
  const referenceSolution = problem.solution;
  const userId = problem.generatedByUserId || "unknown";

  if (!schema) {
    throw new Error(
      "Function signature schema not found. Please generate the problem first.",
    );
  }

  if (!referenceSolution) {
    throw new Error(
      "Reference solution not found. Please generate the solution first.",
    );
  }

  // Calculate expected argument count
  const requiredParams = schema.parameters.filter((p) => !p.optional).length;
  const totalParams = schema.parameters.length;

  for (let i = 0; i < customInputs.length; i++) {
    const input = customInputs[i];
    if (!Array.isArray(input)) {
      throw new Error(
        `Custom input at index ${i} must be an array of function arguments.`,
      );
    }

    // Validate argument count
    if (input.length < requiredParams) {
      throw new Error(
        `Custom input at index ${i} has ${input.length} arguments, but the function requires at least ${requiredParams} arguments.`,
      );
    }

    if (input.length > totalParams) {
      throw new Error(
        `Custom input at index ${i} has ${input.length} arguments, but the function only accepts ${totalParams} arguments.`,
      );
    }
  }

  const config = getLanguageConfig(language);
  const runnerTemplate = getRunnerTemplate(language);

  const userSolutionPath = `${WORK_DIR}/user.${config.extension}`;
  const solutionPath = `${WORK_DIR}/solution.${config.extension}`;
  const runnerPath = `${WORK_DIR}/runner.${config.extension}`;

  const preparedUserCode = config.prepareCode(userCode);

  try {
    // Upload user solution and runner once upfront
    // Reference solution is executed via runReferenceSolutionOnInput() which uses inline execution
    await sandbox.uploadFile(
      Buffer.from(preparedUserCode, "utf-8"),
      userSolutionPath,
    );
    await sandbox.uploadFile(Buffer.from(runnerTemplate, "utf-8"), runnerPath);
    // Copy user solution to solution.ext (what runner expects) - do this once
    await sandbox.executeCommand(
      `cp ${userSolutionPath} ${solutionPath}`,
      WORK_DIR,
    );

    const limit = pLimit(getConcurrency(env));
    const settledResults = await Promise.allSettled(
      customInputs.map((input, index) =>
        limit(async (): Promise<CustomTestResult> => {
          if (!input) {
            throw new Error(`Custom input at index ${index} is undefined`);
          }

          const inputPath = `${WORK_DIR}/input_${index}.json`;
          const outputPath = `${WORK_DIR}/output_${index}.json`;
          const refOutputFile = `ref_output_${index}.json`;

          // Upload input JSON for this test case
          const inputJson = JSON.stringify(input);
          await sandbox.uploadFile(Buffer.from(inputJson, "utf-8"), inputPath);

          // Run reference solution to get expected output using the abstracted function
          const expected = await runReferenceSolutionOnInput(
            problemId,
            input,
            sandbox,
            db,
            refOutputFile,
          );

          // Run user solution
          const command = `${config.runCommand} runner.${config.extension} ${inputPath} ${outputPath}`;
          const result = await sandbox.executeCommand(command, WORK_DIR);
          console.log("result", JSON.stringify(result, null, 2));

          // If exitCode !== 0, treat as runner execution failure
          if (result.exitCode !== 0) {
            return {
              input,
              expected,
              actual: null,
              error:
                "Execution failed. Please abide by the given function signature and structure.",
            };
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
            return {
              input,
              expected,
              actual: null,
              error:
                "Execution failed. Please abide by the given function signature and structure.",
            };
          }

          // Handle user code error (success === false)
          if (outputData.success === false) {
            const errorMessage = outputData.error || "Unknown error";
            const trace = outputData.trace || "";
            const errorWithTrace = trace
              ? `${errorMessage}\n\n${trace}`
              : errorMessage;
            return {
              input,
              expected,
              actual: null,
              error: errorWithTrace,
              stdout: outputData.stdout,
            };
          }

          // Handle success (success === true)
          if (outputData.success === true) {
            return {
              input,
              expected,
              actual: outputData.result,
              stdout: outputData.stdout,
            };
          }

          console.warn(
            "Unexpected output format",
            JSON.stringify(outputData, null, 2),
          );

          // Unexpected output format
          return {
            input,
            expected,
            actual: null,
            error:
              "Execution failed. Please abide by the given function signature and structure.",
          };
        }),
      ),
    );

    // Convert settled results to CustomTestResult array
    const results: CustomTestResult[] = settledResults.map((settled, index) => {
      if (settled.status === "fulfilled") {
        return settled.value;
      }
      const input = customInputs[index]!;
      return {
        input,
        expected: null,
        actual: null,
        error:
          settled.reason instanceof Error
            ? settled.reason.message
            : String(settled.reason),
      };
    });

    // Log PostHog event
    const phClient = getPostHogClient(env);
    await phClient.capture({
      distinctId: userId,
      event: "run_user_solution_with_custom_inputs",
      properties: {
        problemId,
        language,
        customInputCount: customInputs.length,
      },
    });

    return results;
  } finally {
    await sandbox.kill();
  }
}
