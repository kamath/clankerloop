"use server";
import { generateObject } from "ai";
import { z } from "zod/v3";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { readFile } from "fs/promises";

export async function generateProblemText(problemId: string) {
  const { object } = await generateObject({
    model: "google/gemini-2.5-flash",
    prompt: `Generate a coding problem for a LeetCode-style platform. ONLY return the problem text, no other text. 
	DO NOT INCLUDE TEST CASES. JUST THE PROBLEM TEXT.
	DO NOT INCLUDE EXAMPLE INPUTS AND OUTPUTS.
	DO NOT INCLUDE ANYTHING BUT THE PROBLEM TEXT.`,
    schema: z.object({
      problemText: z.string(),
    }),
  });

  const problemsDir = join(process.cwd(), "problems");
  const problemFile = join(problemsDir, `${problemId}.json`);

  // Ensure problems directory exists
  await mkdir(problemsDir, { recursive: true });

  // Save the problem text to the JSON file
  await writeFile(
    problemFile,
    JSON.stringify({ problemId, problemText: object.problemText }, null, 2)
  );

  return object.problemText;
}

export async function getProblemText(problemId: string) {
  const problemsDir = join(process.cwd(), "problems");
  const problemFile = join(problemsDir, `${problemId}.json`);
  const problemText = JSON.parse(
    await readFile(problemFile, "utf8")
  ).problemText;
  return problemText;
}
