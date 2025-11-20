import { z } from "zod";
import { readFile } from "fs/promises";
import { defineCommand } from "../shared/command-schema.js";
import {
  LanguageSchema,
  ProblemPackageSchema,
  type ProblemPackage,
  type TestResult,
} from "../types/index.js";
import { createTestRunner } from "../executor/index.js";

/**
 * Output type for the solve command
 */
export interface SolveOutput {
  sampleResults: TestResult[];
  hiddenResults?: TestResult[];
  summary: {
    samplePassed: number;
    sampleTotal: number;
    hiddenPassed?: number;
    hiddenTotal?: number;
    allPassed: boolean;
  };
}

/**
 * Solve command definition with unified schema for CLI and HTTP
 *
 * For CLI: Uses problemFile and solutionFile
 * For API: Uses problemPackage and solutionCode directly
 */
export const solveCommand = defineCommand({
  name: "solve",
  description: "Test a user's solution against problem test cases",
  params: {
    // CLI-specific: file paths
    problemFile: {
      schema: z.string().optional(),
      cli: {
        flags: "--problem <file>",
        description: "Path to problem JSON file",
        required: true,
      },
      http: { in: "body" },
    },
    solutionFile: {
      schema: z.string().optional(),
      cli: {
        flags: "--solution <file>",
        description: "Path to solution file",
        required: true,
      },
      http: { in: "body" },
    },
    // API-specific: direct data
    problemPackage: {
      schema: ProblemPackageSchema.optional(),
      cli: {
        flags: "--problem-data <json>",
        description: "Problem package as JSON (alternative to --problem)",
      },
      http: { in: "body" },
    },
    solutionCode: {
      schema: z.string().optional(),
      cli: {
        flags: "--solution-code <code>",
        description: "Solution code string (alternative to --solution)",
      },
      http: { in: "body" },
    },
    // Common params
    language: {
      schema: LanguageSchema.default("javascript"),
      cli: {
        flags: "--language <lang>",
        description: "Solution language: javascript, typescript, python",
      },
      http: { in: "body" },
    },
    showHidden: {
      schema: z.boolean().default(false),
      cli: {
        flags: "--show-hidden",
        description: "Show results of hidden test cases",
      },
      http: { in: "body" },
    },
  },
  handler: async (input): Promise<SolveOutput> => {
    const {
      problemFile,
      solutionFile,
      problemPackage: inputProblemPackage,
      solutionCode: inputSolutionCode,
      language,
      showHidden,
    } = input;

    // Resolve problem package
    let problemPackage: ProblemPackage;
    if (inputProblemPackage) {
      problemPackage = inputProblemPackage;
    } else if (problemFile) {
      const problemData = await readFile(problemFile, "utf-8");
      problemPackage = ProblemPackageSchema.parse(JSON.parse(problemData));
    } else {
      throw new Error("Either problemFile or problemPackage must be provided");
    }

    // Resolve solution code
    let solutionCode: string;
    if (inputSolutionCode) {
      solutionCode = inputSolutionCode;
    } else if (solutionFile) {
      solutionCode = await readFile(solutionFile, "utf-8");
    } else {
      throw new Error("Either solutionFile or solutionCode must be provided");
    }

    // Create test runner
    const testRunner = createTestRunner(language);

    // Validate runtime
    const hasRuntime = await testRunner["executor"].validateRuntime();
    if (!hasRuntime) {
      throw new Error(
        `Runtime for ${language} not found. Please ensure it's installed.`
      );
    }

    // Run sample tests
    const sampleResults = await testRunner.runTestCases(
      solutionCode,
      problemPackage.sampleTestCases
    );

    const samplePassed = sampleResults.filter((r) => r.passed).length;
    const sampleTotal = sampleResults.length;

    // Determine if we should run hidden tests
    const shouldRunHidden = showHidden || samplePassed === sampleTotal;

    let hiddenResults: TestResult[] | undefined;
    let hiddenPassed: number | undefined;
    let hiddenTotal: number | undefined;

    if (shouldRunHidden) {
      hiddenResults = await testRunner.runTestCases(
        solutionCode,
        problemPackage.hiddenTestCases
      );
      hiddenPassed = hiddenResults.filter((r) => r.passed).length;
      hiddenTotal = hiddenResults.length;
    }

    // Calculate if all tests passed
    const allPassed = shouldRunHidden
      ? samplePassed === sampleTotal &&
        hiddenPassed === hiddenTotal
      : samplePassed === sampleTotal;

    return {
      sampleResults,
      hiddenResults: showHidden ? hiddenResults : undefined,
      summary: {
        samplePassed,
        sampleTotal,
        hiddenPassed,
        hiddenTotal,
        allPassed,
      },
    };
  },
});

/**
 * Type alias for the solve command input
 */
export type SolveInput = z.infer<typeof solveCommand.schema>;
