import { backendPost } from "@/lib/backend-client";

export type TestCase = {
  description: string;
  isEdgeCase: boolean;
  expected: unknown;
};

export type TestResult = {
  testCase: TestCase;
  status: "pass" | "fail" | "error";
  actual: unknown | null;
  error?: string;
  stdout?: string;
};

export async function runUserSolution(
  problemId: string,
  userCode: string,
  encryptedUserId?: string
): Promise<TestResult[]> {
  return backendPost<TestResult[]>(
    `/problems/${problemId}/solution/run`,
    {
      code: userCode,
    },
    encryptedUserId
  );
}
