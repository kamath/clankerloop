import { backendGet, backendPost } from "@/lib/backend-client";

export async function generateTestCaseInputCode(problemId: string) {
  return backendPost<string[]>(
    `/problems/${problemId}/test-cases/input-code/generate`
  );
}

export async function getTestCaseInputCode(problemId: string) {
  return backendGet<string[]>(`/problems/${problemId}/test-cases/input-code`);
}
