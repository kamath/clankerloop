"use client";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect, useState } from "react";
import { MessageResponse } from "@/components/ai-elements/message";
import Loader from "@/components/client/loader";
import {
  useProblemText,
  useTestCases,
  useTestCaseInputCode,
  useTestCaseInputs,
  useSolution,
  useTestCaseOutputs,
  useRunUserSolution,
} from "@/hooks/use-problem";

export default function ProblemRender({ problemId }: { problemId: string }) {
  const [userSolution, setUserSolution] = useState<string | null>(null);

  const {
    isLoading: isProblemTextLoading,
    error: problemTextError,
    data: problemText,
    getData: getProblemText,
    generateData: callGenerateProblemText,
  } = useProblemText(problemId);

  const {
    isLoading: isTestCasesLoading,
    error: testCasesError,
    data: testCases,
    getData: getTestCases,
    generateData: callGenerateTestCases,
  } = useTestCases(problemId);

  const {
    isLoading: isTestCaseInputsLoading,
    error: testCaseInputCodeError,
    data: testCaseInputCode,
    getData: getCodeToGenerateTestCaseInputs,
    generateData: callGenerateTestCaseInputCode,
  } = useTestCaseInputCode(problemId);

  const {
    isLoading: isGenerateTestCaseInputsLoading,
    error: testCaseInputsError,
    data: testCaseInputs,
    getData: getTestCaseInputs,
    generateData: callGenerateTestCaseInputs,
  } = useTestCaseInputs(problemId);

  const {
    isLoading: isGenerateSolutionLoading,
    error: solutionError,
    data: solution,
    getData: getSolution,
    generateData: callGenerateSolution,
  } = useSolution(problemId);

  const {
    isLoading: isGenerateTestCaseOutputsLoading,
    error: testCaseOutputsError,
    data: testCaseOutputs,
    getData: getTestCaseOutputs,
    generateData: callGenerateTestCaseOutputs,
  } = useTestCaseOutputs(problemId);

  const {
    isLoading: isRunUserSolutionLoading,
    error: userSolutionError,
    data: userSolutionTestResults,
    runData: callRunUserSolution,
  } = useRunUserSolution(problemId, userSolution);

  useEffect(() => {
    if (solution) {
      setUserSolution(solution);
    }
  }, [solution]);

  return (
    <div>
      <div>Problem: {problemId}</div>
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
                <MessageResponse>{problemText.problemText}</MessageResponse>
                <MessageResponse>
                  {problemText.functionSignature}
                </MessageResponse>
              </>
            )}
          </>
        )}
      </div>
      <div>
        <Button variant={"outline"} onClick={() => callGenerateTestCases()}>
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
        <Button variant={"outline"} onClick={() => callGenerateSolution()}>
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
                  })}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
