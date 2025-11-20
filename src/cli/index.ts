import { Command } from "commander";
import type { Difficulty, Language } from "../types/index.js";
import { generateCommand, type GenerateOptions } from "./generate.js";
import { solveCommand, type SolveOptions } from "./solve.js";

export { generateCommand, solveCommand };
export type { GenerateOptions, SolveOptions };

/**
 * Parse command line arguments and route to appropriate command using commander
 */
export async function runCLI(args: string[]): Promise<void> {
  const program = new Command();

  program
    .name("AI LeetCode Generator")
    .description("Generate coding problems and test solutions against them")
    .version("1.0.0");

  program
    .command("generate")
    .description("Generate a new coding problem")
    .option(
      "--model <string>",
      "AI model to use",
      "google/gemini-2.0-flash"
    )
    .option(
      "--difficulty <level>",
      "Problem difficulty: easy, medium, hard",
      "medium"
    )
    .option(
      "--language <lang>",
      "Target language: javascript, typescript, python",
      "javascript"
    )
    .option("--topic <string>", "Problem topic (e.g., 'arrays', 'dynamic programming')")
    .option("--tests <number>", "Number of test cases to generate", "10")
    .option("--samples <number>", "Number of sample test cases", "3")
    .option("--output <file>", "Save problem to JSON file")
    .action(async (options) => {
      const generateOptions: GenerateOptions = {
        model: options.model,
        difficulty: options.difficulty as Difficulty,
        language: options.language as Language,
        topic: options.topic,
        numTestCases: parseInt(options.tests),
        numSamples: parseInt(options.samples),
        output: options.output,
      };

      await generateCommand(generateOptions);
    });

  program
    .command("solve")
    .description("Test a user's solution against problem test cases")
    .requiredOption("--problem <file>", "Path to problem JSON file")
    .requiredOption("--solution <file>", "Path to solution file")
    .option(
      "--language <lang>",
      "Solution language: javascript, typescript, python",
      "javascript"
    )
    .option("--show-hidden", "Show results of hidden test cases", false)
    .action(async (options) => {
      const solveOptions: SolveOptions = {
        problemFile: options.problem,
        solutionFile: options.solution,
        language: options.language as Language,
        showHidden: options.showHidden,
      };

      await solveCommand(solveOptions);
    });

  await program.parseAsync(args, { from: "user" });
}
