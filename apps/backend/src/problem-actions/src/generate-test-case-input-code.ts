import { generateObject } from "ai";
import { z } from "zod/v3";
import { DEFAULT_LANGUAGE } from "./constants";
import { getProblem, updateTestCase, type TestCase } from "@repo/db";

export async function generateTestCaseInputCode(problemId: string) {
  const { problemText, functionSignature, testCases } =
    await getProblem(problemId);

  if (!testCases || testCases.length === 0) {
    throw new Error(
      "No test cases found. Please generate test case descriptions first."
    );
  }

  const { object } = await generateObject({
    model: "google/gemini-2.5-flash",
    prompt: `Generate executable ${DEFAULT_LANGUAGE} code that produces the input for test cases.

Problem: ${problemText}

Function Signature (${DEFAULT_LANGUAGE}):
${functionSignature}

Test Cases:
${testCases.map((tc: TestCase, i: number) => `${i + 1}. ${tc.description}${tc.isEdgeCase ? " (edge case)" : ""}`).join("\n")}

For each test case, generate a ${DEFAULT_LANGUAGE} function generateTestInput()
that creates the input value(s) described in the test case description

The function should only generate the INPUT, not execute the solution function.
The output of the function should be an ARRAY, where each element is an argument to the solution function.

For example, if the function signature is:

function someFunction(nums: number[], k: number) {}

and the description is "an array of numbers with length 3 and an odd number",

the function should return: [[1, 2, 3, 4, 5], 3]

Generate code for each test case in order.
AVOID COMING UP WITH CONSTANTS!! For example, if asked for an array of numbers, generate code to generate random numbers instead of coming up with a specific array.

Return a function like the following, where ...inputValues is the array of input values for the test case:
function generateTestInput() {
	return [...inputValues];
}
`,
    schema: z.object({
      testCaseInputs: z
        .array(
          z.object({
            inputCode: z
              .string()
              .describe(
                `Executable ${DEFAULT_LANGUAGE} code that produces the test case input. NO COMMENTS OR OTHER TEXT. JUST THE CODE. DO NOT RETURN CONSTANTS YOURSELF, GENERATE CODE TO GENERATE THE CONSTANTS.`
              ),
          })
        )
        .describe(
          "An array of input code for each test case, in the same order as the test cases"
        )
        .length(testCases.length),
    }),
  });

  const inputCodes: string[] = [];
  for (let index = 0; index < testCases.length; index++) {
    const testCase = testCases[index];
    if (!testCase) {
      throw new Error(`Test case at index ${index} is undefined`);
    }
    const inputCode = object.testCaseInputs[index]?.inputCode;
    if (!inputCode) {
      throw new Error(
        `Failed to generate input code for test case ${index + 1}`
      );
    }
    await updateTestCase(testCase.id, { inputCode });
    inputCodes.push(inputCode);
  }

  return inputCodes;
}

export async function getTestCaseInputCode(problemId: string) {
  const { testCases } = await getProblem(problemId);
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
