"use client";

import { useMemo } from "react";
import { MessageResponse } from "@/components/ai-elements/message";
import { Badge } from "@/components/ui/badge";
import {
  Loader2Icon,
  CheckCircle2Icon,
  XCircleIcon,
  ClockIcon,
} from "lucide-react";
import type { GenerationStep } from "@/hooks/use-problem";

// Step order matching backend STEP_ORDER
const STEP_ORDER: GenerationStep[] = [
  "generateProblemText",
  "parseFunctionSignature",
  "generateTestCases",
  "generateTestCaseInputCode",
  "generateSolution",
];

interface NonAdminProblemViewProps {
  // Problem text
  problemText:
    | {
        problemTextReworded?: string;
      }
    | null
    | undefined;
  // Test cases
  testCases:
    | Array<{
        description: string;
        isSampleCase: boolean;
        isEdgeCase: boolean;
      }>
    | null
    | undefined;
  // Test case inputs (already filtered to sample cases by backend)
  testCaseInputs: unknown[] | null | undefined;
  // Test case outputs (need to match with sample cases)
  testCaseOutputs: unknown[] | null | undefined;
  // Generation status hooks
  completedSteps: GenerationStep[];
  currentStep: GenerationStep | null | undefined;
  isGenerating: boolean;
  isFailed: boolean;
  generationError: unknown;
}

export default function NonAdminProblemView({
  problemText,
  testCases,
  testCaseInputs,
  testCaseOutputs,
  completedSteps,
  currentStep,
  isGenerating,
  isFailed,
  generationError,
}: NonAdminProblemViewProps) {
  // Filter to sample test cases only
  const sampleTestCases = testCases
    ? testCases.filter((tc) => tc.isSampleCase === true)
    : [];

  // Match sample test cases with their inputs and outputs
  // Backend already filters testCaseInputs to only sample cases
  // We need to match outputs by index (assuming outputs are in same order as all test cases)
  const sampleTestCasesWithData = sampleTestCases.map(
    (testCase, sampleIndex) => {
      const allTestCaseIndex = testCases!.findIndex((tc) => tc === testCase);
      return {
        testCase,
        input: testCaseInputs?.[sampleIndex] ?? null,
        output: testCaseOutputs?.[allTestCaseIndex] ?? null,
      };
    }
  );

  // Helper function to get step display name
  const getStepDisplayName = (step: GenerationStep): string => {
    const names: Record<GenerationStep, string> = {
      generateProblemText: "Problem Text",
      parseFunctionSignature: "Function Signature Schema",
      generateTestCases: "Test Cases",
      generateTestCaseInputCode: "Test Case Inputs",
      generateSolution: "Solution & Test Case Outputs",
    };
    return names[step];
  };

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    const completed = completedSteps.length;
    const total = STEP_ORDER.length;
    return {
      completed,
      total,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [completedSteps]);

  // Get overall status
  const overallStatus = useMemo(() => {
    if (isFailed)
      return { type: "error" as const, message: "Generation failed" };
    if (isGenerating && currentStep) {
      return {
        type: "generating" as const,
        message: `Generating ${getStepDisplayName(currentStep)}...`,
      };
    }
    if (completedSteps.length === STEP_ORDER.length) {
      return { type: "complete" as const, message: "Generation complete" };
    }
    if (completedSteps.length > 0) {
      return {
        type: "partial" as const,
        message: `${completedSteps.length} of ${STEP_ORDER.length} steps complete`,
      };
    }
    return { type: "idle" as const, message: "Ready to generate" };
  }, [isFailed, isGenerating, currentStep, completedSteps]);

  // Top-level status indicator component
  const TopLevelStatusIndicator = () => {
    return (
      <div className="border rounded-lg p-3 bg-muted/50 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {overallStatus.type === "generating" && (
              <Loader2Icon className="h-4 w-4 animate-spin text-primary" />
            )}
            {overallStatus.type === "complete" && (
              <CheckCircle2Icon className="h-4 w-4 text-green-600" />
            )}
            {overallStatus.type === "error" && (
              <XCircleIcon className="h-4 w-4 text-destructive" />
            )}
            {overallStatus.type === "idle" && (
              <ClockIcon className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">{overallStatus.message}</span>
          </div>
          {overallStatus.type !== "idle" && (
            <Badge variant="outline" className="text-xs">
              {overallProgress.completed}/{overallProgress.total}
            </Badge>
          )}
        </div>
        {overallStatus.type === "generating" && (
          <div className="w-full bg-background rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${overallProgress.percent}%` }}
            />
          </div>
        )}
        {currentStep && overallStatus.type === "generating" && (
          <div className="text-xs text-muted-foreground">
            Current step: {getStepDisplayName(currentStep)}
          </div>
        )}
        {overallStatus.type === "error" && generationError != null && (
          <div className="text-xs text-destructive">
            {generationError instanceof Error
              ? generationError.message
              : typeof generationError === "string"
                ? generationError
                : JSON.stringify(generationError)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full overflow-auto p-4 flex flex-col gap-6">
      <TopLevelStatusIndicator />
      {/* Problem Text Reworded */}
      {problemText?.problemTextReworded && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Problem Description</h2>
          <MessageResponse>{problemText.problemTextReworded}</MessageResponse>
        </div>
      )}

      {/* Sample Test Cases with Example Inputs/Outputs */}
      {sampleTestCasesWithData.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Sample Test Cases</h2>
          <div className="space-y-3">
            {sampleTestCasesWithData.map((item, i) => (
              <div
                key={`sample-testcase-${i}`}
                className="border rounded-lg p-3 bg-muted/30 space-y-2 overflow-hidden"
              >
                <div className="text-sm font-medium mb-1">
                  Test Case {i + 1}
                  {item.testCase.isEdgeCase && (
                    <Badge variant="outline" className="ml-2">
                      Edge Case
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  {item.testCase.description}
                </div>
                {item.input && item.output && (
                  <div className="space-y-1 pt-2 border-t">
                    <div className="break-words overflow-wrap-anywhere">
                      <span className="text-xs font-medium text-muted-foreground">
                        Input:{" "}
                      </span>
                      <span className="text-sm font-mono break-all">
                        {JSON.stringify(item.input)}
                      </span>
                    </div>
                    <div className="break-words overflow-wrap-anywhere">
                      <span className="text-xs font-medium text-muted-foreground">
                        Output:{" "}
                      </span>
                      <span className="text-sm font-mono break-all">
                        {JSON.stringify(item.output)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
