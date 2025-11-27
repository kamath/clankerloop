import { backendGet, backendPost } from "@/lib/backend-client";

export async function generateProblemText(problemId: string) {
  return backendPost<{ problemText: string; functionSignature: string }>(
    `/problems/${problemId}/text/generate`
  );
}

export async function getProblemText(problemId: string) {
  return backendGet<{ problemText: string; functionSignature: string }>(
    `/problems/${problemId}/text`
  );
}
