import { backendGet, backendPost } from "@/lib/backend-client";

export async function generateTestCases(
  problemId: string,
  encryptedUserId?: string
) {
  return backendPost<{ description: string; isEdgeCase: boolean }[]>(
    `/problems/${problemId}/test-cases/generate`,
    undefined,
    encryptedUserId
  );
}

export async function getTestCases(
  problemId: string,
  encryptedUserId?: string
) {
  return backendGet<{ description: string; isEdgeCase: boolean }[]>(
    `/problems/${problemId}/test-cases`,
    encryptedUserId
  );
}
