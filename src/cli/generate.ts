import { mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
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
  } = options;

  try {
    // Generate UUID and create output directory
    const uuid = randomUUID();
    const outputDir = join(process.cwd(), "problem", uuid);
    await mkdir(outputDir, { recursive: true });

    showProgress(`Generating complete problem package (ID: ${uuid})`);

    const problemPackage = await generateCompleteProblem(model, difficulty, language, {
      topic,
      numTestCases,
      numSampleTestCases: numSamples,
      outputDir,
    });

    // Display the problem
    console.log("\n");
    console.log(formatProblem(problemPackage.problem));
    console.log(formatSampleTestCases(problemPackage.sampleTestCases));

    showSuccess(`Problem generation complete! Files saved to: ${outputDir}`);
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
