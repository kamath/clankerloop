import { apiGet, apiPost } from "@/lib/api-client";
import type { TestCase, TestCaseDescription } from "@repo/api-types";

interface TestCasesGenerateResponse {
  testCases: TestCaseDescription[];
  jobId: string | null;
}

export async function generateTestCases(
  problemId: string,
  model: string,
  encryptedUserId?: string,
  enqueueNextStep: boolean = true,
  forceError?: boolean,
  returnDummy?: boolean,
) {
  const data = await apiPost<TestCasesGenerateResponse>(
    `/${problemId}/test-cases/generate`,
    { model, enqueueNextStep, forceError, returnDummy },
    encryptedUserId,
  );
  return data.testCases;
}

export async function getTestCases(
  problemId: string,
  encryptedUserId?: string,
) {
  return apiGet<TestCase[]>(`/${problemId}/test-cases`, encryptedUserId);
}
