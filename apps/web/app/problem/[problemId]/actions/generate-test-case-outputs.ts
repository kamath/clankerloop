import { backendGet, backendPost } from "@/lib/backend-client";

export async function generateTestCaseOutputs(
  problemId: string,
  encryptedUserId?: string
) {
  return backendPost<unknown[]>(
    `/problems/${problemId}/test-cases/outputs/generate`,
    undefined,
    encryptedUserId
  );
}

export async function getTestCaseOutputs(
  problemId: string,
  encryptedUserId?: string
) {
  return backendGet<unknown[]>(
    `/problems/${problemId}/test-cases/outputs`,
    encryptedUserId
  );
}
