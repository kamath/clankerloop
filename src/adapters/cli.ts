import { Command } from "commander";
import { z } from "zod";
import type { AnyCommandDefinition } from "../shared/command-schema.js";
import type { GenerateOutput } from "../commands/generate.js";
import type { SolveOutput } from "../commands/solve.js";
import {
  formatProblem,
  formatSampleTestCases,
  formatTestResults,
  showProgress,
  showSuccess,
  showError,
} from "../utils/index.js";

/**
 * Parse CLI option value based on the Zod schema type
 */
function parseOptionValue(value: string, schema: z.ZodType): unknown {
  // Unwrap default/optional wrappers
  let innerSchema = schema;
  while (
    innerSchema instanceof z.ZodDefault ||
    innerSchema instanceof z.ZodOptional
  ) {
    innerSchema =
      innerSchema instanceof z.ZodDefault
        ? innerSchema._def.innerType
        : innerSchema._def.innerType;
  }

  // Parse based on type
  if (innerSchema instanceof z.ZodNumber) {
    return parseInt(value, 10);
  }
  if (innerSchema instanceof z.ZodBoolean) {
    return value === "true" || value === true;
  }
  return value;
}

/**
 * Get default value from a Zod schema
 */
function getDefaultValue(schema: z.ZodType): unknown {
  if (schema instanceof z.ZodDefault) {
    // Zod 4: defaultValue is the value directly, not a function
    const defaultVal = schema._def.defaultValue;
    return typeof defaultVal === "function" ? defaultVal() : defaultVal;
  }
  return undefined;
}

/**
 * Format generate command output for CLI
 */
function formatGenerateOutput(output: GenerateOutput): void {
  const { problemPackage, savedTo } = output;

  console.log("\n");
  console.log(formatProblem(problemPackage.problem));
  console.log(formatSampleTestCases(problemPackage.sampleTestCases));

  if (savedTo) {
    showSuccess(`Problem saved to: ${savedTo}`);
  }

  showSuccess("Problem generation complete!");
  console.log(`\nStats:`);
  console.log(`   Difficulty: ${problemPackage.problem.difficulty}`);
  console.log(
    `   Total test cases: ${
      problemPackage.sampleTestCases.length +
      problemPackage.hiddenTestCases.length
    }`
  );
  console.log(
    `   Sample test cases: ${problemPackage.sampleTestCases.length}`
  );
  console.log(
    `   Hidden test cases: ${problemPackage.hiddenTestCases.length}`
  );
}

/**
 * Format solve command output for CLI
 */
function formatSolveOutput(output: SolveOutput, showHidden: boolean): void {
  const { sampleResults, hiddenResults, summary } = output;

  console.log("\nRunning sample test cases...");
  console.log(formatTestResults(sampleResults));

  if (hiddenResults !== undefined) {
    console.log("\nRunning hidden test cases...");
    if (showHidden) {
      console.log(formatTestResults(hiddenResults));
    } else {
      console.log(
        `\n   ${summary.hiddenPassed}/${summary.hiddenTotal} hidden test cases passed`
      );
    }
  }

  if (summary.allPassed) {
    const total = summary.sampleTotal + (summary.hiddenTotal || 0);
    const passed = summary.samplePassed + (summary.hiddenPassed || 0);
    showSuccess(`All tests passed! (${passed}/${total})`);
  } else if (summary.samplePassed < summary.sampleTotal) {
    showError(
      `Sample tests failed (${summary.samplePassed}/${summary.sampleTotal} passed)`
    );
    console.log("\nFix the sample test cases before running hidden tests.");
  } else {
    const total = summary.sampleTotal + (summary.hiddenTotal || 0);
    const passed = summary.samplePassed + (summary.hiddenPassed || 0);
    showError(`Some tests failed (${passed}/${total} passed)`);
  }
}

/**
 * Add a command definition to a Commander program
 */
function addCommand(
  program: Command,
  definition: AnyCommandDefinition
): void {
  const cmd = program.command(definition.name).description(definition.description);

  // Add options based on params
  for (const [key, param] of Object.entries(definition.params)) {
    const { cli, schema } = param as { cli: { flags: string; description: string; required?: boolean }; schema: z.ZodType };
    const defaultValue = getDefaultValue(schema);

    // Check if it's a boolean flag (no value argument)
    const isBoolean =
      schema instanceof z.ZodBoolean ||
      (schema instanceof z.ZodDefault &&
        schema._def.innerType instanceof z.ZodBoolean);

    if (cli.required) {
      cmd.requiredOption(cli.flags, cli.description, defaultValue as string);
    } else if (isBoolean) {
      // Boolean flags don't take values
      cmd.option(cli.flags, cli.description, defaultValue as boolean);
    } else if (defaultValue !== undefined) {
      cmd.option(cli.flags, cli.description, String(defaultValue));
    } else {
      cmd.option(cli.flags, cli.description);
    }
  }

  // Add action handler
  cmd.action(async (options: Record<string, unknown>) => {
    try {
      // Transform options to match schema keys and parse values
      const input: Record<string, unknown> = {};

      for (const [key, param] of Object.entries(definition.params)) {
        const { schema } = param as { schema: z.ZodType };

        // Map CLI option names to schema keys
        // e.g., "tests" -> "numTestCases", "samples" -> "numSamples"
        let optionKey = key;
        if (key === "numTestCases") optionKey = "tests";
        if (key === "numSamples") optionKey = "samples";
        if (key === "problemFile") optionKey = "problem";
        if (key === "solutionFile") optionKey = "solution";
        if (key === "showHidden") optionKey = "showHidden";

        const value = options[optionKey];

        if (value !== undefined) {
          input[key] =
            typeof value === "string"
              ? parseOptionValue(value, schema)
              : value;
        }
      }

      // Validate and parse with Zod (applies defaults)
      const validated = definition.schema.parse(input);

      // Execute handler
      const result = await definition.handler(validated);

      // Format output based on command type
      if (definition.name === "generate") {
        formatGenerateOutput(result as unknown as GenerateOutput);
      } else if (definition.name === "solve") {
        formatSolveOutput(
          result as unknown as SolveOutput,
          Boolean((validated as Record<string, unknown>).showHidden)
        );

        // Exit with error code if tests failed
        const solveResult = result as unknown as SolveOutput;
        if (!solveResult.summary.allPassed) {
          process.exit(1);
        }
      }
    } catch (error) {
      console.error("\nError:");
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}

/**
 * Create a Commander program from command definitions
 */
export function createCLIProgram(
  commands: AnyCommandDefinition[]
): Command {
  const program = new Command();

  program
    .name("AI LeetCode Generator")
    .description("Generate coding problems and test solutions against them")
    .version("1.0.0");

  for (const cmd of commands) {
    addCommand(program, cmd);
  }

  return program;
}
