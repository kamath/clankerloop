import { apiGet, apiPost } from "@/lib/api-client";
import type { Solution } from "@repo/api-types";

interface SolutionGenerateResponse {
  solution: string | null;
  jobId: string | null;
}

export async function generateSolution(
  problemId: string,
  model: string,
  encryptedUserId?: string,
  updateProblem: boolean = true,
  enqueueNextStep: boolean = true,
  forceError?: boolean,
  returnDummy?: boolean,
) {
  const data = await apiPost<SolutionGenerateResponse>(
    `/${problemId}/solution/generate`,
    { model, updateProblem, enqueueNextStep, forceError, returnDummy },
    encryptedUserId,
  );
  return data.solution;
}

export async function getSolution(problemId: string, encryptedUserId?: string) {
  const data = await apiGet<Solution>(
    `/${problemId}/solution`,
    encryptedUserId,
  );
  return data.solution;
}
