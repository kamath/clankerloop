"use server";

import { backendGet, backendPost } from "@/lib/backend-client";

export async function generateTestCaseInputs(problemId: string) {
  return backendPost<unknown[]>(
    `/problems/${problemId}/test-cases/inputs/generate`
  );
}

export async function getTestCaseInputs(problemId: string) {
  return backendGet<unknown[]>(`/problems/${problemId}/test-cases/inputs`);
}
