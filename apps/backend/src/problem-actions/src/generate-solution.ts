import { generateObject } from "ai";
import { z } from "zod";
import { DEFAULT_LANGUAGE } from "./constants";
import {
  getProblem,
  updateProblem,
  type TestCase,
  type Database,
} from "@repo/db";
import { getTracedClient } from "@/utils/ai";

export async function generateSolution(
  problemId: string,
  model: string,
  userId: string,
  env: Env,
  db: Database,
  updateProblemInDb: boolean = true,
  forceError?: boolean,
  returnDummy?: boolean,
) {
  if (forceError) {
    throw new Error("Force error: generateObject call skipped");
  }
  const { problemText, functionSignature, testCases } = await getProblem(
    problemId,
    db,
  );

  if (!testCases || testCases.length === 0) {
    throw new Error(
      "No test cases found. Please generate test case descriptions first.",
    );
  }

  let object: { solution: string };

  if (returnDummy) {
    object = {
      solution:
        "function runSolution(nums: number[]): number { return nums.reduce((a, b) => a + b, 0); }",
    };
  } else {
    const tracedModel = getTracedClient(model, userId, problemId, model, env);
    const result = await generateObject({
      model: tracedModel,
      prompt: `Generate executable ${DEFAULT_LANGUAGE} code that solves the following problem.

Problem: ${problemText}

Function Signature (${DEFAULT_LANGUAGE}):
${functionSignature}

Test Cases:
${testCases.map((tc: TestCase, i: number) => `${i + 1}. ${tc.description}${tc.isEdgeCase ? " (edge case)" : ""}`).join("\n")}

Generate code that passes all the test cases.
THE FUNCTION NAME MUST BE runSolution.
DO NOT INCLUDE ANYTHING BUT THE FUNCTION DEFINITION.
DO NOT INCLUDE CODE OUTSIDE THE FUNCTION DEFINITION. DO NOT INVOKE THE FUNCTION.
`,
      schema: z.object({
        solution: z
          .string()
          .describe(
            `Executable ${DEFAULT_LANGUAGE} code that solves the problem. NO COMMENTS OR OTHER TEXT. JUST THE CODE. DO NOT RETURN CONSTANTS YOURSELF, GENERATE CODE TO GENERATE THE CONSTANTS. DO NOT INCLUDE CODE THAT RUNS THE FUNCTION OR ANYTHING ELSE OUTSIDE THE FUNCTION DEFINITION.`,
          ),
      }),
    });
    object = result.object;
  }

  const solution = object.solution;

  if (updateProblemInDb) {
    await updateProblem(problemId, { solution }, db);
  }

  return solution;
}

export async function getSolution(problemId: string, db: Database) {
  const { solution } = await getProblem(problemId, db);
  return solution;
}
