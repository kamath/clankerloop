"use client";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect } from "react";
import { MessageResponse } from "@/components/ai-elements/message";
import Loader from "@/components/client/loader";
import { useAtomValue, useSetAtom } from "jotai";
import {
  callGenerateProblemTextAtom,
  callGenerateTestCasesAtom,
  getCodeToGenerateTestCaseInputsAtom,
  getProblemTextAtom,
  getTestCasesAtom,
  isProblemTextLoadingAtom,
  isTestCaseInputsLoadingAtom,
  isTestCasesLoadingAtom,
  problemIdAtom,
  problemTextAtom,
  problemTextErrorAtom,
  testCaseInputsAtom,
  testCasesAtom,
  testCasesErrorAtom,
  testCaseInputCodeAtom,
  testCaseInputCodeErrorAtom,
  callGenerateTestCaseInputsAtom,
  isGenerateTestCaseInputsLoadingAtom,
  testCaseInputsErrorAtom,
  callGenerateTestCaseInputCodeAtom,
  getTestCaseInputsAtom,
  isGenerateSolutionLoadingAtom,
  solutionAtom,
  solutionErrorAtom,
  getSolutionAtom,
  callGenerateSolutionAtom,
  callGenerateTestCaseOutputsAtom,
  getTestCaseOutputsAtom,
  isGenerateTestCaseOutputsLoadingAtom,
  testCaseOutputsAtom,
  testCaseOutputsErrorAtom,
} from "@/atoms";

export default function ProblemRender({ problemId }: { problemId: string }) {
  const setProblemId = useSetAtom(problemIdAtom);
  const isProblemTextLoading = useAtomValue(isProblemTextLoadingAtom);
  const problemText = useAtomValue(problemTextAtom);
  const problemTextError = useAtomValue(problemTextErrorAtom);
  const callGenerateProblemText = useSetAtom(callGenerateProblemTextAtom);
  const getProblemText = useSetAtom(getProblemTextAtom);
  const isTestCasesLoading = useAtomValue(isTestCasesLoadingAtom);
  const testCases = useAtomValue(testCasesAtom);
  const testCasesError = useAtomValue(testCasesErrorAtom);
  const callGenerateTestCases = useSetAtom(callGenerateTestCasesAtom);
  const getTestCases = useSetAtom(getTestCasesAtom);
  const isTestCaseInputsLoading = useAtomValue(isTestCaseInputsLoadingAtom);
  const testCaseInputCode = useAtomValue(testCaseInputCodeAtom);
  const testCaseInputCodeError = useAtomValue(testCaseInputCodeErrorAtom);
  const callGenerateTestCaseInputCode = useSetAtom(
    callGenerateTestCaseInputCodeAtom
  );
  const getCodeToGenerateTestCaseInputs = useSetAtom(
    getCodeToGenerateTestCaseInputsAtom
  );
  const callGenerateTestCaseInputs = useSetAtom(callGenerateTestCaseInputsAtom);
  const isGenerateTestCaseInputsLoading = useAtomValue(
    isGenerateTestCaseInputsLoadingAtom
  );
  const testCaseInputs = useAtomValue(testCaseInputsAtom);
  const testCaseInputsError = useAtomValue(testCaseInputsErrorAtom);
  const getTestCaseInputs = useSetAtom(getTestCaseInputsAtom);
  const isGenerateSolutionLoading = useAtomValue(isGenerateSolutionLoadingAtom);
  const solution = useAtomValue(solutionAtom);
  const solutionError = useAtomValue(solutionErrorAtom);
  const callGenerateSolution = useSetAtom(callGenerateSolutionAtom);
  const getSolution = useSetAtom(getSolutionAtom);
  const isGenerateTestCaseOutputsLoading = useAtomValue(
    isGenerateTestCaseOutputsLoadingAtom
  );
  const testCaseOutputs = useAtomValue(testCaseOutputsAtom);
  const testCaseOutputsError = useAtomValue(testCaseOutputsErrorAtom);
  const callGenerateTestCaseOutputs = useSetAtom(
    callGenerateTestCaseOutputsAtom
  );
  const getTestCaseOutputs = useSetAtom(getTestCaseOutputsAtom);

  useEffect(() => {
    setProblemId(problemId);
  }, [problemId, setProblemId]);

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
                <AlertDescription>{problemTextError.message}</AlertDescription>
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
                <AlertDescription>{testCasesError.message}</AlertDescription>
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
                  {testCaseInputCodeError.message}
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
                  {testCaseInputsError.message}
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
                <AlertDescription>{solutionError.message}</AlertDescription>
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
                  {testCaseOutputsError.message}
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
    </div>
  );
}
