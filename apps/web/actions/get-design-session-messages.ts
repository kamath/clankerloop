"use server";

import { apiGet } from "@/lib/api-client";
import type { DesignMessage } from "@repo/api-types";

export async function getDesignSessionMessages(
  sessionId: string,
  encryptedUserId?: string
): Promise<DesignMessage[]> {
  return apiGet<DesignMessage[]>(
    `/sessions/${sessionId}/messages`,
    encryptedUserId,
    "/api/v1/design"
  );
}
