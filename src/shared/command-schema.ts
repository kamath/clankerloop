import { z } from "zod";

/**
 * CLI-specific metadata for a command parameter
 */
export interface CLIParamConfig {
  flags: string; // e.g., "-m, --model <string>" or "--show-hidden"
  description: string;
  required?: boolean;
}

/**
 * HTTP-specific metadata for a command parameter
 */
export interface HTTPParamConfig {
  in: "body" | "query" | "param";
}

/**
 * Configuration for a single command parameter
 */
export interface ParamConfig<T extends z.ZodType = z.ZodType> {
  schema: T;
  cli: CLIParamConfig;
  http: HTTPParamConfig;
}

/**
 * A unified command definition that works for both CLI and HTTP
 */
export interface CommandDefinition<
  TInput extends z.ZodRawShape,
  TOutput
> {
  name: string;
  description: string;
  params: { [K in keyof TInput]: ParamConfig<TInput[K]> };
  handler: (input: z.infer<z.ZodObject<TInput>>) => Promise<TOutput>;
}

/**
 * Helper function to define a command with proper typing
 */
export function defineCommand<
  TInput extends z.ZodRawShape,
  TOutput
>(
  definition: CommandDefinition<TInput, TOutput>
): CommandDefinition<TInput, TOutput> & {
  schema: z.ZodObject<TInput>;
} {
  // Build the Zod schema from params
  const schemaShape = {} as TInput;
  for (const [key, param] of Object.entries(definition.params)) {
    (schemaShape as Record<string, z.ZodType>)[key] = param.schema;
  }

  return {
    ...definition,
    schema: z.object(schemaShape),
  };
}

/**
 * Type helper to extract the input type from a command definition
 */
export type CommandInput<T> = T extends CommandDefinition<infer TInput, unknown>
  ? z.infer<z.ZodObject<TInput>>
  : never;

/**
 * Type helper to extract the output type from a command definition
 */
export type CommandOutput<T> = T extends CommandDefinition<z.ZodRawShape, infer TOutput>
  ? TOutput
  : never;

/**
 * Base type for any command definition (for arrays of mixed commands)
 */
export type AnyCommandDefinition = {
  name: string;
  description: string;
  params: Record<string, ParamConfig>;
  schema: z.ZodObject<z.ZodRawShape>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (input: any) => Promise<unknown>;
};
