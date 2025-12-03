"use client";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { MessageResponse } from "@/components/ai-elements/message";
import Loader from "@/components/client/loader";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2Icon,
  Loader2Icon,
  XCircleIcon,
  ClockIcon,
  ChevronDownIcon,
  PlusIcon,
  XIcon,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import type { GenerationStep } from "@/hooks/use-problem";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { ClientFacingUserObject } from "@/lib/auth-types";
import type { CodeGenLanguage } from "@/hooks/use-problem";
import { useRouter } from "next/navigation";
import { createProblem } from "@/actions/create-problem";
import { listFocusAreas } from "@/actions/list-focus-areas";
import { getProblemFocusAreas } from "@/actions/get-problem-focus-areas";
import { FocusAreaSelector } from "@/components/focus-area-selector";
import type { FocusArea } from "@repo/api-types";

// Step order matching backend STEP_ORDER
const STEP_ORDER: GenerationStep[] = [
  "generateProblemText",
  "parseFunctionSignature",
  "generateTestCases",
  "generateTestCaseInputCode",
  "generateSolution",
];

type StepStatus = "loading" | "complete" | "error" | "pending" | "not_started";

interface AdminCollapsiblesProps {
  problemId: string;
  user: ClientFacingUserObject;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  userSolution: string | null;
  setUserSolution: (solution: string | null) => void;
  language: CodeGenLanguage;
  // Problem text hooks
  isProblemTextLoading: boolean;
  problemTextError: unknown;
  problemText:
    | {
        problemText: string;
        functionSignature: string;
        problemTextReworded?: string;
        functionSignatureSchema?: unknown;
      }
    | null
    | undefined;
  getProblemText: () => void;
  callGenerateProblemText: (
    model: string,
    forceError: boolean,
    returnDummy: boolean,
    skipCache: boolean,
  ) => void;
  // Test cases hooks
  isTestCasesLoading: boolean;
  testCasesError: unknown;
  testCases:
    | Array<{
        description: string;
        isSampleCase: boolean;
        isEdgeCase: boolean;
      }>
    | null
    | undefined;
  getTestCases: () => void;
  callGenerateTestCases: (
    model: string,
    forceError: boolean,
    returnDummy: boolean,
    skipCache: boolean,
  ) => void;
  // Test case input code hooks
  isTestCaseInputsLoading: boolean;
  testCaseInputCodeError: unknown;
  testCaseInputCode: string[] | null | undefined;
  getCodeToGenerateTestCaseInputs: () => void;
  callGenerateTestCaseInputCode: (
    model: string,
    forceError: boolean,
    returnDummy: boolean,
    skipCache: boolean,
  ) => void;
  // Test case inputs hooks
  testCaseInputs: unknown[] | null | undefined;
  getTestCaseInputs: () => void;
  // Solution hooks
  isGenerateSolutionLoading: boolean;
  solutionError: unknown;
  solution: string | null | undefined;
  getSolution: () => void;
  callGenerateSolution: (
    model: string,
    updateProblem?: boolean,
    enqueueNextStep?: boolean,
    forceError?: boolean,
    returnDummy?: boolean,
  ) => Promise<string | null>;
  // Test case outputs hooks
  testCaseOutputs: unknown[] | null | undefined;
  getTestCaseOutputs: () => void;
  // Run user solution hooks
  isRunUserSolutionLoading: boolean;
  userSolutionError: unknown;
  userSolutionTestResults:
    | Array<{
        testCase: {
          description: string;
          isEdgeCase: boolean;
        };
        status: string;
        expected?: unknown;
        actual?: unknown;
        error?: string;
        stdout?: string;
      }>
    | null
    | undefined;
  callRunUserSolution: () => Promise<unknown>;
  // Run custom tests hooks
  isRunCustomTestsLoading: boolean;
  customTestsError: unknown;
  customTestResults:
    | Array<{
        input?: unknown;
        expected?: unknown;
        actual?: unknown;
        error?: string;
        stdout?: string;
      }>
    | null
    | undefined;
  callRunCustomTests: (inputs: unknown[][]) => Promise<unknown>;
  // Generation status hooks
  completedSteps: GenerationStep[];
  currentStep: GenerationStep | null | undefined;
  isGenerating: boolean;
  isFailed: boolean;
  generationError: unknown;
  // Workflow status hooks
  workflowStatus: string | null | undefined;
  isWorkflowStatusLoading: boolean;
  isWorkflowActive: boolean;
  isWorkflowComplete: boolean;
  isWorkflowErrored: boolean;
  // Models hooks
  isModelsLoading: boolean;
  modelsError: unknown;
  models: Array<{ id: string; name: string }>;
  // Problem model
  problemModel: string | null | undefined;
  // Generate solution with model
  isGenerateSolutionWithModelLoading: boolean;
  callGenerateSolutionWithModel: (
    model: string,
    forceError: boolean,
    returnDummy: boolean,
    skipCache: boolean,
  ) => Promise<string | null>;
}

export default function AdminCollapsibles({
  problemId,
  user,
  selectedModel,
  setSelectedModel,
  setUserSolution,
  isProblemTextLoading,
  problemTextError,
  problemText,
  getProblemText,
  callGenerateProblemText,
  isTestCasesLoading,
  testCasesError,
  testCases,
  getTestCases,
  callGenerateTestCases,
  isTestCaseInputsLoading,
  testCaseInputCodeError,
  testCaseInputCode,
  getCodeToGenerateTestCaseInputs,
  callGenerateTestCaseInputCode,
  testCaseInputs,
  isGenerateSolutionLoading,
  solutionError,
  solution,
  getSolution,
  callGenerateSolution,
  testCaseOutputs,
  isRunUserSolutionLoading,
  userSolutionError,
  userSolutionTestResults,
  callRunUserSolution,
  isRunCustomTestsLoading,
  customTestsError,
  customTestResults,
  callRunCustomTests,
  completedSteps,
  currentStep,
  isGenerating,
  isFailed,
  generationError,
  workflowStatus,
  isWorkflowStatusLoading,
  isWorkflowActive,
  isWorkflowComplete,
  isWorkflowErrored,
  isModelsLoading,
  modelsError,
  models,
  problemModel,
  isGenerateSolutionWithModelLoading,
  callGenerateSolutionWithModel,
}: AdminCollapsiblesProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [lastValidStepIndex, setLastValidStepIndex] = useState<number>(-1);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [testCaseInputsOpen, setTestCaseInputsOpen] = useState<boolean>(true);
  const [testCaseOutputsOpen, setTestCaseOutputsOpen] = useState<boolean>(true);
  const [customTestCases, setCustomTestCases] = useState<
    Array<{ id: string; inputText: string }>
  >([{ id: `test-case-${Date.now()}`, inputText: "" }]);
  const hasInitializedCustomTestCases = useRef(false);
  const [isAdjustingDifficulty, setIsAdjustingDifficulty] = useState(false);
  const [isRegeneratingSimilar, setIsRegeneratingSimilar] = useState(false);

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
        // Initialize selected IDs from problem's current focus areas
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
      // Check if changed from original problem focus areas
      const originalIds = problemFocusAreas.map((fa) => fa.id).sort();
      const sortedNewIds = [...newIds].sort();
      const hasChanged =
        originalIds.length !== sortedNewIds.length ||
        originalIds.some((id, idx) => id !== sortedNewIds[idx]);
      setFocusAreasChanged(hasChanged);
    },
    [problemFocusAreas],
  );

  // Update lastValidStepIndex based on completed steps
  useEffect(() => {
    let highestIndex = -1;
    for (let i = 0; i < STEP_ORDER.length; i++) {
      const step = STEP_ORDER[i];
      if (step && completedSteps.includes(step)) {
        highestIndex = i;
      }
    }
    if (highestIndex > lastValidStepIndex) {
      setLastValidStepIndex(highestIndex);
    }
  }, [completedSteps, lastValidStepIndex]);

  // Reset initialization flag when problemId changes
  useEffect(() => {
    hasInitializedCustomTestCases.current = false;
    setCustomTestCases([{ id: `test-case-${Date.now()}`, inputText: "" }]);
  }, [problemId]);

  // Pre-populate custom test cases with sample test case inputs
  useEffect(() => {
    if (
      !hasInitializedCustomTestCases.current &&
      testCases &&
      testCaseInputs &&
      testCases.length > 0 &&
      testCaseInputs.length > 0 &&
      testCases.length === testCaseInputs.length
    ) {
      // Find sample test cases and their corresponding inputs
      const sampleTestCases = testCases
        .map((testCase, index) => ({
          testCase,
          input: testCaseInputs[index],
          index,
        }))
        .filter(({ testCase }) => testCase.isSampleCase === true);

      if (sampleTestCases.length > 0) {
        setCustomTestCases(
          sampleTestCases.map(({ input }, index) => ({
            id: `test-case-${Date.now()}-${index}`,
            inputText: JSON.stringify(input),
          })),
        );
        hasInitializedCustomTestCases.current = true;
      }
    }
  }, [testCases, testCaseInputs]);

  // Helper function to get step status
  const getStepStatus = (
    step: GenerationStep,
    isLoading: boolean,
    error: unknown,
    hasData: boolean,
  ): StepStatus => {
    if (error) return "error";
    if (isLoading) return "loading";
    if (isGenerating && currentStep && currentStep === step) return "pending";
    if (hasData || completedSteps.includes(step)) return "complete";
    return "not_started";
  };

  // Helper function to determine if step should be visible
  const shouldShowStep = (
    step: GenerationStep,
    stepIndex: number,
    isLoading: boolean,
    error: unknown,
    hasData: boolean,
  ): boolean => {
    const stepStatus = getStepStatus(step, isLoading, error, hasData);

    if (
      stepStatus === "complete" ||
      stepStatus === "error" ||
      stepStatus === "loading"
    ) {
      return true;
    }

    if (stepIndex === lastValidStepIndex + 1) {
      return true;
    }

    if (stepIndex > lastValidStepIndex + 1) {
      return false;
    }

    return false;
  };

  // Helper to invalidate subsequent steps when regenerating
  const invalidateSubsequentSteps = (stepIndex: number) => {
    const queryKeys: Record<GenerationStep, string[]> = {
      generateProblemText: ["problemText", problemId],
      parseFunctionSignature: ["functionSignatureSchema", problemId],
      generateTestCases: ["testCases", problemId],
      generateTestCaseInputCode: ["testCaseInputCode", problemId],
      generateSolution: ["solution", problemId],
    };

    for (let i = stepIndex + 1; i < STEP_ORDER.length; i++) {
      const step = STEP_ORDER[i];
      if (step) {
        queryClient.removeQueries({ queryKey: queryKeys[step] });
      }
    }
    if (stepIndex >= STEP_ORDER.indexOf("generateTestCaseInputCode")) {
      queryClient.removeQueries({ queryKey: ["testCaseInputs", problemId] });
    }
    if (stepIndex >= STEP_ORDER.indexOf("generateSolution")) {
      queryClient.removeQueries({ queryKey: ["testCaseOutputs", problemId] });
    }
    setLastValidStepIndex(stepIndex);
  };

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
        {generationError != null && overallStatus.type === "error" && (
          <div className="text-xs text-destructive">
            {typeof generationError === "string"
              ? generationError
              : String(generationError)}
          </div>
        )}
      </div>
    );
  };

  // Helper component to render step status indicator
  const StepStatusBadge = ({ status }: { status: StepStatus }) => {
    switch (status) {
      case "loading":
        return (
          <Badge variant="outline" className="gap-1">
            <Loader2Icon className="h-3 w-3 animate-spin" />
            Loading
          </Badge>
        );
      case "complete":
        return (
          <Badge variant="outline" className="gap-1 text-green-600">
            <CheckCircle2Icon className="h-3 w-3" />
            Complete
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircleIcon className="h-3 w-3" />
            Error
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="gap-1">
            <ClockIcon className="h-3 w-3" />
            Pending
          </Badge>
        );
      default:
        return null;
    }
  };

  // Helper component for step section
  const StepSection = ({
    step,
    stepIndex,
    title,
    isLoading,
    error,
    hasData,
    onGenerate,
    onGenerateWithError,
    onRefetch,
    requiresModel = false,
    children,
  }: {
    step: GenerationStep;
    stepIndex: number;
    title: string;
    isLoading: boolean;
    error: unknown;
    hasData: boolean;
    onGenerate: () => void;
    onGenerateWithError?: () => void;
    onRefetch: () => void;
    requiresModel?: boolean;
    children: React.ReactNode;
  }) => {
    const stepStatus = getStepStatus(step, isLoading, error, hasData);
    const isVisible = shouldShowStep(
      step,
      stepIndex,
      isLoading,
      error,
      hasData,
    );

    if (!isVisible) return null;

    const defaultOpen =
      stepStatus === "loading" ||
      stepStatus === "error" ||
      stepStatus === "pending";
    const isOpen =
      openSections[step] !== undefined ? openSections[step] : defaultOpen;

    const handleGenerate = () => {
      invalidateSubsequentSteps(stepIndex);
      onGenerate();
    };

    const handleGenerateWithError = () => {
      if (onGenerateWithError) {
        invalidateSubsequentSteps(stepIndex);
        onGenerateWithError();
      }
    };

    return (
      <Collapsible
        open={isOpen}
        onOpenChange={(open) => {
          setOpenSections((prev) => ({
            ...prev,
            [step]: open,
          }));
        }}
        className="border-b pb-4"
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between gap-2 w-full py-2 hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors">
            <div className="flex items-center gap-2">
              <ChevronDownIcon
                className={`h-4 w-4 transition-transform ${
                  isOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
              <h3 className="text-sm font-medium">{title}</h3>
              <StepStatusBadge status={stepStatus} />
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-2 pt-2">
          {(stepStatus === "complete" ||
            stepStatus === "error" ||
            !isGenerating ||
            isFailed) && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={requiresModel && !selectedModel}
              >
                {hasData ? "Re-generate" : "Generate"}
              </Button>
              {onGenerateWithError && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateWithError}
                  disabled={requiresModel && !selectedModel}
                >
                  {hasData ? "Re-generate" : "Generate"} (force error)
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onRefetch}>
                Re-fetch
              </Button>
            </div>
          )}

          {error != null && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>
                  {error instanceof Error
                    ? error.message
                    : typeof error === "string"
                      ? error
                      : "An error occurred"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                  className="ml-2"
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {stepStatus === "loading" && <Loader />}

          {stepStatus === "complete" && !isLoading && <>{children}</>}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="h-full overflow-auto p-4 flex flex-col gap-4">
      <div className="space-y-1">
        <div className="font-semibold">Problem: {problemId}</div>
        {problemModel && (
          <div className="text-sm text-muted-foreground">
            Generated by: {problemModel}
          </div>
        )}
      </div>

      <TopLevelStatusIndicator />

      {/* Focus Areas Section */}
      <Collapsible
        open={openSections["focusAreas"] ?? false}
        onOpenChange={(open) => {
          setOpenSections((prev) => ({
            ...prev,
            focusAreas: open,
          }));
        }}
        className="border rounded-lg p-3 bg-muted/50"
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-2">
              <ChevronDownIcon
                className={`h-4 w-4 transition-transform ${
                  openSections["focusAreas"] ? "rotate-0" : "-rotate-90"
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

      {workflowStatus && (
        <div className="space-y-1">
          <div className="text-sm font-medium">Workflow Status</div>
          <Badge
            variant={
              isWorkflowErrored
                ? "destructive"
                : isWorkflowComplete
                  ? "default"
                  : isWorkflowActive
                    ? "secondary"
                    : "outline"
            }
            className="flex items-center gap-1.5"
          >
            {isWorkflowStatusLoading ? (
              <>
                <Loader2Icon className="h-3 w-3 animate-spin" />
                Loading...
              </>
            ) : isWorkflowErrored ? (
              <>
                <XCircleIcon className="h-3 w-3" />
                {workflowStatus}
              </>
            ) : isWorkflowComplete ? (
              <>
                <CheckCircle2Icon className="h-3 w-3" />
                {workflowStatus}
              </>
            ) : isWorkflowActive ? (
              <>
                <Loader2Icon className="h-3 w-3 animate-spin" />
                {workflowStatus}
              </>
            ) : (
              <>
                <ClockIcon className="h-3 w-3" />
                {workflowStatus}
              </>
            )}
          </Badge>
        </div>
      )}

      <div className="space-y-4">
        <StepSection
          step="generateProblemText"
          stepIndex={0}
          title="Problem Text"
          isLoading={isProblemTextLoading}
          error={problemTextError}
          hasData={
            !!(problemText?.problemText && problemText?.functionSignature)
          }
          onGenerate={() =>
            callGenerateProblemText(selectedModel, false, true, false)
          }
          onGenerateWithError={() =>
            callGenerateProblemText(selectedModel, true, true, false)
          }
          onRefetch={getProblemText}
          requiresModel={true}
        >
          {problemText && (
            <>
              <MessageResponse>{problemText.problemText}</MessageResponse>
              <MessageResponse>
                {problemText.problemTextReworded}
              </MessageResponse>
            </>
          )}
        </StepSection>
        <StepSection
          step="generateTestCases"
          stepIndex={2}
          title="Test Case Descriptions"
          isLoading={isTestCasesLoading}
          error={testCasesError}
          hasData={!!testCases && testCases.length > 0}
          onGenerate={() =>
            callGenerateTestCases(selectedModel, false, true, false)
          }
          onGenerateWithError={() =>
            callGenerateTestCases(selectedModel, true, true, false)
          }
          onRefetch={getTestCases}
          requiresModel={true}
        >
          {testCases && (
            <div className="space-y-1">
              {testCases.map((testCase, i) => (
                <div key={`testcase-description-${i}`} className="text-sm">
                  {testCase.description}
                  {testCase.isSampleCase === true && (
                    <Badge variant="default" className="ml-2">
                      Sample
                    </Badge>
                  )}
                  {testCase.isEdgeCase && (
                    <Badge variant="outline" className="ml-2">
                      Edge Case
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </StepSection>
        <StepSection
          step="generateTestCaseInputCode"
          stepIndex={3}
          title="Test Case Input Code"
          isLoading={isTestCaseInputsLoading}
          error={testCaseInputCodeError}
          hasData={!!testCaseInputCode && testCaseInputCode.length > 0}
          onGenerate={() =>
            callGenerateTestCaseInputCode(selectedModel, false, true, false)
          }
          onGenerateWithError={() =>
            callGenerateTestCaseInputCode(selectedModel, true, true, false)
          }
          onRefetch={getCodeToGenerateTestCaseInputs}
          requiresModel={true}
        >
          {testCaseInputCode && (
            <div className="space-y-1">
              {testCaseInputCode.map((code, i) => (
                <div
                  key={`testcase-input-code-${i}`}
                  className="text-sm font-mono bg-muted p-2 rounded"
                >
                  {code}
                </div>
              ))}
            </div>
          )}
          {testCaseInputs && testCaseInputs.length > 0 && (
            <Collapsible
              open={testCaseInputsOpen}
              onOpenChange={setTestCaseInputsOpen}
              className="mt-4"
            >
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between gap-2 w-full py-2 hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors">
                  <div className="flex items-center gap-2">
                    <ChevronDownIcon
                      className={`h-4 w-4 transition-transform ${
                        testCaseInputsOpen ? "rotate-0" : "-rotate-90"
                      }`}
                    />
                    <h3 className="text-lg font-semibold">Test Case Inputs</h3>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 pt-2">
                {testCaseInputs.map((result, i) => (
                  <div
                    key={`testcase-input-${i}`}
                    className="text-sm font-mono bg-muted p-2 rounded"
                  >
                    {JSON.stringify(result, null, 2)}
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </StepSection>
        <StepSection
          step="generateSolution"
          stepIndex={4}
          title="Solution"
          isLoading={isGenerateSolutionLoading}
          error={solutionError}
          hasData={!!solution}
          onGenerate={() =>
            callGenerateSolution(selectedModel, true, true, false, false)
          }
          onGenerateWithError={() =>
            callGenerateSolution(selectedModel, true, true, true, false)
          }
          onRefetch={getSolution}
          requiresModel={true}
        >
          {solution && <MessageResponse>{solution}</MessageResponse>}
          {testCaseOutputs && testCaseOutputs.length > 0 && (
            <Collapsible
              open={testCaseOutputsOpen}
              onOpenChange={setTestCaseOutputsOpen}
              className="mt-4"
            >
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between gap-2 w-full py-2 hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors">
                  <div className="flex items-center gap-2">
                    <ChevronDownIcon
                      className={`h-4 w-4 transition-transform ${
                        testCaseOutputsOpen ? "rotate-0" : "-rotate-90"
                      }`}
                    />
                    <h3 className="text-lg font-semibold">Test Case Outputs</h3>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 pt-2">
                {testCaseOutputs.map((output, i) => (
                  <div
                    key={`testcase-output-${i}`}
                    className="text-sm font-mono bg-muted p-2 rounded"
                  >
                    {JSON.stringify(output, null, 2)}
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </StepSection>
      </div>
      <Collapsible
        open={openSections["runUserSolution"] ?? false}
        onOpenChange={(open) => {
          setOpenSections((prev) => ({
            ...prev,
            runUserSolution: open,
          }));
        }}
        className="border-b pb-4"
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between gap-2 w-full py-2 hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors">
            <div className="flex items-center gap-2">
              <ChevronDownIcon
                className={`h-4 w-4 transition-transform ${
                  openSections["runUserSolution"] ? "rotate-0" : "-rotate-90"
                }`}
              />
              <h3 className="text-sm font-medium">Run User Solution</h3>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await callRunUserSolution();
              } catch (error) {
                console.error("Failed to run user solution:", error);
              }
            }}
            disabled={isRunUserSolutionLoading}
          >
            {isRunUserSolutionLoading ? "Running..." : "Run User Solution"}
          </Button>
          {isRunUserSolutionLoading && (
            <div className="flex items-center gap-2">
              <Loader />
              <span className="text-sm text-muted-foreground">
                Running tests...
              </span>
            </div>
          )}
          {userSolutionError != null && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {userSolutionError instanceof Error
                  ? userSolutionError.message
                  : String(userSolutionError)}
              </AlertDescription>
            </Alert>
          )}
          {userSolutionTestResults && (
            <div className="space-y-2">
              {userSolutionTestResults.map((testResult, i) => (
                <div
                  key={`user-solution-test-result-${i}`}
                  className="border rounded-lg p-3 bg-muted/30"
                >
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    {testResult.testCase.description}
                    {testResult.testCase.isEdgeCase && (
                      <Badge variant="outline" className="ml-2">
                        Edge Case
                      </Badge>
                    )}
                  </div>
                  {testResult.error ? (
                    <Alert variant="destructive" className="py-2">
                      <AlertTitle className="text-xs">Error</AlertTitle>
                      <AlertDescription className="text-xs whitespace-pre-wrap">
                        {testResult.error}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div
                      className={`p-2 rounded text-xs font-mono ${
                        testResult.status === "pass"
                          ? "bg-green-500/20 border border-green-500/50"
                          : testResult.status === "fail"
                            ? "bg-yellow-500/20 border border-yellow-500/50"
                            : "bg-red-500/20 border border-red-500/50"
                      }`}
                    >
                      <div className="space-y-1">
                        <div>
                          <span className="text-muted-foreground">
                            Status:{" "}
                          </span>
                          <span className="font-semibold">
                            {testResult.status.toUpperCase()}
                          </span>
                        </div>
                        {testResult.expected !== null &&
                          testResult.expected !== undefined && (
                            <div>
                              <span className="text-muted-foreground">
                                Expected:{" "}
                              </span>
                              <span className="font-semibold">
                                {JSON.stringify(testResult.expected)}
                              </span>
                            </div>
                          )}
                        {testResult.actual !== null &&
                          testResult.actual !== undefined && (
                            <div>
                              <span className="text-muted-foreground">
                                Actual:{" "}
                              </span>
                              <span className="font-semibold">
                                {JSON.stringify(testResult.actual)}
                              </span>
                            </div>
                          )}
                        {testResult.stdout && (
                          <div className="mt-2 pt-2 border-t">
                            <span className="text-muted-foreground">
                              Stdout:{" "}
                            </span>
                            <pre className="text-xs mt-1 whitespace-pre-wrap">
                              {testResult.stdout}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      <Collapsible
        open={openSections["runCustomTests"] ?? false}
        onOpenChange={(open) => {
          setOpenSections((prev) => ({
            ...prev,
            runCustomTests: open,
          }));
        }}
        className="border-b pb-4"
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between gap-2 w-full py-2 hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors">
            <div className="flex items-center gap-2">
              <ChevronDownIcon
                className={`h-4 w-4 transition-transform ${
                  openSections["runCustomTests"] ? "rotate-0" : "-rotate-90"
                }`}
              />
              <h3 className="text-sm font-medium">Run with Custom Inputs</h3>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          <p className="text-xs text-muted-foreground">
            Enter custom test inputs.{" "}
            <span className="font-bold">
              Each test case should be a JSON array of function arguments.{" "}
            </span>
            <br />
            <br />
            For example, if the function signature is{" "}
            <code>function add(a: number, b: number): number</code>, the input
            should be <code>[1, 2]</code>.
          </p>

          <div className="space-y-3">
            {customTestCases.map((testCase, index) => {
              let validationError: string | null = null;

              if (testCase.inputText.trim()) {
                try {
                  const parsed = JSON.parse(testCase.inputText);
                  if (!Array.isArray(parsed)) {
                    validationError =
                      "Input must be a JSON array of function arguments.";
                  }
                } catch {
                  validationError =
                    "Invalid JSON. Please enter a valid JSON array.";
                }
              }

              const result =
                customTestResults && customTestResults[index]
                  ? customTestResults[index]
                  : null;

              return (
                <div
                  key={testCase.id}
                  className="space-y-2 border rounded-lg p-3 bg-muted/30 overflow-x-hidden"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          Test Case {index + 1}
                        </span>
                        {customTestCases.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              setCustomTestCases((prev) =>
                                prev.filter((tc) => tc.id !== testCase.id),
                              );
                            }}
                          >
                            <XIcon className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <Textarea
                        placeholder="[1, 2, 3]"
                        value={testCase.inputText}
                        onChange={(e) => {
                          setCustomTestCases((prev) =>
                            prev.map((tc) =>
                              tc.id === testCase.id
                                ? { ...tc, inputText: e.target.value }
                                : tc,
                            ),
                          );
                        }}
                        className="font-mono text-sm min-h-[60px] w-full max-w-full overflow-x-hidden break-words"
                      />
                      {validationError && (
                        <Alert variant="destructive" className="py-2">
                          <AlertDescription className="text-xs">
                            {validationError}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>

                  {result && (
                    <div className="mt-2 space-y-1 border-t pt-2">
                      <div className="text-xs font-medium mb-1">Result:</div>
                      <div className="space-y-1 text-xs font-mono">
                        {result.error ? (
                          <Alert variant="destructive" className="py-2">
                            <AlertTitle className="text-xs">Error</AlertTitle>
                            <AlertDescription className="text-xs whitespace-pre-wrap">
                              {result.error}
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <div
                            className={`p-2 rounded ${
                              JSON.stringify(result.actual) ===
                              JSON.stringify(result.expected)
                                ? "bg-green-500/20 border border-green-500/50"
                                : "bg-yellow-500/20 border border-yellow-500/50"
                            }`}
                          >
                            <div className="space-y-1">
                              {result.input !== null &&
                                result.input !== undefined && (
                                  <div>
                                    <span className="text-muted-foreground">
                                      Input:{" "}
                                    </span>
                                    <span className="font-semibold">
                                      {JSON.stringify(result.input)}
                                    </span>
                                  </div>
                                )}
                              {result.expected !== null &&
                                result.expected !== undefined && (
                                  <div>
                                    <span className="text-muted-foreground">
                                      Expected:{" "}
                                    </span>
                                    <span className="font-semibold">
                                      {JSON.stringify(result.expected)}
                                    </span>
                                  </div>
                                )}
                              {result.actual !== null &&
                                result.actual !== undefined && (
                                  <div>
                                    <span className="text-muted-foreground">
                                      Actual:{" "}
                                    </span>
                                    <span className="font-semibold">
                                      {JSON.stringify(result.actual)}
                                    </span>
                                  </div>
                                )}
                              {result.stdout && (
                                <div className="mt-2 pt-2 border-t">
                                  <span className="text-muted-foreground">
                                    Stdout:{" "}
                                  </span>
                                  <pre className="text-xs mt-1 whitespace-pre-wrap">
                                    {result.stdout}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (customTestCases.length < 10) {
                  setCustomTestCases((prev) => [
                    ...prev,
                    {
                      id: `test-case-${Date.now()}-${Math.random()}`,
                      inputText: "",
                    },
                  ]);
                }
              }}
              disabled={customTestCases.length >= 10}
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Test Case
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const validInputs: unknown[][] = [];
                  let hasError = false;

                  for (let i = 0; i < customTestCases.length; i++) {
                    const testCase = customTestCases[i];
                    if (!testCase || !testCase.inputText.trim()) {
                      hasError = true;
                      break;
                    }

                    try {
                      const parsed = JSON.parse(testCase.inputText);
                      if (!Array.isArray(parsed)) {
                        hasError = true;
                        break;
                      }
                      validInputs.push(parsed);
                    } catch {
                      hasError = true;
                      break;
                    }
                  }

                  if (hasError || validInputs.length === 0) {
                    return;
                  }

                  if (validInputs.length > 10) {
                    return;
                  }

                  await callRunCustomTests(validInputs);
                } catch (error) {
                  console.error("Failed to run custom tests:", error);
                }
              }}
              disabled={
                isRunCustomTestsLoading ||
                customTestCases.every((tc) => !tc.inputText.trim())
              }
            >
              {isRunCustomTestsLoading ? "Running..." : "Run All Tests"}
            </Button>
          </div>

          {isRunCustomTestsLoading && (
            <div className="flex items-center gap-2">
              <Loader />
              <span className="text-sm text-muted-foreground">
                Running custom tests...
              </span>
            </div>
          )}
          {customTestsError != null && !isRunCustomTestsLoading && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {customTestsError instanceof Error
                  ? customTestsError.message
                  : String(customTestsError)}
              </AlertDescription>
            </Alert>
          )}
        </CollapsibleContent>
      </Collapsible>

      <Collapsible
        open={openSections["generateSolutionWithModel"] ?? false}
        onOpenChange={(open) => {
          setOpenSections((prev) => ({
            ...prev,
            generateSolutionWithModel: open,
          }));
        }}
        className="border-b pb-4"
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between gap-2 w-full py-2 hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors">
            <div className="flex items-center gap-2">
              <ChevronDownIcon
                className={`h-4 w-4 transition-transform ${
                  openSections["generateSolutionWithModel"]
                    ? "rotate-0"
                    : "-rotate-90"
                }`}
              />
              <h3 className="text-sm font-medium">
                Generate Solution with Model
              </h3>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Model</label>
            {isModelsLoading ? (
              <div className="text-sm text-muted-foreground">
                Loading models...
              </div>
            ) : modelsError ? (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {modelsError instanceof Error
                    ? modelsError.message
                    : String(modelsError)}
                </AlertDescription>
              </Alert>
            ) : (
              <Select
                value={selectedModel}
                onValueChange={setSelectedModel}
                disabled={isGenerateSolutionWithModelLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.name}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!selectedModel) {
                  alert("Please select a model");
                  return;
                }
                try {
                  const generatedSolution = await callGenerateSolutionWithModel(
                    selectedModel,
                    false,
                    true,
                    false,
                  );
                  if (generatedSolution) {
                    setUserSolution(generatedSolution);
                  }
                } catch (error) {
                  console.error("Failed to generate solution:", error);
                }
              }}
              disabled={isGenerateSolutionWithModelLoading || !selectedModel}
            >
              {isGenerateSolutionWithModelLoading
                ? "Generating..."
                : "Generate Solution"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!selectedModel) {
                  alert("Please select a model");
                  return;
                }
                try {
                  const generatedSolution = await callGenerateSolutionWithModel(
                    selectedModel,
                    false,
                    true,
                    true,
                  );
                  if (generatedSolution) {
                    setUserSolution(generatedSolution);
                  }
                } catch (error) {
                  console.error("Failed to generate solution:", error);
                }
              }}
              disabled={isGenerateSolutionWithModelLoading || !selectedModel}
            >
              {isGenerateSolutionWithModelLoading
                ? "Generating..."
                : "Generate Solution (force error)"}
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
