"use server";
import { generateObject } from "ai";
import { z } from "zod/v3";
import { join } from "path";
import { writeFile } from "fs/promises";
import { readFile } from "fs/promises";
import { DEFAULT_LANGUAGE } from "@/lib/consts";

interface TestCase {
  description: string;
  isEdgeCase: boolean;
  inputCode?: string;
}

export async function generateSolution(problemId: string) {
  const problemsDir = join(process.cwd(), "problems");
  const problemFile = join(problemsDir, `${problemId}.json`);

  // Read existing problem data
  const problemData = JSON.parse(await readFile(problemFile, "utf8"));
  const { problemText, functionSignature, testCases } = problemData;

  if (!testCases || testCases.length === 0) {
    throw new Error(
      "No test cases found. Please generate test case descriptions first."
    );
  }

  // Generate solution
  const { object } = await generateObject({
    model: "google/gemini-2.5-flash",
    prompt: `Generate executable ${DEFAULT_LANGUAGE} code that solves the following problem.

Problem: ${typeof problemText === "string" ? problemText : problemText.problemText || ""}

Function Signature (${DEFAULT_LANGUAGE}):
${functionSignature.typescript}

Test Cases:
${testCases.map((tc: TestCase, i: number) => `${i + 1}. ${tc.description}${tc.isEdgeCase ? " (edge case)" : ""}`).join("\n")}

Generate code that passes all the test cases.
`,
    schema: z.object({
      solution: z
        .string()
        .describe(
          `Executable ${DEFAULT_LANGUAGE} code that solves the problem. NO COMMENTS OR OTHER TEXT. JUST THE CODE. DO NOT RETURN CONSTANTS YOURSELF, GENERATE CODE TO GENERATE THE CONSTANTS.`
        ),
    }),
  });

  // Merge inputCode into existing test cases
  const solution = object.solution;

  // Save updated test cases back to the JSON file
  await writeFile(
    problemFile,
    JSON.stringify({ ...problemData, solution }, null, 2)
  );

  return solution;
}

export async function getSolution(problemId: string) {
  const problemsDir = join(process.cwd(), "problems");
  const problemFile = join(problemsDir, `${problemId}.json`);
  const { solution } = JSON.parse(await readFile(problemFile, "utf8"));
  return solution;
}
