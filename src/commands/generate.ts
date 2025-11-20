import { z } from "zod";
import { writeFile } from "fs/promises";
import { join } from "path";
import { defineCommand } from "../shared/command-schema.js";
import {
  LanguageSchema,
  DifficultySchema,
  type ProblemPackage,
} from "../types/index.js";
import { generateCompleteProblem } from "../generator/index.js";

/**
 * Output type for the generate command
 */
export interface GenerateOutput {
  problemPackage: ProblemPackage;
  savedTo?: string;
}

/**
 * Generate command definition with unified schema for CLI and HTTP
 */
export const generateCommand = defineCommand({
  name: "generate",
  description: "Generate a new coding problem",
  params: {
    model: {
      schema: z.string().default("google/gemini-2.0-flash"),
      cli: {
        flags: "--model <string>",
        description: "AI model to use",
      },
      http: { in: "body" },
    },
    difficulty: {
      schema: DifficultySchema.default("medium"),
      cli: {
        flags: "--difficulty <level>",
        description: "Problem difficulty: easy, medium, hard",
      },
      http: { in: "body" },
    },
    language: {
      schema: LanguageSchema.default("javascript"),
      cli: {
        flags: "--language <lang>",
        description: "Target language: javascript, typescript, python",
      },
      http: { in: "body" },
    },
    topic: {
      schema: z.string().optional(),
      cli: {
        flags: "--topic <string>",
        description: "Problem topic (e.g., 'arrays', 'dynamic programming')",
      },
      http: { in: "body" },
    },
    numTestCases: {
      schema: z.number().default(10),
      cli: {
        flags: "--tests <number>",
        description: "Number of test cases to generate",
      },
      http: { in: "body" },
    },
    numSamples: {
      schema: z.number().default(3),
      cli: {
        flags: "--samples <number>",
        description: "Number of sample test cases",
      },
      http: { in: "body" },
    },
    output: {
      schema: z.string().optional(),
      cli: {
        flags: "--output <file>",
        description: "Save problem to JSON file",
      },
      http: { in: "body" },
    },
  },
  handler: async (input): Promise<GenerateOutput> => {
    const {
      model,
      difficulty,
      language,
      topic,
      numTestCases,
      numSamples,
      output,
    } = input;

    const problemPackage = await generateCompleteProblem(
      model,
      difficulty,
      language,
      {
        topic,
        numTestCases,
        numSampleTestCases: numSamples,
      }
    );

    let savedTo: string | undefined;

    // Save to file if requested
    if (output) {
      const outputPath = join(process.cwd(), output);
      await writeFile(
        outputPath,
        JSON.stringify(problemPackage, null, 2),
        "utf-8"
      );
      savedTo = outputPath;
    }

    return {
      problemPackage,
      savedTo,
    };
  },
});

/**
 * Type alias for the generate command input
 */
export type GenerateInput = z.infer<typeof generateCommand.schema>;
