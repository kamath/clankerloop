import { generateObject } from "ai";
import { z } from "zod";
import { DEFAULT_LANGUAGE } from "./constants";
import {
  getProblem,
  updateTestCase,
  type TestCase,
  type Database,
} from "@repo/db";
import { getTracedClient } from "@/utils/ai";

export async function generateTestCaseInputCode(
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
  const { problemText, functionSignature, testCases } = await getProblem(
    problemId,
    db,
  );

  if (!testCases || testCases.length === 0) {
    throw new Error(
      "No test cases found. Please generate test case descriptions first.",
    );
  }

  const tracedModel = getTracedClient(model, userId, problemId, model, env);
  const inputCodes: string[] = [];

  for (let index = 0; index < testCases.length; index++) {
    const testCase = testCases[index];
    if (!testCase) {
      throw new Error(`Test case at index ${index} is undefined`);
    }

    let inputCode: string;

    if (returnDummy) {
      inputCode = "function generateTestInput() { return [[1, 2, 3]]; }";
    } else {
      const result = await generateObject({
        model: tracedModel,
        prompt: `Generate executable ${DEFAULT_LANGUAGE} code that produces the input for a test case.

Problem: ${problemText}

Function Signature (${DEFAULT_LANGUAGE}):
${functionSignature}

Test Case:
${testCase.description}${testCase.isEdgeCase ? " (edge case)" : ""}

Generate a ${DEFAULT_LANGUAGE} function generateTestInput()
that creates the input value(s) described in the test case description.

The function should only generate the INPUT, not execute the solution function.
The output of the function should be an ARRAY, where each element is an argument to the solution function.

For example, if the function signature is:

function someFunction(nums: number[], k: number) {}

and the description is "an array of numbers with length 3 and an odd number",

the function should return: [[1, 2, 3, 4, 5], 3]

AVOID COMING UP WITH CONSTANTS!! For example, if asked for an array of numbers, generate code to generate random numbers instead of coming up with a specific array.

Return a function like the following, where ...inputValues is the array of input values for the test case:
function generateTestInput() {
	return [...inputValues];
}

DO NOT INCLUDE ANYTHING BUT THE FUNCTION DEFINITION.
`,
        schema: z.object({
          inputCode: z
            .string()
            .describe(
              `Executable ${DEFAULT_LANGUAGE} code that produces the test case input. NO COMMENTS OR OTHER TEXT. JUST THE CODE. DO NOT RETURN CONSTANTS YOURSELF, GENERATE CODE TO GENERATE THE CONSTANTS.`,
            ),
        }),
      });
      inputCode = result.object.inputCode;
    }

    if (!inputCode) {
      throw new Error(
        `Failed to generate input code for test case ${index + 1}`,
      );
    }

    await updateTestCase(testCase.id, { inputCode }, db);
    inputCodes.push(inputCode);
  }

  return inputCodes;
}

export async function getTestCaseInputCode(problemId: string, db: Database) {
  const { testCases } = await getProblem(problemId, db);
  if (!testCases) {
    return null;
  }
  return testCases.map((testCase: TestCase) => {
    if (!testCase.inputCode) {
      throw new Error(`Test case ${testCase.id} has no input code`);
    }
    return testCase.inputCode;
  });
}
