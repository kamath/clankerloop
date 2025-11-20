import { createCLIProgram } from "../adapters/cli.js";
import { generateCommand, solveCommand } from "../commands/index.js";

// Re-export types for backward compatibility
export type { GenerateInput as GenerateOptions } from "../commands/generate.js";
export type { SolveInput as SolveOptions } from "../commands/solve.js";

/**
 * Parse command line arguments and route to appropriate command using commander
 */
export async function runCLI(args: string[]): Promise<void> {
  const program = createCLIProgram([generateCommand, solveCommand]);
  await program.parseAsync(args, { from: "user" });
}
