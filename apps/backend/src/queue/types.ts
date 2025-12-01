export type GenerationStep =
  | "generateProblemText"
  | "generateTestCases"
  | "generateTestCaseInputCode"
  | "generateTestCaseInputs"
  | "generateSolution"
  | "generateTestCaseOutputs";

export interface QueueMessage {
  jobId: string;
  problemId: string;
  step: GenerationStep;
  model: string;
  returnDummy?: boolean;
}

// Step order for sequential execution
export const STEP_ORDER: GenerationStep[] = [
  "generateProblemText",
  "generateTestCases",
  "generateTestCaseInputCode",
  "generateTestCaseInputs",
  "generateSolution",
  "generateTestCaseOutputs",
];

export function getNextStep(
  currentStep: GenerationStep,
): GenerationStep | null {
  const idx = STEP_ORDER.indexOf(currentStep);
  return idx < STEP_ORDER.length - 1 ? STEP_ORDER[idx + 1] : null;
}
