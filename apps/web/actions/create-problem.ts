import { apiPost } from "@/lib/api-client";
import type { CreateProblemResponse, StartFrom } from "@repo/api-types";

export async function createProblem(
  model: string,
  encryptedUserId?: string,
  autoGenerate: boolean = true,
  returnDummy?: boolean,
  startFrom?: StartFrom,
  focusAreaIds?: string[],
) {
  const queryParams = new URLSearchParams({
    autoGenerate: autoGenerate.toString(),
  });
  return apiPost<CreateProblemResponse>(
    `?${queryParams.toString()}`,
    {
      model,
      ...(returnDummy !== undefined && { returnDummy }),
      ...(startFrom !== undefined && { startFrom }),
      ...(focusAreaIds !== undefined &&
        focusAreaIds.length > 0 && { focusAreaIds }),
    },
    encryptedUserId,
  );
}
