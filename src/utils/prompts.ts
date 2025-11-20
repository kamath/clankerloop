import type { Problem, TestCaseDescription, Language } from '../types/index.js';

/**
 * Test case with input only (no expected output yet)
 */
export interface TestCaseInput {
  description: string;
  input: unknown;
  isEdgeCase: boolean;
}

export const PROBLEM_GENERATION_PROMPT = (difficulty: string, topic?: string) => `
Generate a coding problem for a LeetCode-style platform.

Difficulty: ${difficulty}
${topic ? `Topic: ${topic}` : ''}

The problem should:
1. Be clearly stated with a description
2. Include constraints (e.g., input ranges, time limits)
3. Have 2-3 example test cases with explanations
4. Include function signatures for JavaScript, TypeScript, and Python
5. Be solvable and interesting

Focus on common algorithmic patterns like arrays, strings, hashmaps, trees, graphs, dynamic programming, etc.
`;

export const SOLUTION_GENERATION_PROMPT = (
  problem: Problem,
  language: Language,
  testCases?: TestCaseInput[],
) => `
Generate an optimal solution for the following coding problem in ${language}.

Problem: ${problem.title}
${problem.description}

Constraints:
${problem.constraints.join('\n')}

Examples:
${problem.examples.map((ex, i) => `Example ${i + 1}:\nInput: ${ex.input}`).join('\n\n')}

Reference Function Signature (${language}):
${problem.functionSignature[language]}
${
  testCases && testCases.length > 0
    ? `
Test Cases to Consider:
${testCases
  .map(
    (tc, i) => `${i + 1}. ${tc.description}${tc.isEdgeCase ? ' (edge case)' : ''}
   Input: ${JSON.stringify(tc.input)}`,
  )
  .join('\n')}

Your solution must correctly handle ALL of the above test cases.
`
    : ''
}
Provide:
1. Complete, working code
2. Explanation of the approach
3. Time complexity analysis
4. Space complexity analysis

IMPORTANT: The function MUST be named "solution" (not the problem-specific name). Use the same parameters and return type as the reference signature, but name it "solution".

For example:
- JavaScript/TypeScript: function solution(nums, target) { ... }
- Python: def solution(nums, target): ...

The solution should be optimal and well-commented.
`;

export const TEST_CASE_GENERATION_PROMPT = (problem: Problem) => `
Generate a comprehensive list of test cases for the following coding problem.

Problem: ${problem.title}
${problem.description}

Constraints:
${problem.constraints.join('\n')}

Examples:
${problem.examples.map((ex, i) => `Example ${i + 1}:\nInput: ${ex.input}\nOutput: ${ex.output}${ex.explanation ? `\nExplanation: ${ex.explanation}` : ''}`).join('\n\n')}

Generate 8-12 test cases that include:
1. Basic cases (2-3): Simple, straightforward inputs
2. Edge cases (3-4): Empty inputs, single elements, minimum/maximum values, boundary conditions
3. Complex cases (3-4): Larger inputs, tricky scenarios

For each test case, provide:
- A description of what it tests
- Expected behavior
- Whether it's an edge case

Do NOT include the actual input/output values yet - just describe them in natural language.
`;

export const TEST_CODE_GENERATION_PROMPT = (
  problem: Problem,
  testDescription: TestCaseDescription,
  language: Language,
) => `
Generate executable ${language} code that produces the input for the following test case.

Problem: ${problem.title}
${problem.description}

Function Signature (${language}):
${problem.functionSignature[language]}

Test Case Description:
${testDescription.description}
Expected Behavior: ${testDescription.expectedBehavior}

Generate code that:
1. Creates the input value(s) described in the test case
2. Exports or prints the input in a format that can be easily parsed
3. Uses JSON.stringify() for JavaScript/TypeScript or json.dumps() for Python to output the result

The code should only generate the INPUT, not execute the solution function.
For example, if the function takes an array of numbers, output: JSON.stringify([1, 2, 3, 4])

Output ONLY the code, nothing else.
`;

export const TEST_EXECUTION_CODE_TEMPLATE = (
  functionCode: string,
  testInput: unknown,
  language: Language,
): string => {
  if (language === 'javascript' || language === 'typescript') {
    return `
${functionCode}

const input = ${JSON.stringify(testInput)};
const result = solution(...(Array.isArray(input) ? input : [input]));
console.log(JSON.stringify(result));
`;
  } else if (language === 'python') {
    return `
import json

${functionCode}

input_data = json.loads('${JSON.stringify(testInput)}')
result = solution(*input_data) if isinstance(input_data, list) else solution(input_data)
print(json.dumps(result))
`;
  }
  throw new Error(`Unsupported language: ${language}`);
};
