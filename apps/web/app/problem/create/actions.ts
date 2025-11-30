import { backendPost } from "@/lib/backend-client";

export async function createProblemWithText(encryptedUserId?: string) {
  return backendPost<{
    problemId: string;
    problemText: string;
    functionSignature: string;
  }>("/problems", undefined, encryptedUserId);
}

