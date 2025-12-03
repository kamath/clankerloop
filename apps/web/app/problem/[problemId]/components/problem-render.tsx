"use client";

import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useEffect, useState, useRef } from "react";
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
  useWorkflowStatus,
  useModels,
  useProblemModel,
  useStarterCode,
  type CodeGenLanguage,
} from "@/hooks/use-problem";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ClientFacingUserObject } from "@/lib/auth-types";
import { signOutAction } from "@/app/(auth)/signout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2Icon, PlayIcon, SendIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AdminCollapsibles from "./admin-collapsibles";
import NonAdminProblemView from "./non-admin-problem-view";
import CustomTestInputs from "./custom-test-inputs";
import { FocusAreaSelector } from "@/components/focus-area-selector";
import { useRouter } from "next/navigation";
import { listFocusAreas } from "@/actions/list-focus-areas";
import { listModels } from "@/actions/list-models";
import { createProblem } from "@/actions/create-problem";
import type { FocusArea } from "@repo/api-types";

export default function ProblemRender({
  problemId,
  user,
  isAdmin,
}: {
  problemId: string | null;
  user: ClientFacingUserObject | null;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [userSolution, setUserSolution] = useState<string | null>(null);
  const [language, setLanguage] = useState<CodeGenLanguage>("typescript");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const runCustomTestsRef = useRef<(() => Promise<void>) | null>(null);
  const [canRunCustomTests, setCanRunCustomTests] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  // Empty state UI state
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([]);
  const [selectedFocusAreaIds, setSelectedFocusAreaIds] = useState<string[]>([]);
  const [isLoadingFocusAreas, setIsLoadingFocusAreas] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isCreatingProblem, setIsCreatingProblem] = useState(false);
  const [emptyStateModels, setEmptyStateModels] = useState<Array<{ id: string; name: string }>>([]);

  // Load focus areas and models for empty state
  useEffect(() => {
    if (!problemId && user) {
      setIsLoadingFocusAreas(true);
      setIsLoadingModels(true);
      listFocusAreas(user.apiKey)
        .then((areas) => {
          setFocusAreas(areas);
        })
        .catch((error) => {
          console.error("Failed to load focus areas:", error);
        })
        .finally(() => {
          setIsLoadingFocusAreas(false);
        });

      listModels(user.apiKey)
        .then((modelsList) => {
          if (modelsList && modelsList.length > 0) {
            setEmptyStateModels(modelsList);
            setSelectedModel(modelsList[0]?.name || "");
          }
        })
        .catch((error) => {
          console.error("Failed to load models:", error);
        })
        .finally(() => {
          setIsLoadingModels(false);
        });
    }
  }, [problemId, user]);

  // Handle create problem from empty state
  const handleCreateProblem = async () => {
    if (!user || !selectedModel) {
      router.push("/login");
      return;
    }

    setIsCreatingProblem(true);
    try {
      const { problemId: newProblemId } = await createProblem(
        selectedModel,
        user.apiKey,
        true, // autoGenerate
        false, // returnDummy
        undefined, // startFrom
        selectedFocusAreaIds.length > 0 ? selectedFocusAreaIds : undefined,
      );
      router.push(`/problem/${newProblemId}`);
    } catch (error) {
      console.error("Failed to create problem:", error);
      alert("Failed to create problem. Please try again.");
      setIsCreatingProblem(false);
    }
  };

  const {
    isLoading: isProblemTextLoading,
    error: problemTextError,
    data: problemText,
    getData: getProblemText,
    generateData: callGenerateProblemText,
  } = useProblemText(problemId, user?.apiKey);

  const {
    isLoading: isStarterCodeLoading,
    error: starterCodeError,
    data: starterCode,
    getData: getStarterCodeData,
  } = useStarterCode(problemId, language, user?.apiKey);

  useEffect(() => {
    if (problemId && user && !problemText) getProblemText();
  }, [getProblemText, problemText, problemId, user]);

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
  } = useTestCases(problemId, user?.apiKey);

  const {
    isLoading: isTestCaseInputsLoading,
    error: testCaseInputCodeError,
    data: testCaseInputCode,
    getData: getCodeToGenerateTestCaseInputs,
    generateData: callGenerateTestCaseInputCode,
  } = useTestCaseInputCode(problemId, user?.apiKey);

  const { data: testCaseInputs, getData: getTestCaseInputs } =
    useTestCaseInputs(problemId, user?.apiKey);

  const {
    isLoading: isGenerateSolutionLoading,
    error: solutionError,
    data: solution,
    getData: getSolution,
    generateData: callGenerateSolution,
  } = useSolution(problemId, user?.apiKey);

  const {
    isLoading: isGenerateSolutionWithModelLoading,
    generateData: callGenerateSolutionWithModel,
  } = useGenerateSolutionWithModel(problemId, user?.apiKey);

  const {
    isLoading: isModelsLoading,
    error: modelsError,
    models,
  } = useModels(user?.apiKey);

  const { model: problemModel } = useProblemModel(problemId, user?.apiKey);

  const { data: testCaseOutputs, getData: getTestCaseOutputs } =
    useTestCaseOutputs(problemId, user?.apiKey);

  const {
    isLoading: isRunUserSolutionLoading,
    error: userSolutionError,
    data: userSolutionTestResults,
    runData: callRunUserSolution,
  } = useRunUserSolution(problemId, userSolution, language, user?.apiKey);

  const {
    isLoading: isRunCustomTestsLoading,
    error: customTestsError,
    data: customTestResults,
    runData: callRunCustomTests,
  } = useRunUserSolutionWithCustomInputs(
    problemId,
    userSolution,
    language,
    user?.apiKey,
  );

  const {
    completedSteps,
    currentStep,
    isGenerating,
    isFailed,
    error: generationError,
  } = useGenerationStatus(problemId, user?.apiKey);

  const {
    status: workflowStatus,
    isLoading: isWorkflowStatusLoading,
    isActive: isWorkflowActive,
    isComplete: isWorkflowComplete,
    isErrored: isWorkflowErrored,
  } = useWorkflowStatus(problemId, user?.apiKey);

  // Set default model: use problem model if available, otherwise use first model from list
  useEffect(() => {
    if (!problemId || !user) return;
    if (problemModel && !selectedModel) {
      setSelectedModel(problemModel);
    } else if (models && models[0] && !selectedModel && !problemModel) {
      setSelectedModel(models[0].name);
    }
  }, [models, problemModel, selectedModel, problemId, user]);

  // Auto-fetch data as each step completes or while generation is in progress
  useEffect(() => {
    if (!problemId || !user) return;
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
  }, [completedSteps, problemText, isGenerating, getProblemText, problemId, user]);

  // Refetch problemText when parseFunctionSignature completes to get updated functionSignatureSchema
  useEffect(() => {
    if (!problemId || !user) return;
    if (
      completedSteps.includes("parseFunctionSignature") &&
      (!problemText?.functionSignatureSchema ||
        problemText.functionSignatureSchema === null)
    ) {
      getProblemText();
    }
  }, [completedSteps, problemText?.functionSignatureSchema, getProblemText, problemId, user]);

  // Fetch starter code when parseFunctionSignature step completes and language changes
  useEffect(() => {
    if (!problemId || !user) return;
    if (
      completedSteps.includes("parseFunctionSignature") &&
      problemId &&
      !starterCode
    ) {
      getStarterCodeData().catch((error) => {
        // Silently handle errors - they'll be shown via the query state
        console.error("Failed to fetch starter code:", error);
      });
    }
  }, [completedSteps, language, problemId, starterCode, getStarterCodeData, user]);

  useEffect(() => {
    if (!problemId || !user) return;
    if (completedSteps.includes("generateTestCases") && !testCases) {
      getTestCases();
    }
  }, [completedSteps, testCases, getTestCases, problemId, user]);

  useEffect(() => {
    if (!problemId || !user) return;
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
    problemId,
    user,
  ]);

  useEffect(() => {
    if (!problemId || !user) return;
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
    problemId,
    user,
  ]);

  // Render empty state when problemId is null
  if (!problemId) {
    return (
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-muted">
        <div className="w-full p-4 flex items-center justify-between gap-4 border-b border-border bg-card flex-shrink-0">
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
            </Link>
            {user && (
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
            )}
          </div>
          {user && (
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src={user.profilePictureUrl} />
                <AvatarFallback>{user.firstName.charAt(0)}</AvatarFallback>
              </Avatar>
            </div>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-2xl w-full space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Create a New Problem</h2>
              <p className="text-muted-foreground">
                {user
                  ? "Select focus areas and a model to generate a coding problem"
                  : "Sign in to create and solve coding problems"}
              </p>
            </div>
            {user ? (
              <div className="space-y-6 bg-card border border-border rounded-lg p-6">
                <div className="space-y-2">
                  <Label>Focus Areas</Label>
                  {isLoadingFocusAreas ? (
                    <div className="text-sm text-muted-foreground">
                      Loading focus areas...
                    </div>
                  ) : (
                    <>
                      <FocusAreaSelector
                        focusAreas={focusAreas}
                        selectedIds={selectedFocusAreaIds}
                        onChange={setSelectedFocusAreaIds}
                        disabled={isCreatingProblem}
                      />
                      <p className="text-sm text-muted-foreground">
                        Select specific focus areas or leave empty for a random
                        topic.
                      </p>
                    </>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Model</Label>
                  {isLoadingModels ? (
                    <div className="text-sm text-muted-foreground">
                      Loading models...
                    </div>
                  ) : emptyStateModels.length > 0 ? (
                    <Select
                      value={selectedModel}
                      onValueChange={setSelectedModel}
                      disabled={isCreatingProblem}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        {emptyStateModels.map((model) => (
                          <SelectItem key={model.id} value={model.name}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-sm text-destructive">
                      No models available. Please create a model first.
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleCreateProblem}
                  disabled={
                    isCreatingProblem ||
                    isLoadingModels ||
                    !selectedModel ||
                    emptyStateModels.length === 0
                  }
                  className="w-full"
                >
                  {isCreatingProblem ? (
                    <>
                      <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Problem"
                  )}
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <Link href="/login">
                  <Button size="lg">Sign In to Get Started</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render problem view when problemId exists
  if (!user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-muted">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Please sign in to view problems</h2>
          <Link href="/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-muted">
      <div className="w-full p-4 flex items-center justify-between gap-4 border-b border-border bg-card flex-shrink-0">
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
          {isAdmin ? (
            <AdminCollapsibles
              problemId={problemId}
              user={user}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              userSolution={userSolution}
              setUserSolution={setUserSolution}
              language={language}
              isProblemTextLoading={isProblemTextLoading}
              problemTextError={problemTextError}
              problemText={problemText}
              getProblemText={getProblemText}
              callGenerateProblemText={callGenerateProblemText}
              isTestCasesLoading={isTestCasesLoading}
              testCasesError={testCasesError}
              testCases={testCases}
              getTestCases={getTestCases}
              callGenerateTestCases={callGenerateTestCases}
              isTestCaseInputsLoading={isTestCaseInputsLoading}
              testCaseInputCodeError={testCaseInputCodeError}
              testCaseInputCode={testCaseInputCode}
              getCodeToGenerateTestCaseInputs={getCodeToGenerateTestCaseInputs}
              callGenerateTestCaseInputCode={callGenerateTestCaseInputCode}
              testCaseInputs={testCaseInputs}
              getTestCaseInputs={getTestCaseInputs}
              isGenerateSolutionLoading={isGenerateSolutionLoading}
              solutionError={solutionError}
              solution={solution}
              getSolution={getSolution}
              callGenerateSolution={callGenerateSolution}
              testCaseOutputs={testCaseOutputs}
              getTestCaseOutputs={getTestCaseOutputs}
              isRunUserSolutionLoading={isRunUserSolutionLoading}
              userSolutionError={userSolutionError}
              userSolutionTestResults={userSolutionTestResults}
              callRunUserSolution={callRunUserSolution}
              isRunCustomTestsLoading={isRunCustomTestsLoading}
              customTestsError={customTestsError}
              customTestResults={customTestResults}
              callRunCustomTests={callRunCustomTests}
              completedSteps={completedSteps}
              currentStep={currentStep}
              isGenerating={isGenerating}
              isFailed={isFailed}
              generationError={generationError}
              workflowStatus={workflowStatus}
              isWorkflowStatusLoading={isWorkflowStatusLoading}
              isWorkflowActive={isWorkflowActive}
              isWorkflowComplete={isWorkflowComplete}
              isWorkflowErrored={isWorkflowErrored}
              isModelsLoading={isModelsLoading}
              modelsError={modelsError}
              models={models}
              problemModel={problemModel}
              isGenerateSolutionWithModelLoading={
                isGenerateSolutionWithModelLoading
              }
              callGenerateSolutionWithModel={callGenerateSolutionWithModel}
            />
          ) : (
            <NonAdminProblemView
              problemText={problemText}
              testCases={testCases}
              testCaseInputs={testCaseInputs}
              testCaseOutputs={testCaseOutputs}
              completedSteps={completedSteps}
              currentStep={currentStep}
              isGenerating={isGenerating}
              isFailed={isFailed}
              generationError={generationError}
              problemId={problemId}
              user={user}
              selectedModel={selectedModel}
              isWorkflowErrored={isWorkflowErrored}
            />
          )}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50} className="min-h-0 flex flex-col">
          <ResizablePanelGroup direction="vertical" className="flex-1">
            <ResizablePanel defaultSize={50} className="min-h-0 flex flex-col">
              <div className="flex items-center justify-between p-2 border-b border-border bg-card flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Select
                    value={language}
                    onValueChange={(value: CodeGenLanguage) =>
                      setLanguage(value)
                    }
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 bg-secondary"
                    onClick={async () => {
                      if (runCustomTestsRef.current) {
                        await runCustomTestsRef.current();
                      }
                    }}
                    disabled={isRunCustomTestsLoading || !canRunCustomTests}
                    title="Run your solution on custom test cases"
                  >
                    {isRunCustomTestsLoading ? (
                      <Loader2Icon className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <PlayIcon className="h-4 w-4 mr-1" />
                    )}
                    Run
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="h-7"
                    onClick={() => setShowSubmitDialog(true)}
                    disabled={isRunUserSolutionLoading || !canRunCustomTests}
                    title="Submit your solution for evaluation on all test cases"
                  >
                    {isRunUserSolutionLoading ? (
                      <Loader2Icon className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <SendIcon className="h-4 w-4 mr-1" />
                    )}
                    Submit
                  </Button>
                  <AlertDialog
                    open={showSubmitDialog}
                    onOpenChange={setShowSubmitDialog}
                  >
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Submit Solution?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will run your solution against all test cases and
                          submit it for evaluation. Make sure you&apos;ve tested
                          your solution with custom test cases first.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            try {
                              await callRunUserSolution();
                              setShowSubmitDialog(false);
                            } catch (error) {
                              console.error(
                                "Failed to run user solution:",
                                error,
                              );
                              setShowSubmitDialog(false);
                            }
                          }}
                        >
                          Submit
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} className="min-h-0">
              <CustomTestInputs
                problemId={problemId}
                testCases={testCases}
                testCaseInputs={testCaseInputs}
                isRunCustomTestsLoading={isRunCustomTestsLoading}
                customTestsError={customTestsError}
                customTestResults={customTestResults}
                callRunCustomTests={callRunCustomTests}
                onRunTestsRef={runCustomTestsRef}
                onCanRunTestsChange={setCanRunCustomTests}
                userSolutionTestResults={userSolutionTestResults}
                isRunUserSolutionLoading={isRunUserSolutionLoading}
                userSolutionError={userSolutionError}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
