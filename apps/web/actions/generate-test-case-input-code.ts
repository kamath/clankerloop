import { apiGet, apiPost } from "@/lib/api-client";

interface InputCodeGenerateResponse {
  inputCodes: string[];
  jobId: string | null;
}

export async function generateTestCaseInputCode(
  problemId: string,
  model: string,
  encryptedUserId?: string,
  enqueueNextStep: boolean = true,
  forceError?: boolean,
  returnDummy?: boolean,
) {
  const data = await apiPost<InputCodeGenerateResponse>(
    `/${problemId}/test-cases/input-code/generate`,
    { model, enqueueNextStep, forceError, returnDummy },
    encryptedUserId,
  );
  return data.inputCodes;
}

export async function getTestCaseInputCode(
  problemId: string,
  encryptedUserId?: string,
) {
  return apiGet<string[] | null>(
    `/${problemId}/test-cases/input-code`,
    encryptedUserId,
  );
}
