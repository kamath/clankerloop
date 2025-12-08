import type { TestCase } from "@repo/db";

export type { TestCase } from "@repo/db";

export type TestResult = {
  testCase: TestCase;
  status: "pass" | "fail" | "error";
  actual: unknown | null;
  expected: unknown | null;
  error?: string;
  stdout?: string;
};

export type CustomTestResult = {
  input: unknown;
  expected: unknown | null;
  actual: unknown | null;
  error?: string;
  stdout?: string;
};

export interface SandboxConfig {
  apiKey: string;
}

export type SupportedLanguage = "typescript" | "javascript" | "python" | "cpp";

export interface LanguageConfig {
  extension: string;
  runCommand: string;
  sandboxLanguage: string;
  /**
   * Prepares user code for execution by adding necessary exports/declarations.
   * This function should be idempotent - calling it multiple times should not cause issues.
   * @param userCode - The raw user code
   * @returns The prepared code ready for execution
   */
  prepareCode: (userCode: string) => string;
}
