"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { MessageResponse } from "@/components/ai-elements/message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2Icon,
  CheckCircle2Icon,
  XCircleIcon,
  ClockIcon,
  ChevronDownIcon,
} from "lucide-react";
import type { GenerationStep } from "@/hooks/use-problem";
import { useRouter } from "next/navigation";
import { createProblem } from "@/actions/create-problem";
import { ClientFacingUserObject } from "@/lib/auth-types";
import { listFocusAreas } from "@/actions/list-focus-areas";
import { getProblemFocusAreas } from "@/actions/get-problem-focus-areas";
import { FocusAreaSelector } from "@/components/focus-area-selector";
import type { FocusArea } from "@repo/api-types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
  // Additional props for difficulty adjustment
  problemId: string;
  user: ClientFacingUserObject;
  selectedModel: string;
  isWorkflowErrored: boolean;
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
  problemId,
  user,
  selectedModel,
  isWorkflowErrored,
}: NonAdminProblemViewProps) {
  const router = useRouter();
  const [isAdjustingDifficulty, setIsAdjustingDifficulty] = useState(false);
  const [isRegeneratingSimilar, setIsRegeneratingSimilar] = useState(false);
  const [focusAreasOpen, setFocusAreasOpen] = useState(false);

  // Focus areas state
  const [allFocusAreas, setAllFocusAreas] = useState<FocusArea[]>([]);
  const [problemFocusAreas, setProblemFocusAreas] = useState<FocusArea[]>([]);
  const [selectedFocusAreaIds, setSelectedFocusAreaIds] = useState<string[]>(
    [],
  );
  const [isLoadingFocusAreas, setIsLoadingFocusAreas] = useState(true);
  const [isRegeneratingWithFocusAreas, setIsRegeneratingWithFocusAreas] =
    useState(false);
  const [focusAreasChanged, setFocusAreasChanged] = useState(false);

  // Load focus areas
  useEffect(() => {
    async function loadFocusAreas() {
      try {
        const [allAreas, problemAreas] = await Promise.all([
          listFocusAreas(user.apiKey),
          getProblemFocusAreas(problemId, user.apiKey),
        ]);
        setAllFocusAreas(allAreas);
        setProblemFocusAreas(problemAreas.focusAreas);
        setSelectedFocusAreaIds(problemAreas.focusAreas.map((fa) => fa.id));
      } catch (error) {
        console.error("Failed to load focus areas:", error);
      } finally {
        setIsLoadingFocusAreas(false);
      }
    }
    loadFocusAreas();
  }, [problemId, user.apiKey]);

  // Track if focus areas have changed from initial
  const handleFocusAreaChange = useCallback(
    (newIds: string[]) => {
      setSelectedFocusAreaIds(newIds);
      const originalIds = problemFocusAreas.map((fa) => fa.id).sort();
      const sortedNewIds = [...newIds].sort();
      const hasChanged =
        originalIds.length !== sortedNewIds.length ||
        originalIds.some((id, idx) => id !== sortedNewIds[idx]);
      setFocusAreasChanged(hasChanged);
    },
    [problemFocusAreas],
  );

  const handleRegenerateWithFocusAreas = async () => {
    if (!selectedModel) return;
    setIsRegeneratingWithFocusAreas(true);
    try {
      const result = await createProblem(
        selectedModel,
        user.apiKey,
        true,
        undefined,
        undefined,
        selectedFocusAreaIds.length > 0 ? selectedFocusAreaIds : undefined,
      );
      router.push(`/problem/${result.problemId}`);
    } catch (error) {
      console.error("Failed to regenerate with focus areas:", error);
    } finally {
      setIsRegeneratingWithFocusAreas(false);
    }
  };

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
    },
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

  const handleAdjustDifficulty = async (direction: "easier" | "harder") => {
    if (!selectedModel) return;
    setIsAdjustingDifficulty(true);
    try {
      const result = await createProblem(
        selectedModel,
        user.apiKey,
        true,
        undefined,
        { problemId, direction },
      );
      router.push(`/problem/${result.problemId}`);
    } catch (error) {
      console.error("Failed to adjust difficulty:", error);
    } finally {
      setIsAdjustingDifficulty(false);
    }
  };

  const handleRegenerateSimilar = async () => {
    if (!selectedModel) return;
    setIsRegeneratingSimilar(true);
    try {
      const result = await createProblem(
        selectedModel,
        user.apiKey,
        true,
        undefined,
        { problemId, direction: "similar" },
      );
      router.push(`/problem/${result.problemId}`);
    } catch (error) {
      console.error("Failed to regenerate similar problem:", error);
    } finally {
      setIsRegeneratingSimilar(false);
    }
  };

  // Check if generation is complete
  const isGenerationComplete = completedSteps.length === STEP_ORDER.length;

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

      {/* Focus Areas Section */}
      <Collapsible
        open={focusAreasOpen}
        onOpenChange={setFocusAreasOpen}
        className="border rounded-lg p-3 bg-muted/50"
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-2">
              <ChevronDownIcon
                className={`h-4 w-4 transition-transform ${
                  focusAreasOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
              <h3 className="text-sm font-medium">Focus Areas</h3>
              {!isLoadingFocusAreas && problemFocusAreas.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {problemFocusAreas.length} selected
                </Badge>
              )}
              {!isLoadingFocusAreas && problemFocusAreas.length === 0 && (
                <Badge variant="secondary" className="text-xs">
                  Random
                </Badge>
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3">
          {isLoadingFocusAreas ? (
            <div className="text-sm text-muted-foreground">
              Loading focus areas...
            </div>
          ) : (
            <>
              {problemFocusAreas.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">
                    Current focus areas:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {problemFocusAreas.map((fa) => (
                      <Badge key={fa.id} variant="default" className="text-xs">
                        {fa.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  Generate new problem with different focus areas:
                </div>
                <FocusAreaSelector
                  focusAreas={allFocusAreas}
                  selectedIds={selectedFocusAreaIds}
                  onChange={handleFocusAreaChange}
                  disabled={isRegeneratingWithFocusAreas || isGenerating}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerateWithFocusAreas}
                  disabled={
                    !focusAreasChanged ||
                    isRegeneratingWithFocusAreas ||
                    !selectedModel ||
                    isGenerating
                  }
                  className="w-full"
                >
                  {isRegeneratingWithFocusAreas
                    ? "Creating..."
                    : "Generate New Problem with Selected Focus Areas"}
                </Button>
              </div>
            </>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Adjust Difficulty Buttons */}
      <div className="flex gap-2 w-full">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => handleAdjustDifficulty("easier")}
          disabled={
            isAdjustingDifficulty ||
            isRegeneratingSimilar ||
            !selectedModel ||
            isGenerating ||
            !isGenerationComplete
          }
        >
          {isAdjustingDifficulty ? "Creating..." : "Make Easier"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => handleAdjustDifficulty("harder")}
          disabled={
            isAdjustingDifficulty ||
            isRegeneratingSimilar ||
            !selectedModel ||
            isGenerating ||
            !isGenerationComplete
          }
        >
          {isAdjustingDifficulty ? "Creating..." : "Make Harder"}
        </Button>
        {(isWorkflowErrored || isFailed) && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleRegenerateSimilar}
            disabled={
              isAdjustingDifficulty ||
              isRegeneratingSimilar ||
              !selectedModel ||
              isGenerating ||
              !isGenerationComplete
            }
          >
            {isRegeneratingSimilar ? "Creating..." : "Regenerate Similar"}
          </Button>
        )}
      </div>

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
