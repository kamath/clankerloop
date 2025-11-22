"use server";
import { generateObject } from "ai";
import { z } from "zod/v3";
import { getProblemText } from "./generate-problem-text";
import { join } from "path";
import { mkdir } from "fs/promises";
import { writeFile } from "fs/promises";
import { readFile } from "fs/promises";

export async function generateTestCases(problemId: string) {
  const problemText = await getProblemText(problemId);
  const { object } = await generateObject({
    model: "google/gemini-2.5-flash",
    prompt: `You're given the problem text: ${problemText}. Generate NATURAL LANGUAGE test case DESCRIPTIONS for the problem.
	DO NOT SPECIFY THE INPUTS AND OUTPUTS. JUST THE DESCRIPTIONS -- as in, "an array of numbers", "an empty array", "a string with a length of 10", etc.
	Generate AT MOST 15 test cases encompassing a good mix of basic, edge, and corner cases.`,
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

  const problemsDir = join(process.cwd(), "problems");
  const problemFile = join(problemsDir, `${problemId}.json`);

  // Ensure problems directory exists
  await mkdir(problemsDir, { recursive: true });

  // Save the problem text to the JSON file
  await writeFile(
    problemFile,
    JSON.stringify(
      { problemId, ...problemText, testCases: object.testCases },
      null,
      2
    )
  );
  return object.testCases;
}

export async function getTestCases(problemId: string) {
  const problemsDir = join(process.cwd(), "problems");
  const problemFile = join(problemsDir, `${problemId}.json`);
  const testCases = JSON.parse(await readFile(problemFile, "utf8")).testCases;
  return testCases;
}
