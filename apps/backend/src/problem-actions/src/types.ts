import type { TestCase } from "@repo/db";

export type { TestCase } from "@repo/db";

export type TestResult = {
  testCase: TestCase;
  status: "pass" | "fail" | "error";
  actual: unknown | null;
  error?: string;
};

export interface SandboxConfig {
  apiKey: string;
}

export type SupportedLanguage = "typescript" | "javascript" | "python";

export interface LanguageConfig {
  extension: string;
  runCommand: string;
  sandboxLanguage: string;
}
