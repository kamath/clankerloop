import { apiGet } from "@/lib/api-client";
import type { WorkflowStatusResponse } from "@repo/api-types";

// Re-export types for consumers
export type { WorkflowStatus, WorkflowStatusResponse } from "@repo/api-types";

export async function getWorkflowStatus(
  problemId: string,
  encryptedUserId?: string,
): Promise<WorkflowStatusResponse> {
  return apiGet<WorkflowStatusResponse>(
    `/${problemId}/workflow-status`,
    encryptedUserId,
  );
}
