// Types
export type {
  TestResult,
  CustomTestResult,
  SandboxConfig,
  TestCase,
  SupportedLanguage,
  LanguageConfig,
} from "./src/types";

// Re-export Database type from @repo/db
export type { Database } from "@repo/db";

// Constants
export { DEFAULT_LANGUAGE } from "./src/constants";

// Sandbox
export { Sandbox } from "./src/sandbox";
export type { ExecuteCommandResult } from "./src/sandbox";

// Runners
export {
  getRunnerTemplate,
  getLanguageConfig,
  LANGUAGE_CONFIGS,
  RUNNER_TEMPLATES,
} from "./src/runners";

// Problem text
export {
  generateProblemText,
  getProblemText,
} from "./src/generate-problem-text";

// Function signature schema
export {
  parseFunctionSignature,
  getFunctionSignatureSchema,
} from "./src/parse-function-signature";

// Code generators
export {
  createCodeGenerator,
  TypeScriptGenerator,
  PythonGenerator,
} from "./src/code-generator";
export type { CodeGenerator, CodeGenLanguage } from "./src/code-generator";
export { CodeGenLanguageSchema } from "./src/code-generator";

// Test cases
export { generateTestCases, getTestCases } from "./src/generate-test-cases";

// Test case input code
export {
  generateTestCaseInputCode,
  getTestCaseInputCode,
} from "./src/generate-test-case-input-code";

// Test case inputs
export {
  generateTestCaseInputs,
  getTestCaseInputs,
} from "./src/generate-test-case-inputs";

// Solution
export { generateSolution, getSolution } from "./src/generate-solution";

// Test case outputs
export {
  generateTestCaseOutputs,
  getTestCaseOutputs,
  runReferenceSolutionOnInput,
} from "./src/generate-test-case-outputs";

// Run user solution
export {
  runUserSolution,
  runUserSolutionWithCustomInputs,
} from "./src/run-user-solution";
