"use server";

import { backendGet, backendPost } from "@/lib/backend-client";

export async function generateTestCases(problemId: string) {
  return backendPost<{ description: string; isEdgeCase: boolean }[]>(
    `/problems/${problemId}/test-cases/generate`
  );
}

export async function getTestCases(problemId: string) {
  return backendGet<{ description: string; isEdgeCase: boolean }[]>(
    `/problems/${problemId}/test-cases`
  );
}
