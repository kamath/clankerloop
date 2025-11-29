import { generateObject } from "ai";
import { z } from "zod/v3";
import { getProblem, updateProblem } from "@repo/db";

export async function generateProblemText(problemId: string) {
  const { object } = await generateObject({
    model: "google/gemini-2.5-flash",
    prompt: `Generate a coding problem for a LeetCode-style platform. ONLY return the problem text, no other text.
	DO NOT INCLUDE TEST CASES. JUST THE PROBLEM TEXT.
	DO NOT INCLUDE EXAMPLE INPUTS AND OUTPUTS.
	DO NOT INCLUDE ANYTHING BUT THE PROBLEM TEXT.
	Generate a function signature for the function using TypeScript types.
	If using custom types, THEY MUST BE DEFINED INLINE -- for example,
	(nums: number[], k: number, customType: {something: string; anotherThing: number}): number
	`,
    schema: z.object({
      problemText: z.string(),
      functionSignature: z
        .string()
        .describe(
          "The empty function WITH NO OTHER TEXT in TypeScript types DEFINED INLINE FOR CUSTOM TYPES -- for example, (nums: number[], k: number, customType: {something: string; anotherThing: number}): number"
        ),
    }),
  });

  await updateProblem(problemId, {
    problemText: object.problemText,
    functionSignature: object.functionSignature,
  });

  return {
    problemText: object.problemText,
    functionSignature: object.functionSignature,
  };
}

export async function getProblemText(problemId: string) {
  const problem = await getProblem(problemId);
  return {
    problemText: problem.problemText,
    functionSignature: problem.functionSignature,
  };
}
