"use client";

import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect, useState, useMemo } from "react";
import { MessageResponse } from "@/components/ai-elements/message";
import Loader from "@/components/client/loader";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  useProblemText,
  useTestCases,
  useTestCaseInputCode,
  useTestCaseInputs,
  useSolution,
  useGenerateSolutionWithModel,
  useTestCaseOutputs,
  useRunUserSolution,
  useRunUserSolutionWithCustomInputs,
  useGenerationStatus,
  useModels,
  useProblemModel,
  useStarterCode,
  type CodeGenLanguage,
} from "@/hooks/use-problem";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ClientFacingUserObject } from "@/lib/auth-types";
import { signOutAction } from "@/app/(auth)/signout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { getStarterCode } from "@/actions/get-starter-code";
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

type StepStatus = "loading" | "complete" | "error" | "pending" | "not_started";

export default function ProblemRender({
  problemId,
  user,
}: {
  problemId: string;
  user: ClientFacingUserObject;
}) {
  const queryClient = useQueryClient();
  const [userSolution, setUserSolution] = useState<string | null>(null);
  const [language, setLanguage] = useState<CodeGenLanguage>("typescript");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [lastValidStepIndex, setLastValidStepIndex] = useState<number>(-1);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [testCaseInputsOpen, setTestCaseInputsOpen] = useState<boolean>(true);
  const [testCaseOutputsOpen, setTestCaseOutputsOpen] = useState<boolean>(true);
  const [customTestCases, setCustomTestCases] = useState<
    Array<{ id: string; inputText: string }>
  >([{ id: `test-case-${Date.now()}`, inputText: "" }]);

  const {
    isLoading: isProblemTextLoading,
    error: problemTextError,
    data: problemText,
    getData: getProblemText,
    generateData: callGenerateProblemText,
  } = useProblemText(problemId, user.apiKey);

  const {
    isLoading: isStarterCodeLoading,
    error: starterCodeError,
    data: starterCode,
  } = useStarterCode(problemId, language, user.apiKey);

  useEffect(() => {
    if (!problemText) getProblemText();
  }, [getProblemText, problemText]);

  // Fetch starter code when problem text is available and language changes
  useEffect(() => {
    if (problemText?.functionSignatureSchema && problemId) {
      queryClient
        .fetchQuery({
          queryKey: ["starterCode", problemId, language],
          queryFn: () => getStarterCode(problemId, language, user.apiKey),
          staleTime: Infinity,
        })
        .catch((error) => {
          // Silently handle errors - they'll be shown via the query state
          console.error("Failed to fetch starter code:", error);
        });
    }
  }, [
    problemText?.functionSignatureSchema,
    language,
    problemId,
    queryClient,
    user.apiKey,
  ]);

  // Set user solution when starter code is fetched
  useEffect(() => {
    if (starterCode?.starterCode) {
      setUserSolution(starterCode.starterCode);
    }
  }, [starterCode]);

  const {
    isLoading: isTestCasesLoading,
    error: testCasesError,
    data: testCases,
    getData: getTestCases,
    generateData: callGenerateTestCases,
  } = useTestCases(problemId, user.apiKey);

  const {
    isLoading: isTestCaseInputsLoading,
    error: testCaseInputCodeError,
    data: testCaseInputCode,
    getData: getCodeToGenerateTestCaseInputs,
    generateData: callGenerateTestCaseInputCode,
  } = useTestCaseInputCode(problemId, user.apiKey);

  const { data: testCaseInputs, getData: getTestCaseInputs } =
    useTestCaseInputs(problemId, user.apiKey);

  const {
    isLoading: isGenerateSolutionLoading,
    error: solutionError,
    data: solution,
    getData: getSolution,
    generateData: callGenerateSolution,
  } = useSolution(problemId, user.apiKey);

  const {
    isLoading: isGenerateSolutionWithModelLoading,
    generateData: callGenerateSolutionWithModel,
  } = useGenerateSolutionWithModel(problemId, user.apiKey);

  const {
    isLoading: isModelsLoading,
    error: modelsError,
    models,
  } = useModels(user.apiKey);

  const { model: problemModel } = useProblemModel(problemId, user.apiKey);

  const { data: testCaseOutputs, getData: getTestCaseOutputs } =
    useTestCaseOutputs(problemId, user.apiKey);

  const {
    isLoading: isRunUserSolutionLoading,
    error: userSolutionError,
    data: userSolutionTestResults,
    runData: callRunUserSolution,
  } = useRunUserSolution(problemId, userSolution, language, user.apiKey);

  const {
    isLoading: isRunCustomTestsLoading,
    error: customTestsError,
    data: customTestResults,
    runData: callRunCustomTests,
  } = useRunUserSolutionWithCustomInputs(
    problemId,
    userSolution,
    language,
    user.apiKey,
  );

  const {
    completedSteps,
    currentStep,
    isGenerating,
    isFailed,
    error: generationError,
  } = useGenerationStatus(problemId, user.apiKey);

  // Helper function to get step status
  const getStepStatus = (
    step: GenerationStep,
    isLoading: boolean,
    error: unknown,
    hasData: boolean,
  ): StepStatus => {
    if (error) return "error";
    // Prioritize "loading" when data is actively being fetched
    // This ensures loading indicators show correctly during data fetching
    if (isLoading) return "loading";
    // If step is currently being generated but not actively fetching, show "pending"
    // This prevents oscillation between pending and loading during polling
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

    // Always show if complete, error, or loading
    if (
      stepStatus === "complete" ||
      stepStatus === "error" ||
      stepStatus === "loading"
    ) {
      return true;
    }

    // Show if it's the immediate next step after lastValidStepIndex
    if (stepIndex === lastValidStepIndex + 1) {
      return true;
    }

    // Don't show future steps
    if (stepIndex > lastValidStepIndex + 1) {
      return false;
    }

    return false;
  };

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
    // Also invalidate related queries that are generated together
    if (stepIndex >= STEP_ORDER.indexOf("generateTestCaseInputCode")) {
      queryClient.removeQueries({ queryKey: ["testCaseInputs", problemId] });
    }
    if (stepIndex >= STEP_ORDER.indexOf("generateSolution")) {
      queryClient.removeQueries({ queryKey: ["testCaseOutputs", problemId] });
    }
    setLastValidStepIndex(stepIndex);
  };

  // Set default model: use problem model if available, otherwise use first model from list
  useEffect(() => {
    if (problemModel && !selectedModel) {
      setSelectedModel(problemModel);
    } else if (models && models[0] && !selectedModel && !problemModel) {
      setSelectedModel(models[0].name);
    }
  }, [models, problemModel, selectedModel]);

  // Auto-fetch data as each step completes or while generation is in progress
  useEffect(() => {
    const hasProblemText =
      problemText?.problemText && problemText?.functionSignature;
    const isGeneratingProblemText =
      isGenerating && !completedSteps.includes("generateProblemText");

    if (completedSteps.includes("generateProblemText") && !hasProblemText) {
      getProblemText();
    } else if (isGeneratingProblemText && !hasProblemText) {
      // Poll while generation is in progress
      const interval = setInterval(() => {
        getProblemText();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [completedSteps, problemText, isGenerating, getProblemText]);

  useEffect(() => {
    if (completedSteps.includes("generateTestCases") && !testCases) {
      getTestCases();
    }
  }, [completedSteps, testCases, getTestCases]);

  useEffect(() => {
    if (
      completedSteps.includes("generateTestCaseInputCode") &&
      !testCaseInputCode
    ) {
      getCodeToGenerateTestCaseInputs();
    }
    // Also fetch test case inputs when input code step completes (they're generated together)
    if (
      completedSteps.includes("generateTestCaseInputCode") &&
      !testCaseInputs
    ) {
      getTestCaseInputs();
    }
  }, [
    completedSteps,
    testCaseInputCode,
    testCaseInputs,
    getCodeToGenerateTestCaseInputs,
    getTestCaseInputs,
  ]);

  useEffect(() => {
    if (completedSteps.includes("generateSolution") && !solution) {
      getSolution();
    }
    // Also fetch test case outputs when solution step completes (they're generated together)
    if (completedSteps.includes("generateSolution") && !testCaseOutputs) {
      getTestCaseOutputs();
    }
  }, [
    completedSteps,
    solution,
    testCaseOutputs,
    getSolution,
    getTestCaseOutputs,
  ]);

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
        {generationError && overallStatus.type === "error" && (
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

    // Determine default open state: open if loading, error, or pending; closed if complete
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
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <div className="w-full p-4 flex items-center justify-between gap-4 border-b flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/">
            <h1
              className="text-xl font-bold hover:cursor-pointer"
              style={{ fontFamily: "var(--font-comic-relief)" }}
            >
              ClankerRank
            </h1>
          </Link>
          <Link href="/">
            <Button variant={"outline"} className="hover:cursor-pointer">
              Problems
            </Button>
          </Link>{" "}
          <form
            action={async () => {
              await signOutAction();
            }}
          >
            <Button
              variant={"outline"}
              className="hover:cursor-pointer"
              type="submit"
            >
              Sign out
            </Button>
          </form>
        </div>
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarImage src={user.profilePictureUrl} />
            <AvatarFallback>{user.firstName.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>
      </div>
      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1 w-full min-h-0"
      >
        <ResizablePanel defaultSize={20} className="min-h-0">
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

            {generationError && (
              <Alert variant="destructive">
                <AlertTitle>Generation Error</AlertTitle>
                <AlertDescription>{generationError}</AlertDescription>
              </Alert>
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
                      <div
                        key={`testcase-description-${i}`}
                        className="text-sm"
                      >
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
                  callGenerateTestCaseInputCode(
                    selectedModel,
                    false,
                    true,
                    false,
                  )
                }
                onGenerateWithError={() =>
                  callGenerateTestCaseInputCode(
                    selectedModel,
                    true,
                    true,
                    false,
                  )
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
                {/* Test Case Inputs are now automatically generated with Input Code, shown below */}
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
                          <h3 className="text-lg font-semibold">
                            Test Case Inputs
                          </h3>
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
                  callGenerateSolution(
                    selectedModel,
                    undefined,
                    true,
                    false,
                    false,
                  )
                }
                onGenerateWithError={() =>
                  callGenerateSolution(
                    selectedModel,
                    undefined,
                    true,
                    true,
                    false,
                  )
                }
                onRefetch={getSolution}
                requiresModel={true}
              >
                {solution && <MessageResponse>{solution}</MessageResponse>}
                {/* Test Case Outputs are now automatically generated with Solution, shown below */}
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
                          <h3 className="text-lg font-semibold">
                            Test Case Outputs
                          </h3>
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
                        openSections["runUserSolution"]
                          ? "rotate-0"
                          : "-rotate-90"
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
                  {isRunUserSolutionLoading
                    ? "Running..."
                    : "Run User Solution"}
                </Button>
                {isRunUserSolutionLoading && (
                  <div className="flex items-center gap-2">
                    <Loader />
                    <span className="text-sm text-muted-foreground">
                      Running tests...
                    </span>
                  </div>
                )}
                {userSolutionError && (
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
                              {testResult.expected !== null && (
                                <div>
                                  <span className="text-muted-foreground">
                                    Expected:{" "}
                                  </span>
                                  <span className="font-semibold">
                                    {JSON.stringify(testResult.expected)}
                                  </span>
                                </div>
                              )}
                              {testResult.actual !== null && (
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
                        openSections["runCustomTests"]
                          ? "rotate-0"
                          : "-rotate-90"
                      }`}
                    />
                    <h3 className="text-sm font-medium">
                      Run with Custom Inputs
                    </h3>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                <p className="text-xs text-muted-foreground">
                  Enter custom test inputs. Each test case should be a JSON
                  array of function arguments.
                </p>
                {testCaseInputs && testCaseInputs.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Example format based on existing test case:{" "}
                    <code className="bg-muted px-1 rounded">
                      {JSON.stringify(testCaseInputs[0])}
                    </code>
                  </p>
                )}

                <div className="space-y-3">
                  {customTestCases.map((testCase, index) => {
                    // Parse and validate this test case's input
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

                    // Get result for this test case (by index)
                    const result =
                      customTestResults && customTestResults[index]
                        ? customTestResults[index]
                        : null;

                    return (
                      <div
                        key={testCase.id}
                        className="space-y-2 border rounded-lg p-3 bg-muted/30"
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 space-y-2">
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
                                      prev.filter(
                                        (tc) => tc.id !== testCase.id,
                                      ),
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
                              className="font-mono text-sm min-h-[60px]"
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

                        {/* Result Display */}
                        {result && (
                          <div className="mt-2 space-y-1 border-t pt-2">
                            <div className="text-xs font-medium mb-1">
                              Result:
                            </div>
                            <div className="space-y-1 text-xs font-mono">
                              {result.error ? (
                                <Alert variant="destructive" className="py-2">
                                  <AlertTitle className="text-xs">
                                    Error
                                  </AlertTitle>
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
                                    <div>
                                      <span className="text-muted-foreground">
                                        Input:{" "}
                                      </span>
                                      <span className="font-semibold">
                                        {JSON.stringify(result.input)}
                                      </span>
                                    </div>
                                    {result.expected !== null && (
                                      <div>
                                        <span className="text-muted-foreground">
                                          Expected:{" "}
                                        </span>
                                        <span className="font-semibold">
                                          {JSON.stringify(result.expected)}
                                        </span>
                                      </div>
                                    )}
                                    {result.actual !== null && (
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
                        // Validate all test cases
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
                {customTestsError && !isRunCustomTestsLoading && (
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
                        const generatedSolution =
                          await callGenerateSolutionWithModel(
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
                    disabled={
                      isGenerateSolutionWithModelLoading || !selectedModel
                    }
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
                        const generatedSolution =
                          await callGenerateSolutionWithModel(
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
                    disabled={
                      isGenerateSolutionWithModelLoading || !selectedModel
                    }
                  >
                    {isGenerateSolutionWithModelLoading
                      ? "Generating..."
                      : "Generate Solution (force error)"}
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50} className="min-h-0 flex flex-col">
          <div className="flex items-center justify-between p-2 border-b flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Language:</span>
              <Select
                value={language}
                onValueChange={(value: CodeGenLanguage) => setLanguage(value)}
                disabled={isStarterCodeLoading}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="typescript">TypeScript</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                </SelectContent>
              </Select>
              {isStarterCodeLoading && (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              )}
            </div>
            {starterCodeError && (
              <span className="text-xs text-destructive">
                Failed to load starter code
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0">
            {userSolution ? (
              <Editor
                height="100%"
                width="100%"
                defaultLanguage={language}
                language={language}
                value={userSolution ?? ""}
                onChange={(value) => setUserSolution(value ?? null)}
                options={{
                  fontSize: 14,
                  minimap: {
                    enabled: false,
                  },
                  readOnly: !!(
                    isStarterCodeLoading ||
                    (problemText?.functionSignatureSchema && !starterCode)
                  ),
                }}
                loading={<Skeleton className="h-full w-full" />}
              />
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
