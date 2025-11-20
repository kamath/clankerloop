import { writeFile } from "fs/promises";
import { join } from "path";
import type { Difficulty, Language } from "../types/index.js";
import { generateCompleteProblem } from "../generator/index.js";
import { formatProblem, formatSampleTestCases, showProgress, showSuccess } from "../utils/index.js";

export interface GenerateOptions {
  model: string;
  difficulty?: Difficulty;
  language?: Language;
  topic?: string;
  numTestCases?: number;
  numSamples?: number;
  output?: string;
}

/**
 * Generate a new coding problem
 */
export async function generateCommand(options: GenerateOptions): Promise<void> {
  const {
    model,
    difficulty = "medium",
    language = "javascript",
    topic,
    numTestCases = 10,
    numSamples = 3,
    output,
  } = options;

  try {
    showProgress("Generating complete problem package");

    const problemPackage = await generateCompleteProblem(model, difficulty, language, {
      topic,
      numTestCases,
      numSampleTestCases: numSamples,
    });

    // Display the problem
    console.log("\n");
    console.log(formatProblem(problemPackage.problem));
    console.log(formatSampleTestCases(problemPackage.sampleTestCases));

    // Save to file if requested
    if (output) {
      const outputPath = join(process.cwd(), output);
      await writeFile(outputPath, JSON.stringify(problemPackage, null, 2), "utf-8");
      showSuccess(`Problem saved to: ${outputPath}`);
    }

    showSuccess("Problem generation complete!");
    console.log(`\n📊 Stats:`);
    console.log(`   Difficulty: ${problemPackage.problem.difficulty}`);
    console.log(`   Language: ${language}`);
    console.log(`   Total test cases: ${problemPackage.sampleTestCases.length + problemPackage.hiddenTestCases.length}`);
    console.log(`   Sample test cases: ${problemPackage.sampleTestCases.length}`);
    console.log(`   Hidden test cases: ${problemPackage.hiddenTestCases.length}`);
  } catch (error) {
    console.error("\n❌ Error generating problem:");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
