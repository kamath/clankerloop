import { writeFile } from "fs/promises";
import { join } from "path";
import type {
  Problem,
  Solution,
  TestCase,
  ProblemPackage,
  Difficulty,
  Language,
} from "../types/index.js";
import { TestCaseSchema } from "../types/index.js";
import { generateProblem } from "./problemGenerator.js";
import { generateSolution } from "./solutionGenerator.js";
import { generateTestCaseDescriptions } from "./testCaseGenerator.js";
import { generateTestInputCode } from "./testCodeGenerator.js";
import { createExecutor } from "../executor/index.js";
import { TEST_EXECUTION_CODE_TEMPLATE } from "../utils/index.js";

export { generateProblem, generateSolution, generateTestCaseDescriptions, generateTestInputCode };

/**
 * Generate a complete problem package with test cases
 * This is the main orchestration function that runs the entire pipeline
 */
export async function generateCompleteProblem(
  model: string,
  difficulty: Difficulty = "medium",
  language: Language = "javascript",
  options: {
    topic?: string;
    numTestCases?: number;
    numSampleTestCases?: number;
    outputDir?: string;
  } = {}
): Promise<ProblemPackage> {
  const { topic, numTestCases = 10, numSampleTestCases = 3, outputDir } = options;

  // Helper function to save to output directory
  const saveToDir = async (filename: string, data: unknown) => {
    if (outputDir) {
      await writeFile(join(outputDir, filename), JSON.stringify(data, null, 2), "utf-8");
    }
  };

  console.log("\n🎯 Generating problem...");
  const problem = await generateProblem(model, difficulty, topic);
  console.log(`✓ Generated problem: "${problem.title}"`);
  await saveToDir("problem.json", problem);

  console.log("\n💡 Generating solution...");
  const solution = await generateSolution(model, problem, language);
  console.log(`✓ Generated solution (${solution.timeComplexity} time, ${solution.spaceComplexity} space)`);
  await saveToDir("solution.json", solution);

  console.log("\n📝 Generating test case descriptions...");
  const testDescriptions = await generateTestCaseDescriptions(
    model,
    problem,
    solution,
    numTestCases
  );
  console.log(`✓ Generated ${testDescriptions.length} test case descriptions`);
  await saveToDir("testDescriptions.json", testDescriptions);

  console.log("\n🧪 Generating and executing test cases...");
  const executor = createExecutor(language);

  const allTestCases: TestCase[] = [];

  for (let i = 0; i < testDescriptions.length; i++) {
    const desc = testDescriptions[i];
    console.log(`  [${i + 1}/${testDescriptions.length}] ${desc.description}`);

    try {
      // Generate code to create test input
      const inputCode = await generateTestInputCode(model, problem, desc, language);
      await saveToDir(`testInputCode_${i}.json`, inputCode);

      // Execute code to get the input value
      const inputResult = await executor.execute(inputCode.code);

      if (!inputResult.success || inputResult.output === undefined) {
        console.warn(`    ⚠️  Failed to generate input: ${inputResult.error}`);
        continue;
      }

      const testInput = inputResult.output;

      // Execute solution with the test input to get expected output
      const solutionCode = TEST_EXECUTION_CODE_TEMPLATE(solution.code, testInput, language);
      const outputResult = await executor.execute(solutionCode);

      if (!outputResult.success || outputResult.output === undefined) {
        console.warn(`    ⚠️  Failed to get expected output: ${outputResult.error}`);
        continue;
      }

      const expectedOutput = outputResult.output;

      // Create test case
      const testCase = TestCaseSchema.parse({
        id: desc.id,
        description: desc.description,
        input: testInput,
        expectedOutput,
        isEdgeCase: desc.isEdgeCase,
        isSample: i < numSampleTestCases, // First N test cases are samples
      });

      allTestCases.push(testCase);
      console.log(`    ✓ Test case generated`);
    } catch (error) {
      console.warn(`    ⚠️  Error generating test case: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log(`\n✓ Successfully generated ${allTestCases.length} test cases`);
  await saveToDir("testCases.json", allTestCases);

  // Split into sample and hidden test cases
  const sampleTestCases = allTestCases.filter((tc) => tc.isSample);
  const hiddenTestCases = allTestCases.filter((tc) => !tc.isSample);

  console.log(`  - ${sampleTestCases.length} sample test cases (visible to user)`);
  console.log(`  - ${hiddenTestCases.length} hidden test cases (for validation)`);

  const problemPackage: ProblemPackage = {
    problem,
    sampleTestCases,
    hiddenTestCases,
  };
  await saveToDir("problemPackage.json", problemPackage);

  return problemPackage;
}
