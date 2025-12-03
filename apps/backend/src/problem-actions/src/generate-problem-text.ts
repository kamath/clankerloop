import { generateObject } from "ai";
import { z } from "zod";
import { getProblem, updateProblem, type Database } from "@repo/db";
import { getTracedClient } from "@/utils/ai";

export async function generateProblemText(
  problemId: string,
  model: string,
  userId: string,
  env: Env,
  db: Database,
  forceError?: boolean,
  returnDummy?: boolean,
  baseProblem?: {
    problemText: string;
    direction: "easier" | "harder" | "similar";
  },
) {
  if (forceError) {
    throw new Error("Force error: generateObject call skipped");
  }

  let object: {
    problemText: string;
    functionSignature: string;
    problemTextReworded: string;
  };

  if (returnDummy) {
    object = {
      problemText:
        "This is a dummy problem text. Given an array of integers, find the maximum sum of a contiguous subarray.",
      functionSignature: "(nums: number[]): number",
      problemTextReworded:
        "This is a dummy reworded problem text describing a real-world scenario.",
    };
  } else {
    const tracedModel = getTracedClient(model, userId, problemId, model, env);

    // Build prompt based on whether we're creating a new problem or adjusting difficulty
    let prompt: string;
    if (baseProblem) {
      if (baseProblem.direction === "similar") {
        prompt = `You are regenerating a coding problem with the same difficulty level but more specific to avoid generation errors.

Original problem:
${baseProblem.problemText}

Create a problem with the same difficulty level, but be more specific and clear to avoid generation errors. Keep the same general concept/theme.
- Be more explicit about constraints and requirements
- Clarify edge cases and input/output formats
- Ensure the problem description is unambiguous and specific
- Maintain the same algorithmic complexity and difficulty

ONLY return the problem text, no other text.
DO NOT INCLUDE TEST CASES. JUST THE PROBLEM TEXT.
DO NOT INCLUDE EXAMPLE INPUTS AND OUTPUTS.
DO NOT INCLUDE ANYTHING BUT THE PROBLEM TEXT.
Generate a function signature for the function using TypeScript types.
If using custom types, THEY MUST BE DEFINED INLINE -- for example,

(nums: number[], k: number, customType: {something: string; anotherThing: number}): number
`;
      } else {
        prompt = `You are adjusting the difficulty of an existing coding problem.

Original problem:
${baseProblem.problemText}

Create a ${baseProblem.direction} version of this problem while keeping the same general concept/theme.
${baseProblem.direction === "easier" ? "- Simplify constraints, require simpler algorithms" : "- Add constraints, require optimization, more complex algorithms"}

ONLY return the problem text, no other text.
DO NOT INCLUDE TEST CASES. JUST THE PROBLEM TEXT.
DO NOT INCLUDE EXAMPLE INPUTS AND OUTPUTS.
DO NOT INCLUDE ANYTHING BUT THE PROBLEM TEXT.
Generate a function signature for the function using TypeScript types.
If using custom types, THEY MUST BE DEFINED INLINE -- for example,

(nums: number[], k: number, customType: {something: string; anotherThing: number}): number
`;
      }
    } else {
      prompt = `Generate a coding problem for a LeetCode-style platform. ONLY return the problem text, no other text.
	DO NOT INCLUDE TEST CASES. JUST THE PROBLEM TEXT.
	DO NOT INCLUDE EXAMPLE INPUTS AND OUTPUTS.
	DO NOT INCLUDE ANYTHING BUT THE PROBLEM TEXT.
	Generate a function signature for the function using TypeScript types.
	If using custom types, THEY MUST BE DEFINED INLINE -- for example,

	(nums: number[], k: number, customType: {something: string; anotherThing: number}): number
	`;
    }

    const result = await generateObject({
      model: tracedModel,
      prompt,
      schema: z.object({
        problemText: z
          .string()
          .describe(
            "The problem to be solved, i.e. 'Given an array of integers, find the maximum sum of a contiguous subarray.'",
          ),
        functionSignature: z
          .string()
          .describe(
            "The empty function WITH NO OTHER TEXT, DO NOT INCLUDE FUNCTION NAME in TypeScript types DEFINED INLINE FOR CUSTOM TYPES -- for example, (nums: number[], k: number, customType: {something: string; anotherThing: number}): number",
          ),
        problemTextReworded: z
          .string()
          .describe(
            "The problem text, but reworded to be a real-world problem instead of a coding problem. Avoid technical jargon and focus on a real-world problem.",
          ),
      }),
    });
    object = result.object;
  }

  await updateProblem(
    problemId,
    {
      problemText: object.problemText,
      functionSignature: object.functionSignature,
      problemTextReworded: object.problemTextReworded,
    },
    db,
  );

  return {
    problemText: object.problemText,
    functionSignature: object.functionSignature,
    problemTextReworded: object.problemTextReworded,
    functionSignatureSchema: null, // Parsed in a subsequent step
  };
}

export async function getProblemText(problemId: string, db: Database) {
  const problem = await getProblem(problemId, db);
  return {
    problemText: problem.problemText,
    functionSignature: problem.functionSignature,
    problemTextReworded: problem.problemTextReworded,
    functionSignatureSchema: problem.functionSignatureSchema,
  };
}
