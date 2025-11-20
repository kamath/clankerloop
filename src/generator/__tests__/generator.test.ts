import { describe, it, expect, beforeAll, mock } from "bun:test";
import { readFile } from "fs/promises";
import { join } from "path";
import type { Problem, Solution, TestCaseDescription, TestCaseInputCode } from "../../types/index.js";

// Mock data directory - update this path to match your generated problem UUID
const MOCK_DATA_DIR = join(process.cwd(), "problem", "85c17b55-3105-495c-bd85-6b564bba26fb");

// Load mock data
let mockProblem: Problem;
let mockSolution: Solution;
let mockTestDescriptions: TestCaseDescription[];
let mockTestInputCode: TestCaseInputCode;

beforeAll(async () => {
  // Load all mock data from the generated problem directory
  mockProblem = JSON.parse(await readFile(join(MOCK_DATA_DIR, "problem.json"), "utf-8"));
  mockSolution = JSON.parse(await readFile(join(MOCK_DATA_DIR, "solution.json"), "utf-8"));
  mockTestDescriptions = JSON.parse(await readFile(join(MOCK_DATA_DIR, "testDescriptions.json"), "utf-8"));
  mockTestInputCode = JSON.parse(await readFile(join(MOCK_DATA_DIR, "testInputCode_0.json"), "utf-8"));
});

describe("problemGenerator", () => {
  it("should generate a problem with correct structure", async () => {
    // Mock the AI SDK
    mock.module("ai", () => ({
      generateObject: mock(async () => ({
        object: {
          title: mockProblem.title,
          description: mockProblem.description,
          difficulty: mockProblem.difficulty,
          constraints: mockProblem.constraints,
          examples: mockProblem.examples,
          functionSignature: mockProblem.functionSignature,
        },
      })),
      generateText: mock(async () => ({ text: "" })),
    }));

    // Import after mocking
    const { generateProblem } = await import("../problemGenerator.js");

    const result = await generateProblem("google/gemini-2.0-flash", "easy");

    // Verify structure
    expect(result).toHaveProperty("id");
    expect(result.title).toBe(mockProblem.title);
    expect(result.description).toBe(mockProblem.description);
    expect(result.difficulty).toBe(mockProblem.difficulty);
    expect(result.constraints).toEqual(mockProblem.constraints);
    expect(result.examples).toEqual(mockProblem.examples);
    expect(result.functionSignature).toEqual(mockProblem.functionSignature);
  });

  it("should generate a problem with valid difficulty", async () => {
    mock.module("ai", () => ({
      generateObject: mock(async () => ({
        object: {
          title: mockProblem.title,
          description: mockProblem.description,
          difficulty: mockProblem.difficulty,
          constraints: mockProblem.constraints,
          examples: mockProblem.examples,
          functionSignature: mockProblem.functionSignature,
        },
      })),
      generateText: mock(async () => ({ text: "" })),
    }));

    const { generateProblem } = await import("../problemGenerator.js");

    const result = await generateProblem("google/gemini-2.0-flash", "easy");

    expect(["easy", "medium", "hard"]).toContain(result.difficulty);
  });
});

describe("solutionGenerator", () => {
  it("should generate a solution with correct structure", async () => {
    mock.module("ai", () => ({
      generateObject: mock(async () => ({
        object: {
          code: mockSolution.code,
          explanation: mockSolution.explanation,
          timeComplexity: mockSolution.timeComplexity,
          spaceComplexity: mockSolution.spaceComplexity,
        },
      })),
      generateText: mock(async () => ({ text: "" })),
    }));

    const { generateSolution } = await import("../solutionGenerator.js");

    const result = await generateSolution("google/gemini-2.0-flash", mockProblem, "typescript");

    expect(result).toHaveProperty("problemId");
    expect(result.problemId).toBe(mockProblem.id);
    expect(result.language).toBe("typescript");
    expect(result.code).toBe(mockSolution.code);
    expect(result.explanation).toBe(mockSolution.explanation);
    expect(result.timeComplexity).toBe(mockSolution.timeComplexity);
    expect(result.spaceComplexity).toBe(mockSolution.spaceComplexity);
  });

  it("should include time and space complexity", async () => {
    mock.module("ai", () => ({
      generateObject: mock(async () => ({
        object: {
          code: mockSolution.code,
          explanation: mockSolution.explanation,
          timeComplexity: mockSolution.timeComplexity,
          spaceComplexity: mockSolution.spaceComplexity,
        },
      })),
      generateText: mock(async () => ({ text: "" })),
    }));

    const { generateSolution } = await import("../solutionGenerator.js");

    const result = await generateSolution("google/gemini-2.0-flash", mockProblem, "typescript");

    expect(result.timeComplexity).toBeTruthy();
    expect(result.spaceComplexity).toBeTruthy();
    expect(result.timeComplexity).toMatch(/O\(/);
    expect(result.spaceComplexity).toMatch(/O\(/);
  });
});

describe("testCaseGenerator", () => {
  it("should generate test case descriptions with correct structure", async () => {
    mock.module("ai", () => ({
      generateObject: mock(async () => ({
        object: {
          testCases: mockTestDescriptions.map((tc) => ({
            description: tc.description,
            expectedBehavior: tc.expectedBehavior,
            isEdgeCase: tc.isEdgeCase,
          })),
        },
      })),
      generateText: mock(async () => ({ text: "" })),
    }));

    const { generateTestCaseDescriptions } = await import("../testCaseGenerator.js");

    const result = await generateTestCaseDescriptions(
      "google/gemini-2.0-flash",
      mockProblem,
      mockSolution,
      10
    );

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    // Verify each test case has required properties
    for (const tc of result) {
      expect(tc).toHaveProperty("id");
      expect(tc).toHaveProperty("description");
      expect(tc).toHaveProperty("expectedBehavior");
      expect(tc).toHaveProperty("isEdgeCase");
      expect(typeof tc.isEdgeCase).toBe("boolean");
    }
  });

  it("should include both edge cases and normal cases", async () => {
    mock.module("ai", () => ({
      generateObject: mock(async () => ({
        object: {
          testCases: mockTestDescriptions.map((tc) => ({
            description: tc.description,
            expectedBehavior: tc.expectedBehavior,
            isEdgeCase: tc.isEdgeCase,
          })),
        },
      })),
      generateText: mock(async () => ({ text: "" })),
    }));

    const { generateTestCaseDescriptions } = await import("../testCaseGenerator.js");

    const result = await generateTestCaseDescriptions(
      "google/gemini-2.0-flash",
      mockProblem,
      mockSolution,
      10
    );

    const edgeCases = result.filter((tc) => tc.isEdgeCase);
    const normalCases = result.filter((tc) => !tc.isEdgeCase);

    expect(edgeCases.length).toBeGreaterThan(0);
    expect(normalCases.length).toBeGreaterThan(0);
  });
});

describe("testCodeGenerator", () => {
  it("should generate test input code with correct structure", async () => {
    mock.module("ai", () => ({
      generateObject: mock(async () => ({ object: {} })),
      generateText: mock(async () => ({
        text: mockTestInputCode.code,
      })),
    }));

    const { generateTestInputCode } = await import("../testCodeGenerator.js");

    const result = await generateTestInputCode(
      "google/gemini-2.0-flash",
      mockProblem,
      mockTestDescriptions[0],
      "typescript"
    );

    expect(result).toHaveProperty("testCaseId");
    expect(result).toHaveProperty("language");
    expect(result).toHaveProperty("code");
    expect(result.testCaseId).toBe(mockTestDescriptions[0].id);
    expect(result.language).toBe("typescript");
    expect(typeof result.code).toBe("string");
  });

  it("should strip markdown code fences from generated code", async () => {
    const codeWithFences = "```typescript\n" + mockTestInputCode.code + "\n```";

    mock.module("ai", () => ({
      generateObject: mock(async () => ({ object: {} })),
      generateText: mock(async () => ({
        text: codeWithFences,
      })),
    }));

    const { generateTestInputCode } = await import("../testCodeGenerator.js");

    const result = await generateTestInputCode(
      "google/gemini-2.0-flash",
      mockProblem,
      mockTestDescriptions[0],
      "typescript"
    );

    // Should not contain markdown fences
    expect(result.code).not.toContain("```");
    expect(result.code).toBe(mockTestInputCode.code);
  });
});
