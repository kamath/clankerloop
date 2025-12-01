import { generateObject } from "ai";
import { z } from "zod";
import { DEFAULT_LANGUAGE } from "./constants";
import { getProblem, updateProblem, type TestCase } from "@repo/db";
import { getTracedClient } from "@/utils/ai";

export async function generateSolution(
  problemId: string,
  model: string,
  userId: string,
  updateProblemInDb: boolean = true,
  forceError?: boolean,
  returnDummy?: boolean,
) {
  if (forceError) {
    throw new Error("Force error: generateObject call skipped");
  }
  const { problemText, functionSignature, testCases } =
    await getProblem(problemId);

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
    const tracedModel = getTracedClient(model, userId, problemId, model);
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
`,
      schema: z.object({
        solution: z
          .string()
          .describe(
            `Executable ${DEFAULT_LANGUAGE} code that solves the problem. NO COMMENTS OR OTHER TEXT. JUST THE CODE. DO NOT RETURN CONSTANTS YOURSELF, GENERATE CODE TO GENERATE THE CONSTANTS.`,
          ),
      }),
    });
    object = result.object;
  }

  const solution = object.solution;

  if (updateProblemInDb) {
    await updateProblem(problemId, { solution });
  }

  return solution;
}

export async function getSolution(problemId: string) {
  const { solution } = await getProblem(problemId);
  return solution;
}
