import { closeConnection } from '@repo/db';

import { generateCompleteProblem } from '../generator/index.js';
import { formatProblem, formatSampleTestCases, showProgress, showSuccess } from '../utils/index.js';

import type { Difficulty, Language } from '../types/index.js';

export interface GenerateOptions {
  model: string;
  difficulty?: Difficulty;
  language?: Language;
  topic?: string;
  numTestCases?: number;
  numSamples?: number;
}

/**
 * Generate a new coding problem
 */
export async function generateCommand(options: GenerateOptions): Promise<void> {
  const {
    model,
    difficulty = 'medium',
    language = 'typescript',
    topic,
    numTestCases = 10,
    numSamples = 3,
  } = options;

  try {
    showProgress('Generating complete problem package');

    const result = await generateCompleteProblem(model, difficulty, language, {
      topic,
      numTestCases,
      numSampleTestCases: numSamples,
    });

    // Display the problem
    console.log('\n');
    console.log(formatProblem(result.problem));
    console.log(formatSampleTestCases(result.sampleTestCases));

    showSuccess(`Problem generation complete! Saved to database with ID: ${result.problemId}`);
    console.log(`\n📊 Stats:`);
    console.log(`   Problem ID: ${result.problemId}`);
    console.log(`   Difficulty: ${result.problem.difficulty}`);
    console.log(`   Language: ${language}`);
    console.log(
      `   Total test cases: ${result.sampleTestCases.length + result.hiddenTestCases.length}`,
    );
    console.log(`   Sample test cases: ${result.sampleTestCases.length}`);
    console.log(`   Hidden test cases: ${result.hiddenTestCases.length}`);
  } catch (error) {
    console.error('\n❌ Error generating problem:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await closeConnection();
  }
}
