import { apiPost } from "@/lib/api-client";
import type { CreateProblemResponse } from "@repo/api-types";

export async function createProblem(
  model: string,
  encryptedUserId?: string,
  autoGenerate: boolean = true,
  returnDummy?: boolean,
  easierThan?: string,
  harderThan?: string,
) {
  const queryParams = new URLSearchParams({
    autoGenerate: autoGenerate.toString(),
  });
  return apiPost<CreateProblemResponse>(
    `?${queryParams.toString()}`,
    {
      model,
      ...(returnDummy !== undefined && { returnDummy }),
      ...(easierThan !== undefined && { easierThan }),
      ...(harderThan !== undefined && { harderThan }),
    },
    encryptedUserId,
  );
}
