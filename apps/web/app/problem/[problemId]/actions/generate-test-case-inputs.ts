import { backendGet, backendPost } from "@/lib/backend-client";

export async function generateTestCaseInputs(
  problemId: string,
  encryptedUserId?: string
) {
  return backendPost<unknown[]>(
    `/problems/${problemId}/test-cases/inputs/generate`,
    undefined,
    encryptedUserId
  );
}

export async function getTestCaseInputs(
  problemId: string,
  encryptedUserId?: string
) {
  return backendGet<unknown[]>(
    `/problems/${problemId}/test-cases/inputs`,
    encryptedUserId
  );
}
