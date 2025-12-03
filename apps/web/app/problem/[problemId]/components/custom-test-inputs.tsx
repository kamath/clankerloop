"use client";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState, useRef, useEffect } from "react";
import { PlusIcon, XIcon, Loader2Icon, PlayIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CustomTestInputsProps {
  testCases:
    | Array<{
        description: string;
        isSampleCase: boolean;
        isEdgeCase: boolean;
      }>
    | null
    | undefined;
  testCaseInputs: unknown[] | null | undefined;
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
  problemId: string;
}

export default function CustomTestInputs({
  testCases,
  testCaseInputs,
  isRunCustomTestsLoading,
  customTestsError,
  customTestResults,
  callRunCustomTests,
  problemId,
}: CustomTestInputsProps) {
  const [customTestCases, setCustomTestCases] = useState<
    Array<{ id: string; inputText: string }>
  >([{ id: `test-case-0`, inputText: "" }]);
  const [selectedTab, setSelectedTab] = useState("test-case-0");
  const hasInitializedCustomTestCases = useRef(false);

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

  const handleRunTests = async () => {
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
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b flex-shrink-0 bg-background">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Testcase</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={handleAddTestCase}
            disabled={customTestCases.length >= 10}
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="default"
            size="sm"
            className="h-7"
            onClick={handleRunTests}
            disabled={
              isRunCustomTestsLoading ||
              customTestCases.every((tc) => !tc.inputText.trim())
            }
          >
            {isRunCustomTestsLoading ? (
              <Loader2Icon className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <PlayIcon className="h-4 w-4 mr-1" />
            )}
            Run
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="justify-start rounded-none border-b bg-muted/30 p-0 h-auto">
          {customTestCases.map((testCase, index) => {
            const result =
              customTestResults && customTestResults[index]
                ? customTestResults[index]
                : null;

            const hasResult = result !== null;
            const isPassing =
              hasResult &&
              !result.error &&
              JSON.stringify(result.actual) === JSON.stringify(result.expected);
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
                  <button
                    className="ml-2 hover:bg-muted rounded p-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTestCase(testCase.id);
                    }}
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                )}
              </TabsTrigger>
            );
          })}
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

      {customTestsError !== undefined &&
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
