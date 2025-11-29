import { generateObject } from "ai";
import { z } from "zod/v3";
import { getProblem, replaceTestCases } from "@repo/db";

export async function generateTestCases(problemId: string) {
  const { problemText } = await getProblem(problemId);
  const { object } = await generateObject({
    model: "google/gemini-2.5-flash",
    prompt: `You're given the problem text: ${JSON.stringify(problemText)}. Generate NATURAL LANGUAGE test case DESCRIPTIONS for the problem.
	DO NOT SPECIFY THE INPUTS AND OUTPUTS. JUST THE DESCRIPTIONS -- as in, "an array of numbers", "an empty array", "a string with a length of 10", etc.
	Generate AT MOST 15 test cases encompassing a good mix of basic, edge, and corner cases.
	DO NOT MAKE TEST CASES THAT HAVE INVALID INPUT/OUTPUT TYPES.`,
    schema: z.object({
      testCases: z
        .array(
          z.object({
            description: z
              .string()
              .describe(
                "A description of what this test case is testing (e.g., 'empty array', 'array of odd numbers', 'linked list of strings')"
              ),
            isEdgeCase: z
              .boolean()
              .describe("Whether this is an edge case or normal case"),
          })
        )
        .describe("A list of test case descriptions")
        .min(5)
        .max(15),
    }),
  });

  await replaceTestCases(
    problemId,
    object.testCases.map((tc) => ({
      description: tc.description,
      isEdgeCase: tc.isEdgeCase,
      inputCode: "",
      input: [],
      expected: null,
    }))
  );
  return object.testCases;
}

export async function getTestCases(problemId: string) {
  const { testCases } = await getProblem(problemId);
  return testCases;
}
