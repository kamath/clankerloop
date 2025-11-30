import { backendGet, backendPost } from "@/lib/backend-client";

export async function generateTestCaseInputCode(
  problemId: string,
  encryptedUserId?: string
) {
  return backendPost<string[]>(
    `/problems/${problemId}/test-cases/input-code/generate`,
    undefined,
    encryptedUserId
  );
}

export async function getTestCaseInputCode(
  problemId: string,
  encryptedUserId?: string
) {
  return backendGet<string[]>(
    `/problems/${problemId}/test-cases/input-code`,
    encryptedUserId
  );
}
