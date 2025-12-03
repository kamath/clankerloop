"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  generateProblemText,
  getProblemText,
} from "@/actions/generate-problem-text";
import { generateTestCases, getTestCases } from "@/actions/generate-test-cases";
import {
  generateTestCaseInputCode,
  getTestCaseInputCode,
} from "@/actions/generate-test-case-input-code";
import {
  generateTestCaseInputs,
  getTestCaseInputs,
} from "@/actions/generate-test-case-inputs";
import { generateSolution, getSolution } from "@/actions/generate-solution";
import {
  generateTestCaseOutputs,
  getTestCaseOutputs,
} from "@/actions/generate-test-case-outputs";
import {
  runUserSolution,
  runUserSolutionWithCustomInputs,
  type CodeGenLanguage,
} from "@/actions/run-user-solution";
import type { CustomTestResult } from "@/actions/run-user-solution";

// Re-export CodeGenLanguage for consumers
export type { CodeGenLanguage } from "@/actions/run-user-solution";
import {
  getGenerationStatus,
  type GenerationStep,
} from "@/actions/generation-status";
import { listModels } from "@/actions/list-models";
import { getProblemModel } from "@/actions/get-problem-model";
import { getStarterCode } from "@/actions/get-starter-code";

export function useProblemText(
  problemId: string | null,
  encryptedUserId?: string,
) {
  const queryClient = useQueryClient();
  const queryKey = ["problemText", problemId];

  const query = useQuery({
    queryKey,
    queryFn: () => {
      if (!problemId) throw new Error("Problem ID is not set");
      return getProblemText(problemId, encryptedUserId);
    },
    enabled: false,
  });

  const generateMutation = useMutation({
    mutationFn: async ({
      id,
      model,
      enqueueNextStep,
      forceError,
      returnDummy,
    }: {
      id: string;
      model: string;
      enqueueNextStep?: boolean;
      forceError?: boolean;
      returnDummy?: boolean;
    }) => {
      const result = await generateProblemText(
        id,
        model,
        encryptedUserId,
        enqueueNextStep ?? true,
        forceError,
        returnDummy,
      );
      queryClient.setQueryData(queryKey, result);
      return result;
    },
  });

  const getData = async () => {
    if (!problemId) return Promise.reject(new Error("Problem ID is not set"));
    return await query.refetch();
  };

  const generateData = async (
    model: string,
    forceError?: boolean,
    enqueueNextStep?: boolean,
    returnDummy?: boolean,
  ) => {
    if (!problemId) throw new Error("Problem ID is not set");
    return generateMutation.mutateAsync({
      id: problemId,
      model,
      enqueueNextStep,
      forceError,
      returnDummy,
    });
  };

  return {
    isLoading: query.isFetching || generateMutation.isPending,
    error: query.error || generateMutation.error,
    data: query.data,
    getData,
    generateData,
  };
}

export function useTestCases(
  problemId: string | null,
  encryptedUserId?: string,
) {
  const queryClient = useQueryClient();
  const queryKey = ["testCases", problemId];

  const query = useQuery({
    queryKey,
    queryFn: () => {
      if (!problemId) throw new Error("Problem ID is not set");
      return getTestCases(problemId, encryptedUserId);
    },
    enabled: false,
  });

  const generateMutation = useMutation({
    mutationFn: async ({
      id,
      model,
      enqueueNextStep,
      forceError,
      returnDummy,
    }: {
      id: string;
      model: string;
      enqueueNextStep?: boolean;
      forceError?: boolean;
      returnDummy?: boolean;
    }) => {
      const result = await generateTestCases(
        id,
        model,
        encryptedUserId,
        enqueueNextStep ?? true,
        forceError,
        returnDummy,
      );
      queryClient.setQueryData(queryKey, result);
      return result;
    },
  });

  const getData = async () => {
    if (!problemId) return Promise.reject(new Error("Problem ID is not set"));
    return await query.refetch();
  };

  const generateData = async (
    model: string,
    forceError?: boolean,
    enqueueNextStep?: boolean,
    returnDummy?: boolean,
  ) => {
    if (!problemId) throw new Error("Problem ID is not set");
    return generateMutation.mutateAsync({
      id: problemId,
      model,
      enqueueNextStep,
      forceError,
      returnDummy,
    });
  };

  return {
    isLoading: query.isFetching || generateMutation.isPending,
    error: query.error || generateMutation.error,
    data: query.data,
    getData,
    generateData,
  };
}

export function useTestCaseInputCode(
  problemId: string | null,
  encryptedUserId?: string,
) {
  const queryClient = useQueryClient();
  const queryKey = ["testCaseInputCode", problemId];

  const query = useQuery({
    queryKey,
    queryFn: () => {
      if (!problemId) throw new Error("Problem ID is not set");
      return getTestCaseInputCode(problemId, encryptedUserId);
    },
    enabled: false,
  });

  const generateMutation = useMutation({
    mutationFn: async ({
      id,
      model,
      enqueueNextStep,
      forceError,
      returnDummy,
    }: {
      id: string;
      model: string;
      enqueueNextStep?: boolean;
      forceError?: boolean;
      returnDummy?: boolean;
    }) => {
      const result = await generateTestCaseInputCode(
        id,
        model,
        encryptedUserId,
        enqueueNextStep ?? true,
        forceError,
        returnDummy,
      );
      queryClient.setQueryData(queryKey, result);
      return result;
    },
  });

  const getData = async () => {
    if (!problemId) return Promise.reject(new Error("Problem ID is not set"));
    return await query.refetch();
  };

  const generateData = async (
    model: string,
    forceError?: boolean,
    enqueueNextStep?: boolean,
    returnDummy?: boolean,
  ) => {
    if (!problemId) throw new Error("Problem ID is not set");
    return generateMutation.mutateAsync({
      id: problemId,
      model,
      enqueueNextStep,
      forceError,
      returnDummy,
    });
  };

  return {
    isLoading: query.isFetching || generateMutation.isPending,
    error: query.error || generateMutation.error,
    data: query.data,
    getData,
    generateData,
  };
}

export function useTestCaseInputs(
  problemId: string | null,
  encryptedUserId?: string,
) {
  const queryClient = useQueryClient();
  const queryKey = ["testCaseInputs", problemId];

  const query = useQuery({
    queryKey,
    queryFn: () => {
      if (!problemId) throw new Error("Problem ID is not set");
      return getTestCaseInputs(problemId, encryptedUserId);
    },
    enabled: false,
  });

  const generateMutation = useMutation({
    mutationFn: async ({
      id,
      enqueueNextStep,
    }: {
      id: string;
      enqueueNextStep?: boolean;
    }) => {
      const result = await generateTestCaseInputs(
        id,
        encryptedUserId,
        enqueueNextStep ?? true,
      );
      queryClient.setQueryData(queryKey, result);
      return result;
    },
  });

  const getData = async () => {
    if (!problemId) return Promise.reject(new Error("Problem ID is not set"));
    return await query.refetch();
  };

  const generateData = async (enqueueNextStep?: boolean) => {
    if (!problemId) throw new Error("Problem ID is not set");
    return generateMutation.mutateAsync({
      id: problemId,
      enqueueNextStep,
    });
  };

  return {
    isLoading: query.isFetching || generateMutation.isPending,
    error: query.error || generateMutation.error,
    data: query.data,
    getData,
    generateData,
  };
}

export function useSolution(
  problemId: string | null,
  encryptedUserId?: string,
) {
  const queryClient = useQueryClient();
  const queryKey = ["solution", problemId];

  const query = useQuery({
    queryKey,
    queryFn: () => {
      if (!problemId) throw new Error("Problem ID is not set");
      return getSolution(problemId, encryptedUserId);
    },
    enabled: false,
  });

  const generateMutation = useMutation({
    mutationFn: async ({
      id,
      model,
      updateProblem,
      enqueueNextStep,
      forceError,
      returnDummy,
    }: {
      id: string;
      model: string;
      updateProblem?: boolean;
      enqueueNextStep?: boolean;
      forceError?: boolean;
      returnDummy?: boolean;
    }) => {
      const result = await generateSolution(
        id,
        model,
        encryptedUserId,
        updateProblem,
        enqueueNextStep,
        forceError,
        returnDummy,
      );
      queryClient.setQueryData(queryKey, result);
      return result;
    },
  });

  const getData = async () => {
    if (!problemId) return Promise.reject(new Error("Problem ID is not set"));
    return await query.refetch();
  };

  const generateData = async (
    model: string,
    updateProblem?: boolean,
    enqueueNextStep?: boolean,
    forceError?: boolean,
    returnDummy?: boolean,
  ) => {
    if (!problemId) throw new Error("Problem ID is not set");
    return generateMutation.mutateAsync({
      id: problemId,
      model,
      updateProblem,
      enqueueNextStep,
      forceError,
      returnDummy,
    });
  };

  return {
    isLoading: query.isFetching || generateMutation.isPending,
    error: query.error || generateMutation.error,
    data: query.data,
    getData,
    generateData,
  };
}

export function useGenerateSolutionWithModel(
  problemId: string | null,
  encryptedUserId?: string,
) {
  const generateMutation = useMutation({
    mutationFn: async ({
      id,
      model,
      updateProblem,
      enqueueNextStep,
      forceError,
      returnDummy,
    }: {
      id: string;
      model: string;
      updateProblem?: boolean;
      enqueueNextStep?: boolean;
      forceError?: boolean;
      returnDummy?: boolean;
    }) => {
      return await generateSolution(
        id,
        model,
        encryptedUserId,
        updateProblem,
        enqueueNextStep,
        forceError,
        returnDummy,
      );
    },
  });

  const generateData = async (
    model: string,
    updateProblem?: boolean,
    enqueueNextStep?: boolean,
    forceError?: boolean,
    returnDummy?: boolean,
  ) => {
    if (!problemId) throw new Error("Problem ID is not set");
    return generateMutation.mutateAsync({
      id: problemId,
      model,
      updateProblem,
      enqueueNextStep,
      forceError,
      returnDummy,
    });
  };

  return {
    isLoading: generateMutation.isPending,
    error: generateMutation.error,
    data: generateMutation.data,
    generateData,
  };
}

export function useTestCaseOutputs(
  problemId: string | null,
  encryptedUserId?: string,
) {
  const queryClient = useQueryClient();
  const queryKey = ["testCaseOutputs", problemId];

  const query = useQuery({
    queryKey,
    queryFn: () => {
      if (!problemId) throw new Error("Problem ID is not set");
      return getTestCaseOutputs(problemId, encryptedUserId);
    },
    enabled: false,
  });

  const generateMutation = useMutation({
    mutationFn: async ({
      id,
      enqueueNextStep,
    }: {
      id: string;
      enqueueNextStep?: boolean;
    }) => {
      const result = await generateTestCaseOutputs(
        id,
        encryptedUserId,
        enqueueNextStep ?? true,
      );
      queryClient.setQueryData(queryKey, result);
      return result;
    },
  });

  const getData = async () => {
    if (!problemId) return Promise.reject(new Error("Problem ID is not set"));
    return await query.refetch();
  };

  const generateData = async (enqueueNextStep?: boolean) => {
    if (!problemId) throw new Error("Problem ID is not set");
    return generateMutation.mutateAsync({
      id: problemId,
      enqueueNextStep,
    });
  };

  return {
    isLoading: query.isFetching || generateMutation.isPending,
    error: query.error || generateMutation.error,
    data: query.data,
    getData,
    generateData,
  };
}

export function useRunUserSolution(
  problemId: string | null,
  userSolution: string | null,
  language: CodeGenLanguage = "typescript",
  encryptedUserId?: string,
) {
  const queryClient = useQueryClient();
  const queryKey = ["runUserSolution", problemId, userSolution, language];

  const query = useQuery({
    queryKey,
    queryFn: () => {
      if (!problemId) throw new Error("Problem ID is not set");
      if (!userSolution) throw new Error("User solution is not set");
      return runUserSolution(
        problemId,
        userSolution,
        language,
        encryptedUserId,
      );
    },
    enabled: false,
  });

  const runMutation = useMutation({
    mutationFn: async ({
      id,
      code,
      lang,
    }: {
      id: string;
      code: string;
      lang: CodeGenLanguage;
    }) => {
      return runUserSolution(id, code, lang, encryptedUserId);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
  });

  const runData = async () => {
    if (!problemId) throw new Error("Problem ID is not set");
    if (!userSolution) throw new Error("User solution is not set");
    return runMutation.mutateAsync({
      id: problemId,
      code: userSolution,
      lang: language,
    });
  };

  return {
    isLoading: query.isFetching || runMutation.isPending,
    error: query.error || runMutation.error,
    data: query.data || runMutation.data,
    runData,
  };
}

export function useRunUserSolutionWithCustomInputs(
  problemId: string | null,
  userSolution: string | null,
  language: CodeGenLanguage = "typescript",
  encryptedUserId?: string,
) {
  const [results, setResults] = useState<CustomTestResult[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const runMutation = useMutation({
    mutationFn: async ({
      id,
      code,
      customInputs,
      lang,
    }: {
      id: string;
      code: string;
      customInputs: unknown[][];
      lang: CodeGenLanguage;
    }) => {
      return runUserSolutionWithCustomInputs(
        id,
        code,
        customInputs,
        lang,
        encryptedUserId,
      );
    },
    onSuccess: (data) => {
      setResults(data);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err : new Error(String(err)));
    },
  });

  const runData = async (customInputs: unknown[][]) => {
    if (!problemId) throw new Error("Problem ID is not set");
    if (!userSolution) throw new Error("User solution is not set");
    // Clear previous error when starting a new run
    setError(null);
    return runMutation.mutateAsync({
      id: problemId,
      code: userSolution,
      customInputs,
      lang: language,
    });
  };

  return {
    isLoading: runMutation.isPending,
    error: error || runMutation.error,
    data: results,
    runData,
  };
}

export function useGenerationStatus(
  problemId: string | null,
  encryptedUserId?: string,
) {
  const query = useQuery({
    queryKey: ["generationStatus", problemId],
    queryFn: () => {
      if (!problemId) throw new Error("Problem ID is not set");
      return getGenerationStatus(problemId, encryptedUserId);
    },
    enabled: !!problemId,
    staleTime: 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "pending" || status === "in_progress") {
        return 3_000;
      }
      return false;
    },
  });

  return {
    data: query.data,
    completedSteps: (query.data?.completedSteps ?? []) as GenerationStep[],
    currentStep: query.data?.currentStep as GenerationStep | null | undefined,
    isGenerating:
      query.data?.status === "pending" || query.data?.status === "in_progress",
    isComplete: query.data?.status === "completed",
    isFailed: query.data?.status === "failed",
    error: query.data?.error,
  };
}

export function useModels(encryptedUserId?: string) {
  const query = useQuery({
    queryKey: ["models", encryptedUserId],
    queryFn: () => listModels(encryptedUserId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    isLoading: query.isLoading,
    error: query.error,
    data: query.data,
    models: query.data ?? [],
  };
}

export function useProblemModel(
  problemId: string | null,
  encryptedUserId?: string,
) {
  const query = useQuery({
    queryKey: ["problemModel", problemId],
    queryFn: () => {
      if (!problemId) throw new Error("Problem ID is not set");
      return getProblemModel(problemId, encryptedUserId);
    },
    enabled: !!problemId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    isLoading: query.isLoading,
    error: query.error,
    model: query.data ?? null,
  };
}

export function useStarterCode(
  problemId: string | null,
  language: CodeGenLanguage,
  encryptedUserId?: string,
) {
  const query = useQuery({
    queryKey: ["starterCode", problemId, language],
    queryFn: async () => {
      if (!problemId) throw new Error("Problem ID is not set");
      return getStarterCode(problemId, language, encryptedUserId);
    },
    enabled: false, // Only fetch when explicitly called
    staleTime: Infinity, // Starter code doesn't change
  });

  const getData = async () => {
    if (!problemId) return Promise.reject(new Error("Problem ID is not set"));
    return await query.refetch();
  };

  return {
    isLoading: query.isFetching,
    error: query.error,
    data: query.data,
    getData,
  };
}

export type { GenerationStep };
