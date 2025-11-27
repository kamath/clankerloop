import { backendGet, backendPost } from "@/lib/backend-client";

export async function generateSolution(problemId: string) {
  return backendPost<string>(`/problems/${problemId}/solution/generate`);
}

export async function getSolution(problemId: string) {
  return backendGet<string>(`/problems/${problemId}/solution`);
}
