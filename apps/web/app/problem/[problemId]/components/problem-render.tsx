"use client";

import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect, useState } from "react";
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
  useTestCaseOutputs,
  useRunUserSolution,
} from "@/hooks/use-problem";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ClientFacingUserObject } from "@/lib/auth-types";
import { signOutAction } from "@/app/(auth)/signout";

function getStartingCode(language: string, functionSignature: string) {
  if (language === "typescript") {
    return `function runSolution${functionSignature} {\n\treturn;\n}`;
  }
  throw new Error(`Unsupported language: ${language}`);
}

export default function ProblemRender({
  problemId,
  user,
}: {
  problemId: string;
  user: ClientFacingUserObject;
}) {
  const [userSolution, setUserSolution] = useState<string | null>(null);
  const [language, _setLanguage] = useState<string>("typescript");

  const {
    isLoading: isProblemTextLoading,
    error: problemTextError,
    data: problemText,
    getData: getProblemText,
    generateData: callGenerateProblemText,
  } = useProblemText(problemId, user.apiKey);

  useEffect(() => {
    if (!problemText) getProblemText();
  }, [getProblemText, problemText]);

  useEffect(() => {
    if (problemText) {
      setUserSolution(getStartingCode(language, problemText.functionSignature));
    }
  }, [problemText, language]);

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

  const {
    isLoading: isGenerateTestCaseInputsLoading,
    error: testCaseInputsError,
    data: testCaseInputs,
    getData: getTestCaseInputs,
    generateData: callGenerateTestCaseInputs,
  } = useTestCaseInputs(problemId, user.apiKey);

  const {
    isLoading: isGenerateSolutionLoading,
    error: solutionError,
    data: solution,
    getData: getSolution,
    generateData: callGenerateSolution,
  } = useSolution(problemId, user.apiKey);

  const {
    isLoading: isGenerateTestCaseOutputsLoading,
    error: testCaseOutputsError,
    data: testCaseOutputs,
    getData: getTestCaseOutputs,
    generateData: callGenerateTestCaseOutputs,
  } = useTestCaseOutputs(problemId, user.apiKey);

  const {
    isLoading: isRunUserSolutionLoading,
    error: userSolutionError,
    data: userSolutionTestResults,
    runData: callRunUserSolution,
  } = useRunUserSolution(problemId, userSolution, user.apiKey);

  useEffect(() => {
    if (solution) {
      setUserSolution(solution);
    }
  }, [solution]);

  return (
    <div className="h-screen w-screen">
      <div className="w-full p-4 flex items-center gap-4 border-b">
        <h1
          className="text-xl font-bold"
          style={{ fontFamily: "var(--font-comic-relief)" }}
        >
          ClankerRank
        </h1>
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
      <ResizablePanelGroup direction="horizontal" className="h-full w-full">
        <ResizablePanel defaultSize={20} className="h-full">
          <div className="h-full overflow-auto p-4 flex flex-col gap-4">
            <div>Problem: {problemId}</div>
            <div>User: {JSON.stringify(user)}</div>
            <div>
              {!problemText && (
                <>
                  <Button
                    variant={"outline"}
                    onClick={() => callGenerateProblemText()}
                  >
                    Generate Problem Text
                  </Button>
                  <Button variant={"outline"} onClick={() => getProblemText()}>
                    Get Problem Text
                  </Button>
                </>
              )}
              {isProblemTextLoading ? (
                <Loader />
              ) : (
                <>
                  {problemTextError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>
                        {problemTextError instanceof Error
                          ? problemTextError.message
                          : String(problemTextError)}
                      </AlertDescription>
                    </Alert>
                  )}
                  {problemText && (
                    <>
                      <MessageResponse>
                        {problemText.problemText}
                      </MessageResponse>
                    </>
                  )}
                </>
              )}
            </div>
            <div>
              <Button
                variant={"outline"}
                onClick={() => callGenerateTestCases()}
              >
                Generate Test Case Descriptions
              </Button>
              <Button variant={"outline"} onClick={() => getTestCases()}>
                Get Test Case Descriptions
              </Button>
              {isTestCasesLoading ? (
                <Loader />
              ) : (
                <>
                  {testCasesError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>
                        {testCasesError instanceof Error
                          ? testCasesError.message
                          : String(testCasesError)}
                      </AlertDescription>
                    </Alert>
                  )}
                  {testCases && (
                    <div>
                      {testCases.map((testCase, i) => (
                        <div key={`testcase-description-${i}`}>
                          {testCase.description}
                          {testCase.isEdgeCase ? " [Edge Case]" : ""}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div>
              <Button
                variant={"outline"}
                onClick={() => callGenerateTestCaseInputCode()}
              >
                Generate Test Case Inputs
              </Button>
              <Button
                variant={"outline"}
                onClick={() => getCodeToGenerateTestCaseInputs()}
              >
                Get Test Case Inputs
              </Button>
              {isTestCaseInputsLoading ? (
                <Loader />
              ) : (
                <>
                  {testCaseInputCodeError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>
                        {testCaseInputCodeError instanceof Error
                          ? testCaseInputCodeError.message
                          : String(testCaseInputCodeError)}
                      </AlertDescription>
                    </Alert>
                  )}
                  {testCaseInputCode && (
                    <div>
                      {testCaseInputCode.map((testCaseInput, i) => (
                        <div key={`testcase-input-${i}`}>{testCaseInput}</div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div>
              <Button
                variant={"outline"}
                onClick={() => callGenerateTestCaseInputs()}
              >
                Run Generate Input
              </Button>
              <Button variant={"outline"} onClick={() => getTestCaseInputs()}>
                Get Test Case Inputs
              </Button>
              {isGenerateTestCaseInputsLoading ? (
                <Loader />
              ) : (
                <>
                  {testCaseInputsError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>
                        {testCaseInputsError instanceof Error
                          ? testCaseInputsError.message
                          : String(testCaseInputsError)}
                      </AlertDescription>
                    </Alert>
                  )}
                  {testCaseInputs && (
                    <div>
                      {testCaseInputs.map((result, i) => (
                        <div key={`run-generate-input-result-${i}`}>
                          {JSON.stringify(result)}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div>
              <Button
                variant={"outline"}
                onClick={() => callGenerateSolution()}
              >
                Generate Solution
              </Button>
              <Button variant={"outline"} onClick={() => getSolution()}>
                Get Solution
              </Button>
              {isGenerateSolutionLoading ? (
                <Loader />
              ) : (
                <>
                  {solutionError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>
                        {solutionError instanceof Error
                          ? solutionError.message
                          : String(solutionError)}
                      </AlertDescription>
                    </Alert>
                  )}
                  {solution && <MessageResponse>{solution}</MessageResponse>}
                </>
              )}
            </div>
            <div>
              <Button
                variant={"outline"}
                onClick={() => callGenerateTestCaseOutputs()}
              >
                Generate Test Case Outputs
              </Button>
              <Button variant={"outline"} onClick={() => getTestCaseOutputs()}>
                Get Test Case Outputs
              </Button>
              {isGenerateTestCaseOutputsLoading ? (
                <Loader />
              ) : (
                <>
                  {testCaseOutputsError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>
                        {testCaseOutputsError instanceof Error
                          ? testCaseOutputsError.message
                          : String(testCaseOutputsError)}
                      </AlertDescription>
                    </Alert>
                  )}
                  {testCaseOutputs && (
                    <div>
                      {testCaseOutputs.map((output, i) => (
                        <div key={`testcase-output-${i}`}>
                          {JSON.stringify(output)}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div>
              <Button variant={"outline"} onClick={() => callRunUserSolution()}>
                Run User Solution
              </Button>
            </div>
            {isRunUserSolutionLoading ? (
              <Loader />
            ) : (
              <>
                {userSolutionError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      {userSolutionError instanceof Error
                        ? userSolutionError.message
                        : String(userSolutionError)}
                    </AlertDescription>
                  </Alert>
                )}
                {userSolutionTestResults && (
                  <div>
                    {userSolutionTestResults.map((testResult, i) => (
                      <div key={`user-solution-test-result-${i}`}>
                        {JSON.stringify({
                          testCase: testResult.testCase.description,
                          status: testResult.status,
                          actual: testResult.actual,
                          error: testResult.error,
                          expected: testResult.testCase.expected,
                          stdout: testResult.stdout,
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50} className="py-4">
          {userSolution ? (
            <Editor
              height="100%"
              width="100%"
              //   theme="vs-dark"
              defaultLanguage={language}
              value={userSolution ?? ""}
              onChange={(value) => setUserSolution(value ?? null)}
              options={{
                fontSize: 14,
                minimap: {
                  enabled: false,
                },
              }}
              loading={<Skeleton className="h-full w-full" />}
            />
          ) : (
            <Skeleton className="h-full w-full" />
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
