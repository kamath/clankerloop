"use client";

import { Button } from "@/components/ui/button";
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
  testCaseInputsAtom,
  testCasesAtom,
  testCaseInputCodeAtom,
  callGenerateTestCaseInputsAtom,
  isGenerateTestCaseInputsLoadingAtom,
  callGenerateTestCaseInputCodeAtom,
  getTestCaseInputsAtom,
  isGenerateSolutionLoadingAtom,
  solutionAtom,
  getSolutionAtom,
  callGenerateSolutionAtom,
  callGenerateTestCaseOutputsAtom,
  getTestCaseOutputsAtom,
  isGenerateTestCaseOutputsLoadingAtom,
  testCaseOutputsAtom,
} from "@/atoms";

export default function ProblemRender({ problemId }: { problemId: string }) {
  const setProblemId = useSetAtom(problemIdAtom);
  const isProblemTextLoading = useAtomValue(isProblemTextLoadingAtom);
  const problemText = useAtomValue(problemTextAtom);
  const callGenerateProblemText = useSetAtom(callGenerateProblemTextAtom);
  const getProblemText = useSetAtom(getProblemTextAtom);
  const isTestCasesLoading = useAtomValue(isTestCasesLoadingAtom);
  const testCases = useAtomValue(testCasesAtom);
  const callGenerateTestCases = useSetAtom(callGenerateTestCasesAtom);
  const getTestCases = useSetAtom(getTestCasesAtom);
  const isTestCaseInputsLoading = useAtomValue(isTestCaseInputsLoadingAtom);
  const testCaseInputCode = useAtomValue(testCaseInputCodeAtom);
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
  const getTestCaseInputs = useSetAtom(getTestCaseInputsAtom);
  const isGenerateSolutionLoading = useAtomValue(isGenerateSolutionLoadingAtom);
  const solution = useAtomValue(solutionAtom);
  const callGenerateSolution = useSetAtom(callGenerateSolutionAtom);
  const getSolution = useSetAtom(getSolutionAtom);
  const isGenerateTestCaseOutputsLoading = useAtomValue(
    isGenerateTestCaseOutputsLoadingAtom
  );
  const testCaseOutputs = useAtomValue(testCaseOutputsAtom);
  const callGenerateTestCaseOutputs = useSetAtom(
    callGenerateTestCaseOutputsAtom
  );
  const getTestCaseOutputs = useSetAtom(getTestCaseOutputsAtom);

  useEffect(() => {
    setProblemId(problemId);
  }, [problemId, setProblemId]);

  useEffect(() => {
    getProblemText();
  }, [getProblemText, problemId]);

  useEffect(() => {
    getTestCases();
  }, [getTestCases, problemId, problemText]);

  useEffect(() => {
    getCodeToGenerateTestCaseInputs();
  }, [getCodeToGenerateTestCaseInputs, problemId, testCases]);

  useEffect(() => {
    getTestCaseInputs();
  }, [getTestCaseInputs, problemId, testCaseInputCode]);

  useEffect(() => {
    getSolution();
  }, [getSolution, problemId, testCaseInputCode]);

  useEffect(() => {
    getTestCaseOutputs();
  }, [getTestCaseOutputs, problemId, solution]);

  return (
    <div>
      <div>Problem: {problemId}</div>
      <div>
        {!problemText && (
          <Button variant={"outline"} onClick={() => callGenerateProblemText()}>
            Generate Problem Text
          </Button>
        )}
        {isProblemTextLoading ? (
          <Loader />
        ) : (
          problemText && (
            <>
              <MessageResponse>{problemText.problemText}</MessageResponse>
              <MessageResponse>
                {problemText.functionSignature}
              </MessageResponse>
            </>
          )
        )}
      </div>
      <div>
        <Button variant={"outline"} onClick={() => callGenerateTestCases()}>
          Generate Test Case Descriptions
        </Button>
        {isTestCasesLoading ? (
          <Loader />
        ) : (
          testCases && (
            <div>
              {testCases.map((testCase, i) => (
                <div key={`testcase-description-${i}`}>
                  {testCase.description}
                  {testCase.isEdgeCase ? " [Edge Case]" : ""}
                </div>
              ))}
            </div>
          )
        )}
      </div>
      <div>
        <Button
          variant={"outline"}
          onClick={() => callGenerateTestCaseInputCode()}
        >
          Generate Test Case Inputs
        </Button>
        {isTestCaseInputsLoading ? (
          <Loader />
        ) : (
          testCaseInputCode && (
            <div>
              {testCaseInputCode.map((testCaseInput, i) => (
                <div key={`testcase-input-${i}`}>{testCaseInput.inputCode}</div>
              ))}
            </div>
          )
        )}
      </div>
      <div>
        <Button
          variant={"outline"}
          onClick={() => callGenerateTestCaseInputs()}
        >
          Run Generate Input
        </Button>
        {isGenerateTestCaseInputsLoading ? (
          <Loader />
        ) : (
          testCaseInputs && (
            <div>
              {testCaseInputs.map((result, i) => (
                <div key={`run-generate-input-result-${i}`}>
                  {JSON.stringify(result)}
                </div>
              ))}
            </div>
          )
        )}
      </div>
      <div>
        <Button variant={"outline"} onClick={() => callGenerateSolution()}>
          Generate Solution
        </Button>
        {isGenerateSolutionLoading ? (
          <Loader />
        ) : (
          solution && <MessageResponse>{solution}</MessageResponse>
        )}
      </div>
      <div>
        <Button
          variant={"outline"}
          onClick={() => callGenerateTestCaseOutputs()}
        >
          Generate Test Case Outputs
        </Button>
        {isGenerateTestCaseOutputsLoading ? (
          <Loader />
        ) : (
          testCaseOutputs && (
            <div>
              {testCaseOutputs.map((output, i) => (
                <div key={`testcase-output-${i}`}>{JSON.stringify(output)}</div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
