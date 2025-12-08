import { apiPost } from "@/lib/api-client";
import type { TestResult, CustomTestResult } from "@repo/api-types";

// Re-export types for consumers
export type { TestCase, TestResult, CustomTestResult } from "@repo/api-types";

// Define CodeGenLanguage type (shared with hooks)
export type CodeGenLanguage = "typescript" | "python" | "cpp";

export async function runUserSolution(
  problemId: string,
  userCode: string,
  language: CodeGenLanguage = "typescript",
  encryptedUserId?: string,
): Promise<TestResult[]> {
  return apiPost<TestResult[]>(
    `/${problemId}/solution/run`,
    { code: userCode, language },
    encryptedUserId,
  );
}

export async function runUserSolutionWithCustomInputs(
  problemId: string,
  userCode: string,
  customInputs: unknown[][],
  language: CodeGenLanguage = "typescript",
  encryptedUserId?: string,
): Promise<CustomTestResult[]> {
  return apiPost<CustomTestResult[]>(
    `/${problemId}/solution/run-custom`,
    { code: userCode, customInputs, language },
    encryptedUserId,
  );
}
