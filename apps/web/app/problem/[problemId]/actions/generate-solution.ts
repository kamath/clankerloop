import { backendGet, backendPost } from "@/lib/backend-client";

export async function generateSolution(
  problemId: string,
  encryptedUserId?: string
) {
  return backendPost<string>(
    `/problems/${problemId}/solution/generate`,
    undefined,
    encryptedUserId
  );
}

export async function getSolution(
  problemId: string,
  encryptedUserId?: string
) {
  return backendGet<string>(
    `/problems/${problemId}/solution`,
    encryptedUserId
  );
}
