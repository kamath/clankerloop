import { generateObject } from "ai";
import { z } from "zod/v3";
import { DEFAULT_LANGUAGE } from "./constants";
import { getProblem, updateProblem, type TestCase } from "@repo/db";

export async function generateSolution(problemId: string) {
  const { problemText, functionSignature, testCases } =
    await getProblem(problemId);

  if (!testCases || testCases.length === 0) {
    throw new Error(
      "No test cases found. Please generate test case descriptions first."
    );
  }

  const { object } = await generateObject({
    model: "google/gemini-2.5-flash",
    prompt: `Generate executable ${DEFAULT_LANGUAGE} code that solves the following problem.

Problem: ${problemText}

Function Signature (${DEFAULT_LANGUAGE}):
${functionSignature}

Test Cases:
${testCases.map((tc: TestCase, i: number) => `${i + 1}. ${tc.description}${tc.isEdgeCase ? " (edge case)" : ""}`).join("\n")}

Generate code that passes all the test cases.
THE FUNCTION NAME MUST BE runSolution.
`,
    schema: z.object({
      solution: z
        .string()
        .describe(
          `Executable ${DEFAULT_LANGUAGE} code that solves the problem. NO COMMENTS OR OTHER TEXT. JUST THE CODE. DO NOT RETURN CONSTANTS YOURSELF, GENERATE CODE TO GENERATE THE CONSTANTS.`
        ),
    }),
  });

  const solution = object.solution;

  await updateProblem(problemId, { solution });

  return solution;
}

export async function getSolution(problemId: string) {
  const { solution } = await getProblem(problemId);
  return solution;
}
