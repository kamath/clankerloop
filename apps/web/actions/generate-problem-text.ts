import { apiGet, apiPost } from "@/lib/api-client";
import type { ProblemText } from "@repo/api-types";

interface ProblemTextGenerateResponse extends ProblemText {
  jobId: string | null;
}

export async function generateProblemText(
  problemId: string,
  model: string,
  encryptedUserId?: string,
  enqueueNextStep: boolean = true,
  forceError?: boolean,
  returnDummy?: boolean,
) {
  const data = await apiPost<ProblemTextGenerateResponse>(
    `/${problemId}/text/generate`,
    { model, enqueueNextStep, forceError, returnDummy },
    encryptedUserId,
  );
  return {
    problemText: data.problemText,
    functionSignature: data.functionSignature,
  };
}

export async function getProblemText(
  problemId: string,
  encryptedUserId?: string,
) {
  return apiGet<ProblemText>(`/${problemId}/text`, encryptedUserId);
}
