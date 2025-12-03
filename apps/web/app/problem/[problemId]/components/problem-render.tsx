"use client";

import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
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
import { useRouter } from "next/navigation";
import { ClientFacingUserObject } from "@/lib/auth-types";
import { createProblem } from "@/actions/create-problem";
import { signOutAction } from "@/app/(auth)/signout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2Icon, PlayIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AdminCollapsibles from "./admin-collapsibles";
import NonAdminProblemView from "./non-admin-problem-view";
import CustomTestInputs from "./custom-test-inputs";

export default function ProblemRender({
  problemId,
  user,
  isAdmin,
}: {
  problemId: string;
  user: ClientFacingUserObject;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [userSolution, setUserSolution] = useState<string | null>(null);
  const [language, setLanguage] = useState<CodeGenLanguage>("typescript");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [isAdjustingDifficulty, setIsAdjustingDifficulty] = useState(false);
  const [isRegeneratingSimilar, setIsRegeneratingSimilar] = useState(false);
  const runCustomTestsRef = useRef<(() => Promise<void>) | null>(null);
  const [canRunCustomTests, setCanRunCustomTests] = useState(false);

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
    getData: getStarterCodeData,
  } = useStarterCode(problemId, language, user.apiKey);

  useEffect(() => {
    if (!problemText) getProblemText();
  }, [getProblemText, problemText]);

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
    user.apiKey
  );

  const {
    completedSteps,
    currentStep,
    isGenerating,
    isFailed,
    error: generationError,
  } = useGenerationStatus(problemId, user.apiKey);

  const {
    status: workflowStatus,
    isLoading: isWorkflowStatusLoading,
    isActive: isWorkflowActive,
    isComplete: isWorkflowComplete,
    isErrored: isWorkflowErrored,
  } = useWorkflowStatus(problemId, user.apiKey);

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

  // Refetch problemText when parseFunctionSignature completes to get updated functionSignatureSchema
  useEffect(() => {
    if (
      completedSteps.includes("parseFunctionSignature") &&
      (!problemText?.functionSignatureSchema ||
        problemText.functionSignatureSchema === null)
    ) {
      getProblemText();
    }
  }, [completedSteps, problemText?.functionSignatureSchema, getProblemText]);

  // Fetch starter code when parseFunctionSignature step completes and language changes
  useEffect(() => {
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
  }, [completedSteps, language, problemId, starterCode, getStarterCodeData]);

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

  const handleAdjustDifficulty = async (direction: "easier" | "harder") => {
    if (!selectedModel) return;
    setIsAdjustingDifficulty(true);
    try {
      const result = await createProblem(
        selectedModel,
        user.apiKey,
        true,
        undefined,
        { problemId, direction }
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
        { problemId, direction: "similar" }
      );
      router.push(`/problem/${result.problemId}`);
    } catch (error) {
      console.error("Failed to regenerate similar problem:", error);
    } finally {
      setIsRegeneratingSimilar(false);
    }
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAdjustDifficulty("easier")}
              disabled={
                isAdjustingDifficulty || isRegeneratingSimilar || !selectedModel
              }
            >
              {isAdjustingDifficulty ? "Creating..." : "Make Easier"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAdjustDifficulty("harder")}
              disabled={
                isAdjustingDifficulty || isRegeneratingSimilar || !selectedModel
              }
            >
              {isAdjustingDifficulty ? "Creating..." : "Make Harder"}
            </Button>
            {(isWorkflowErrored || isFailed) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerateSimilar}
                disabled={
                  isAdjustingDifficulty ||
                  isRegeneratingSimilar ||
                  !selectedModel
                }
              >
                {isRegeneratingSimilar ? "Creating..." : "Regenerate Similar"}
              </Button>
            )}
          </div>
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
              isRunUserSolutionLoading={isRunUserSolutionLoading}
              userSolutionError={userSolutionError}
              userSolutionTestResults={userSolutionTestResults}
              callRunUserSolution={callRunUserSolution}
              completedSteps={completedSteps}
              currentStep={currentStep}
              isGenerating={isGenerating}
              isFailed={isFailed}
              generationError={generationError}
            />
          )}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50} className="min-h-0 flex flex-col">
          <ResizablePanelGroup direction="vertical" className="flex-1">
            <ResizablePanel defaultSize={65} className="min-h-0 flex flex-col">
              <div className="flex items-center justify-between p-2 border-b flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Language:</span>
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
                    variant="default"
                    size="sm"
                    className="h-7"
                    onClick={async () => {
                      try {
                        await callRunUserSolution();
                      } catch (error) {
                        console.error("Failed to run user solution:", error);
                      }
                    }}
                    disabled={isRunUserSolutionLoading || !userSolution}
                  >
                    {isRunUserSolutionLoading ? (
                      <Loader2Icon className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <PlayIcon className="h-4 w-4 mr-1" />
                    )}
                    Run Solution
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="h-7"
                    onClick={async () => {
                      if (runCustomTestsRef.current) {
                        await runCustomTestsRef.current();
                      }
                    }}
                    disabled={isRunCustomTestsLoading || !canRunCustomTests}
                  >
                    {isRunCustomTestsLoading ? (
                      <Loader2Icon className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <PlayIcon className="h-4 w-4 mr-1" />
                    )}
                    Run
                  </Button>
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
            <ResizablePanel defaultSize={35} className="min-h-0">
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
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
