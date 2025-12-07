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
  useRunUserSolution,
  useRunUserSolutionWithCustomInputs,
  useGenerationStatus,
  useModels,
  useProblemModel,
  useStarterCode,
  type CodeGenLanguage,
} from "@/hooks/use-problem";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ClientFacingUserObject } from "@/lib/auth-types";
import { signOutAction } from "@/app/(auth)/signout";
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
import NonAdminProblemView from "./non-admin-problem-view";
import CustomTestInputs from "./custom-test-inputs";
import { IssueReportDialog } from "./issue-report-dialog";

export default function ProblemRender({
  problemId,
  user,
}: {
  problemId: string;
  user: ClientFacingUserObject;
}) {
  const [userSolution, setUserSolution] = useState<string | null>(null);
  const [language, setLanguage] = useState<CodeGenLanguage>("typescript");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const runCustomTestsRef = useRef<(() => Promise<void>) | null>(null);
  const [canRunCustomTests, setCanRunCustomTests] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  const { data: problemText, getData: getProblemText } = useProblemText(
    problemId,
    user.apiKey
  );

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

  const { data: testCases, getData: getTestCases } = useTestCases(
    problemId,
    user.apiKey
  );

  const { data: testCaseInputCode, getData: getCodeToGenerateTestCaseInputs } =
    useTestCaseInputCode(problemId, user.apiKey);

  const { data: testCaseInputs, getData: getTestCaseInputs } =
    useTestCaseInputs(problemId, user.apiKey);

  const { data: models } = useModels(user.apiKey);

  const { model: problemModel } = useProblemModel(problemId, user.apiKey);

  const { isLoading: isRunUserSolutionLoading, runData: callRunUserSolution } =
    useRunUserSolution(problemId, userSolution, language, user.apiKey);

  const { isLoading: isRunCustomTestsLoading } =
    useRunUserSolutionWithCustomInputs(
      problemId,
      userSolution,
      language,
      user.apiKey
    );

  const { completedSteps, isGenerating } = useGenerationStatus(
    problemId,
    user.apiKey
  );

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
    // Fetch test case inputs when input code step completes (they're generated together)
    // Non-admin users also need this for sample test cases
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

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-muted">
      <div className="w-full p-4 flex items-center justify-between gap-4 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/">
            <h1
              className="text-xl font-bold hover:cursor-pointer"
              style={{ fontFamily: "var(--font-comic-relief)" }}
            >
              ClankerLoop
            </h1>
          </Link>
          <p>&middot;</p>
          <div className="font-comic-relief">
            hi {user.firstName.toLowerCase()}{" "}
            <form
              action={async () => {
                await signOutAction();
              }}
              className="inline"
            >
              <button
                type="submit"
                className="text-blue-500 hover:underline hover:cursor-pointer"
              >
                (sign out)
              </button>
            </form>
          </div>
          <IssueReportDialog />
        </div>
      </div>
      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1 w-full min-h-0"
      >
        <ResizablePanel defaultSize={20} className="min-h-0">
          <NonAdminProblemView
            problemId={problemId}
            user={user}
            selectedModel={selectedModel}
          />
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
                                error
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
                onRunTestsRef={runCustomTestsRef}
                onCanRunTestsChange={setCanRunCustomTests}
                userSolution={userSolution}
                language={language}
                user={user}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
