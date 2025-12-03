import { apiGet } from "@/lib/api-client";
import type { ProblemFocusAreasResponse } from "@repo/api-types";

export async function getProblemFocusAreas(
  problemId: string,
  encryptedUserId?: string,
): Promise<ProblemFocusAreasResponse> {
  return apiGet<ProblemFocusAreasResponse>(
    `/${problemId}/focus-areas`,
    encryptedUserId,
  );
}
