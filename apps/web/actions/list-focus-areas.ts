import { apiGet } from "@/lib/api-client";
import type { FocusArea } from "@repo/api-types";

export async function listFocusAreas(
  encryptedUserId?: string,
): Promise<FocusArea[]> {
  return apiGet<FocusArea[]>("/focus-areas", encryptedUserId);
}
