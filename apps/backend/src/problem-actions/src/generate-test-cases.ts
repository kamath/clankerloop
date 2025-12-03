import { generateObject } from "ai";
import { z } from "zod";
import { getProblem, replaceTestCases, type Database } from "@repo/db";
import { getTracedClient } from "@/utils/ai";

export async function generateTestCases(
  problemId: string,
  model: string,
  userId: string,
  env: Env,
  db: Database,
  forceError?: boolean,
  returnDummy?: boolean,
) {
  if (forceError) {
    throw new Error("Force error: generateObject call skipped");
  }

  let object: {
    testCases: Array<{
      description: string;
      isEdgeCase: boolean;
      isSampleCase: boolean;
    }>;
  };

  if (returnDummy) {
    object = {
      testCases: [
        {
          description: "an array with positive numbers",
          isEdgeCase: false,
          isSampleCase: true,
        },
        {
          description: "an empty array",
          isEdgeCase: true,
          isSampleCase: false,
        },
        {
          description: "an array with negative numbers",
          isEdgeCase: false,
          isSampleCase: false,
        },
        {
          description: "an array with a single element",
          isEdgeCase: true,
          isSampleCase: false,
        },
        {
          description: "an array with all zeros",
          isEdgeCase: true,
          isSampleCase: false,
        },
      ],
    };
  } else {
    const { problemText } = await getProblem(problemId, db);
    const tracedModel = getTracedClient(model, userId, problemId, model, env);
    const result = await generateObject({
      model: tracedModel,
      prompt: `You're given the problem text: ${JSON.stringify(problemText)}. Generate NATURAL LANGUAGE test case DESCRIPTIONS for the problem.
	DO NOT SPECIFY THE INPUTS AND OUTPUTS. JUST THE DESCRIPTIONS -- as in, "an array of numbers", "an empty array", "a string with a length of 10", etc.
	Generate AT MOST 15 test cases encompassing a good mix of basic, edge, and corner cases.
	DO NOT MAKE TEST CASES THAT HAVE INVALID INPUT/OUTPUT TYPES.
	YOU MUST INCLUDE AT LEAST ONE SAMPLE CASE (isSampleCase: true). Sample cases help users understand examples of the problem.`,
      schema: z.object({
        testCases: z
          .array(
            z.object({
              description: z
                .string()
                .describe(
                  "A description of what this test case is testing (e.g., 'empty array', 'array of odd numbers', 'linked list of strings')",
                ),
              isEdgeCase: z
                .boolean()
                .describe("Whether this is an edge case or normal case"),
              isSampleCase: z
                .boolean()
                .describe(
                  "Whether this is a sample case or not. Only up to 3 sample cases are allowed; these should only help the user understand examples of the problem. AT LEAST ONE test case must be a sample case.",
                ),
            }),
          )
          .describe("A list of test case descriptions")
          .min(5)
          .max(15)
          .refine(
            (testCases) => testCases.some((tc) => tc.isSampleCase === true),
            {
              message:
                "At least one test case must be a sample case (isSampleCase: true)",
            },
          ),
      }),
    });
    object = result.object;
  }

  await replaceTestCases(
    problemId,
    object.testCases.map((tc) => ({
      description: tc.description,
      isEdgeCase: tc.isEdgeCase,
      isSampleCase: tc.isSampleCase,
      inputCode: "",
      input: [],
      expected: null,
    })),
    db,
  );
  return object.testCases;
}

export async function getTestCases(problemId: string, db: Database) {
  const { testCases } = await getProblem(problemId, db);
  return testCases;
}
