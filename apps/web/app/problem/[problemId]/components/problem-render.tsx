"use client";

import { Button } from "@/components/ui/button";
import {
  generateProblemText,
  getProblemText,
} from "../actions/generate-problem-text";
import { useCallback, useEffect, useState } from "react";
import { Message, MessageResponse } from "@/components/ai-elements/message";
import Loader from "@/components/client/loader";

export default function ProblemRender({ problemId }: { problemId: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [problemText, setProblemText] = useState<string | null>(null);

  useEffect(() => {
    const fetchProblemText = async () => {
      const problemText = await getProblemText(problemId);
      setProblemText(problemText);
      setIsLoading(false);
    };
    fetchProblemText();
  }, [problemId]);

  const callGenerateProblemText = useCallback(async () => {
    setIsLoading(true);
    const newProblemText = await generateProblemText(problemId);
    setIsLoading(false);
    setProblemText(newProblemText);
  }, [problemId]);

  return (
    <div>
      <div>Problem: {problemId}</div>
      <div>
        <Button variant={"outline"} onClick={() => callGenerateProblemText()}>
          Generate Problem Text
        </Button>
        {isLoading ? (
          <Loader />
        ) : (
          problemText && <MessageResponse>{problemText}</MessageResponse>
        )}
      </div>
    </div>
  );
}
