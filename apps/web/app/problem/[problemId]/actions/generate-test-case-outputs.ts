import { backendGet, backendPost } from "@/lib/backend-client";

export async function generateTestCaseOutputs(problemId: string) {
  return backendPost<unknown[]>(
    `/problems/${problemId}/test-cases/outputs/generate`
  );
}

export async function getTestCaseOutputs(problemId: string) {
  return backendGet<unknown[]>(`/problems/${problemId}/test-cases/outputs`);
}
