"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDesignSessionMessages } from "@/actions/get-design-session-messages";
import { createDesignSession } from "@/actions/create-design-session";
import { listDesignSessions } from "@/actions/list-design-sessions";

/**
 * Hook to fetch design session messages
 */
export function useDesignSessionMessages(
  sessionId: string | null,
  encryptedUserId?: string,
) {
  const queryKey = ["designSessionMessages", sessionId];

  const query = useQuery({
    queryKey,
    queryFn: () => {
      if (!sessionId) throw new Error("Session ID is not set");
      return getDesignSessionMessages(sessionId, encryptedUserId);
    },
    enabled: !!sessionId,
    staleTime: 30 * 1000, // 30 seconds
  });

  return {
    isLoading: query.isLoading,
    error: query.error,
    data: query.data,
    messages: query.data ?? [],
    refetch: query.refetch,
  };
}

/**
 * Hook to create a new design session
 */
export function useCreateDesignSession(encryptedUserId?: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!encryptedUserId) {
        throw new Error("Encrypted user ID is required to create a session");
      }
      return createDesignSession(encryptedUserId);
    },
    onSuccess: () => {
      // Invalidate the sessions list query to refetch after creating
      queryClient.invalidateQueries({ queryKey: ["designSessions"] });
    },
  });

  return {
    isLoading: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    createSession: mutation.mutateAsync,
  };
}

/**
 * Hook to list all design sessions for the current user
 */
export function useDesignSessions(encryptedUserId?: string) {
  const query = useQuery({
    queryKey: ["designSessions", encryptedUserId],
    queryFn: () => listDesignSessions(encryptedUserId),
    enabled: !!encryptedUserId,
    staleTime: 30 * 1000, // 30 seconds
  });

  return {
    isLoading: query.isLoading,
    error: query.error,
    data: query.data,
    sessions: query.data ?? [],
    refetch: query.refetch,
  };
}
