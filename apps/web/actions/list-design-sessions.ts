"use server";

import { apiGet } from "@/lib/api-client";
import type { DesignSession } from "@repo/api-types";

export async function listDesignSessions(
  encryptedUserId?: string,
): Promise<DesignSession[]> {
  if (!encryptedUserId) {
    throw new Error("Encrypted user ID is required");
  }
  return apiGet<DesignSession[]>(
    "/sessions",
    encryptedUserId,
    "/api/v1/design",
  );
}
