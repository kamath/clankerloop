"use client";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState, useRef, useEffect, useCallback } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Loader from "@/components/client/loader";
import {
  CodeGenLanguage,
  useRunUserSolution,
  useRunUserSolutionWithCustomInputs,
  useTestCaseInputs,
  useTestCases,
} from "@/hooks/use-problem";
import { ClientFacingUserObject } from "@/lib/auth-types";

interface CustomTestInputsProps {
  problemId: string;
  onRunTestsRef?: React.MutableRefObject<(() => Promise<void>) | null>;
  onCanRunTestsChange?: (canRun: boolean) => void;
  // Run Solution props
  userSolution: string | null;
  language: CodeGenLanguage;
  user: ClientFacingUserObject;
}

export default function CustomTestInputs({
  problemId,
  onRunTestsRef,
  onCanRunTestsChange,
  userSolution,
  language,
  user,
}: CustomTestInputsProps) {
  const {
    data: customTestResults,
    runData: callRunCustomTests,
    isLoading: isRunCustomTestsLoading,
    error: customTestsError,
  } = useRunUserSolutionWithCustomInputs(
    problemId,
    userSolution,
    language,
    user.apiKey
  );

  const { data: testCases } = useTestCases(problemId, user.apiKey);
  const { data: testCaseInputs } = useTestCaseInputs(problemId, user.apiKey);
  const {
    data: userSolutionTestResults,
    isLoading: isRunUserSolutionLoading,
    error: userSolutionError,
  } = useRunUserSolution(problemId, userSolution, language, user.apiKey);

  const [viewMode, setViewMode] = useState<"custom" | "results">("custom");
  const [customTestCases, setCustomTestCases] = useState<
    Array<{ id: string; inputText: string }>
  >([{ id: `test-case-0`, inputText: "" }]);
  const [selectedTab, setSelectedTab] = useState("test-case-0");
  const hasInitializedCustomTestCases = useRef(false);

  // Switch to results view when Run Solution results are available
  useEffect(() => {
    if (userSolutionTestResults && userSolutionTestResults.length > 0) {
      setViewMode("results");
      setSelectedTab("result-case-0");
    }
  }, [userSolutionTestResults]);

  // Reset initialization flag when problemId changes
  useEffect(() => {
    hasInitializedCustomTestCases.current = false;
    const initialId = `test-case-${Date.now()}`;
    setCustomTestCases([{ id: initialId, inputText: "" }]);
    setSelectedTab(initialId);
  }, [problemId]);

  // Pre-populate custom test cases with sample test case inputs
  useEffect(() => {
    if (
      !hasInitializedCustomTestCases.current &&
      testCases &&
      testCaseInputs &&
      testCases.length > 0 &&
      testCaseInputs.length > 0
    ) {
      // Filter to sample test cases
      const sampleTestCases = testCases
        .map((testCase, index) => ({
          testCase,
          index,
        }))
        .filter(({ testCase }) => testCase.isSampleCase === true);

      // Match sample test cases with their inputs (testCaseInputs is already filtered by backend)
      if (sampleTestCases.length > 0 && testCaseInputs.length > 0) {
        const newTestCases = testCaseInputs
          .slice(0, sampleTestCases.length)
          .map((input, index) => ({
            id: `test-case-${index}`,
            inputText: JSON.stringify(input),
          }));
        setCustomTestCases(newTestCases);
        setSelectedTab(newTestCases[0]?.id ?? "test-case-0");
        hasInitializedCustomTestCases.current = true;
      }
    }
  }, [testCases, testCaseInputs]);

  const getTestCaseIndex = (id: string) =>
    customTestCases.findIndex((tc) => tc.id === id);

  const handleAddTestCase = () => {
    if (customTestCases.length < 10) {
      const newId = `test-case-${Date.now()}-${Math.random()}`;
      setCustomTestCases((prev) => [...prev, { id: newId, inputText: "" }]);
      setSelectedTab(newId);
    }
  };

  const handleRemoveTestCase = (id: string) => {
    const index = getTestCaseIndex(id);
    setCustomTestCases((prev) => prev.filter((tc) => tc.id !== id));

    // Select another tab
    if (selectedTab === id) {
      const newTestCases = customTestCases.filter((tc) => tc.id !== id);
      if (newTestCases.length > 0) {
        const newIndex = Math.min(index, newTestCases.length - 1);
        setSelectedTab(newTestCases[newIndex]?.id ?? "");
      }
    }
  };

  const handleRunTests = useCallback(async () => {
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
  }, [customTestCases, callRunCustomTests]);

  // Expose handleRunTests via ref if provided
  useEffect(() => {
    if (onRunTestsRef) {
      onRunTestsRef.current = handleRunTests;
    }
  }, [onRunTestsRef, customTestCases, handleRunTests]);

  // Notify parent about whether tests can be run
  useEffect(() => {
    if (onCanRunTestsChange) {
      const canRun = !customTestCases.every((tc) => !tc.inputText.trim());
      onCanRunTestsChange(canRun);
    }
  }, [customTestCases, onCanRunTestsChange]);

  // Determine which test cases/results to show based on view mode
  const showTestResults =
    viewMode === "results" &&
    userSolutionTestResults &&
    userSolutionTestResults.length > 0;
  const showCustomTests = viewMode === "custom";

  return (
    <div className="h-full flex flex-col overflow-hidden py-2 bg-card">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between border-b border-border flex-shrink-0 bg-card">
        <div className="flex items-center gap-2 pb-2">
          <span className="text-sm font-medium px-3">Test Results</span>
          <div className="flex gap-1 border rounded-md p-0.5">
            <Button
              variant={viewMode === "custom" ? "default" : "ghost"}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => {
                setViewMode("custom");
                if (customTestCases.length > 0) {
                  setSelectedTab(customTestCases[0]?.id ?? "test-case-0");
                }
              }}
            >
              Custom Tests
            </Button>
            <Button
              variant={viewMode === "results" ? "default" : "ghost"}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => {
                if (
                  userSolutionTestResults &&
                  userSolutionTestResults.length > 0
                ) {
                  setViewMode("results");
                  setSelectedTab("result-case-0");
                }
              }}
              disabled={
                !userSolutionTestResults || userSolutionTestResults.length === 0
              }
            >
              Submission Results
            </Button>
          </div>
        </div>
      </div>

      {/* Loading state for Run Solution */}
      {isRunUserSolutionLoading && (
        <div className="flex items-center gap-2 p-3 border-b">
          <Loader />
          <span className="text-sm text-muted-foreground">
            Running tests...
          </span>
        </div>
      )}

      {/* Error state for Run Solution */}
      {userSolutionError !== undefined &&
        userSolutionError !== null &&
        !isRunUserSolutionLoading && (
          <div className="p-3 border-b">
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {userSolutionError instanceof Error
                  ? userSolutionError.message
                  : typeof userSolutionError === "string"
                    ? userSolutionError
                    : JSON.stringify(userSolutionError)}
              </AlertDescription>
            </Alert>
          </div>
        )}

      {/* Custom Tests View */}
      {showCustomTests && (
        <div className="w-full h-full bg-muted">
          <Tabs
            value={selectedTab}
            onValueChange={setSelectedTab}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList className="justify-start rounded-none border-b border-border p-0 h-auto bg-secondary">
              {customTestCases.map((testCase, index) => {
                const result =
                  customTestResults && customTestResults[index]
                    ? customTestResults[index]
                    : null;

                const hasResult = result !== null;
                const isPassing =
                  hasResult &&
                  !result.error &&
                  JSON.stringify(result.actual) ===
                    JSON.stringify(result.expected);
                const isFailing = hasResult && !isPassing;

                return (
                  <TabsTrigger
                    key={testCase.id}
                    value={testCase.id}
                    className={`relative rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none ${
                      isPassing
                        ? "text-green-600 data-[state=active]:text-green-600"
                        : isFailing
                          ? "text-red-600 data-[state=active]:text-red-600"
                          : ""
                    }`}
                  >
                    <span>Case {index + 1}</span>
                    {customTestCases.length > 1 && (
                      <span
                        className="ml-2 rounded p-0.5 cursor-pointer hover:bg-muted inline-flex items-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleRemoveTestCase(testCase.id);
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            e.preventDefault();
                            handleRemoveTestCase(testCase.id);
                          }
                        }}
                      >
                        <XIcon className="h-3 w-3" />
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-2 rounded-none border-b-2 border-transparent"
                onClick={handleAddTestCase}
                disabled={customTestCases.length >= 10}
              >
                <PlusIcon className="h-4 w-4" /> Add Test Case
              </Button>
            </TabsList>

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
                <TabsContent
                  key={testCase.id}
                  value={testCase.id}
                  className="flex-1 overflow-auto p-3 space-y-3 mt-0"
                >
                  <p className="text-xs text-muted-foreground">
                    Enter a JSON array of function arguments. For example, a
                    function signature of function functionName(a: number, b:
                    string): number should have an input of:{" "}
                    <code className="bg-muted px-1 rounded">
                      [1, &quot;hello&quot;]
                    </code>
                  </p>

                  <Textarea
                    placeholder="[1, 2, 3]"
                    value={testCase.inputText}
                    onChange={(e) => {
                      setCustomTestCases((prev) =>
                        prev.map((tc) =>
                          tc.id === testCase.id
                            ? { ...tc, inputText: e.target.value }
                            : tc
                        )
                      );
                    }}
                    className="font-mono text-sm min-h-[80px] w-full"
                  />

                  {validationError && (
                    <Alert variant="destructive" className="py-2">
                      <AlertDescription className="text-xs">
                        {validationError}
                      </AlertDescription>
                    </Alert>
                  )}

                  {result && (
                    <div className="space-y-1 border-t pt-2">
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
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      )}

      {/* Test Results View */}
      {showTestResults && (
        <Tabs
          value={selectedTab}
          onValueChange={setSelectedTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="justify-start rounded-none border-b border-border p-0 h-auto bg-secondary">
            {userSolutionTestResults!.map((testResult, index) => {
              const isPassing = testResult.status === "pass";
              const isFailing =
                testResult.status === "fail" || testResult.status === "error";

              return (
                <TabsTrigger
                  key={`result-case-${index}`}
                  value={`result-case-${index}`}
                  className={`relative rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none ${
                    isPassing
                      ? "text-green-600 data-[state=active]:text-green-600"
                      : isFailing
                        ? "text-red-600 data-[state=active]:text-red-600"
                        : ""
                  }`}
                >
                  <span>Case {index + 1}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {userSolutionTestResults!.map((testResult, index) => (
            <TabsContent
              key={`result-case-${index}`}
              value={`result-case-${index}`}
              className="flex-1 overflow-auto p-3 space-y-3 mt-0"
            >
              {/* Test Case Description */}
              <div className="space-y-2">
                <div className="text-sm font-medium mb-1">
                  Test Case {index + 1}
                  {testResult.testCase.isEdgeCase && (
                    <Badge variant="outline" className="ml-2">
                      Edge Case
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  {testResult.testCase.description}
                </div>
              </div>

              {/* Test Result */}
              <div className="space-y-1 border-t pt-2">
                <div className="text-xs font-medium mb-1">Result:</div>
                <div className="space-y-1 text-xs font-mono">
                  {testResult.error ? (
                    <Alert variant="destructive" className="py-2">
                      <AlertTitle className="text-xs">Error</AlertTitle>
                      <AlertDescription className="text-xs whitespace-pre-wrap">
                        {testResult.error}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div
                      className={`p-2 rounded ${
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
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Custom Tests Error */}
      {showCustomTests &&
        customTestsError !== undefined &&
        customTestsError !== null &&
        !isRunCustomTestsLoading && (
          <div className="p-3 border-t">
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {customTestsError instanceof Error
                  ? customTestsError.message
                  : String(customTestsError)}
              </AlertDescription>
            </Alert>
          </div>
        )}
    </div>
  );
}
