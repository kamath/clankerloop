import { readFile } from "fs/promises";
import type { ProblemPackage, Language } from "../types/index.js";
import { ProblemPackageSchema } from "../types/index.js";
import { createTestRunner } from "../executor/index.js";
import { formatTestResults, showProgress, showSuccess, showError } from "../utils/index.js";

export interface SolveOptions {
  problemFile: string;
  solutionFile: string;
  language: Language;
  showHidden?: boolean;
}

/**
 * Test a user's solution against problem test cases
 */
export async function solveCommand(options: SolveOptions): Promise<void> {
  const { problemFile, solutionFile, language, showHidden = false } = options;

  try {
    showProgress("Loading problem package");

    // Load problem package
    const problemData = await readFile(problemFile, "utf-8");
    const problemPackage: ProblemPackage = ProblemPackageSchema.parse(JSON.parse(problemData));

    showProgress("Loading user solution");

    // Load user solution
    const userCode = await readFile(solutionFile, "utf-8");

    // Create test runner
    const testRunner = createTestRunner(language);

    // Validate runtime
    const hasRuntime = await testRunner["executor"].validateRuntime();
    if (!hasRuntime) {
      showError(`Runtime for ${language} not found. Please ensure it's installed.`);
      process.exit(1);
    }

    showProgress("Running tests");

    // Run sample tests
    console.log("\n📝 Running sample test cases...");
    const sampleResults = await testRunner.runTestCases(userCode, problemPackage.sampleTestCases);

    console.log(formatTestResults(sampleResults));

    const samplePassed = sampleResults.filter((r) => r.passed).length;
    const sampleTotal = sampleResults.length;

    // Run hidden tests if requested or if samples all passed
    if (showHidden || samplePassed === sampleTotal) {
      console.log("\n🔒 Running hidden test cases...");
      const hiddenResults = await testRunner.runTestCases(
        userCode,
        problemPackage.hiddenTestCases
      );

      if (showHidden) {
        console.log(formatTestResults(hiddenResults));
      } else {
        const hiddenPassed = hiddenResults.filter((r) => r.passed).length;
        const hiddenTotal = hiddenResults.length;
        console.log(`\n   ${hiddenPassed}/${hiddenTotal} hidden test cases passed`);
      }

      const allResults = [...sampleResults, ...hiddenResults];
      const totalPassed = allResults.filter((r) => r.passed).length;
      const totalTests = allResults.length;

      if (totalPassed === totalTests) {
        showSuccess(`All tests passed! (${totalPassed}/${totalTests})`);
      } else {
        showError(`Some tests failed (${totalPassed}/${totalTests} passed)`);
        process.exit(1);
      }
    } else {
      showError(`Sample tests failed (${samplePassed}/${sampleTotal} passed)`);
      console.log("\n💡 Fix the sample test cases before running hidden tests.");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Error testing solution:");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
