import { generateObject } from "ai";
import { z } from "zod";
import { getProblem, updateProblem } from "@repo/db";
import { getTracedClient } from "@/utils/ai";

export async function generateProblemText(
  problemId: string,
  model: string,
  userId: string,
  forceError?: boolean,
  returnDummy?: boolean,
) {
  if (forceError) {
    throw new Error("Force error: generateObject call skipped");
  }

  let object: { problemText: string; functionSignature: string };

  if (returnDummy) {
    object = {
      problemText:
        "This is a dummy problem text. Given an array of integers, find the maximum sum of a contiguous subarray.",
      functionSignature: "(nums: number[]): number",
    };
  } else {
    const tracedModel = getTracedClient(model, userId, problemId, model);
    const result = await generateObject({
      model: tracedModel,
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
            "The empty function WITH NO OTHER TEXT, DO NOT INCLUDE FUNCTION NAME in TypeScript types DEFINED INLINE FOR CUSTOM TYPES -- for example, (nums: number[], k: number, customType: {something: string; anotherThing: number}): number",
          ),
      }),
    });
    object = result.object;
  }

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
