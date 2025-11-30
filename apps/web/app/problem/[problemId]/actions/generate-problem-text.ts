import { backendGet, backendPost } from "@/lib/backend-client";

export async function generateProblemText(
  problemId: string,
  encryptedUserId?: string
) {
  return backendPost<{ problemText: string; functionSignature: string }>(
    `/problems/${problemId}/text/generate`,
    undefined,
    encryptedUserId
  );
}

export async function getProblemText(
  problemId: string,
  encryptedUserId?: string
) {
  return backendGet<{ problemText: string; functionSignature: string }>(
    `/problems/${problemId}/text`,
    encryptedUserId
  );
}
