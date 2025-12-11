"use client";

import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";

interface DesignChatState {
  chat: Chat<UIMessage>;
  encryptedUserId: string;
}

/**
 * Atom family for Chat instances, keyed by designSessionId
 * Each session gets its own Chat instance with encryptedUserId stored
 */
export const designChatAtomFamily = atomFamily(
  (params: { designSessionId: string; encryptedUserId: string }) => {
    const { designSessionId, encryptedUserId } = params;

    // Create a new Chat instance with session-specific transport
    const chat = new Chat<UIMessage>({
      id: designSessionId,
      transport: new DefaultChatTransport({
        api: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/design/sessions/${designSessionId}/chat`,
        headers: {
          "X-API-Key": encryptedUserId,
        },
      }),
    });

    return atom<DesignChatState>({ chat, encryptedUserId });
  },
  (a, b) =>
    a.designSessionId === b.designSessionId &&
    a.encryptedUserId === b.encryptedUserId
);

/**
 * Hook to get or create a Chat atom for a design session
 */
export function useDesignChatAtom(
  designSessionId: string,
  encryptedUserId: string
) {
  return designChatAtomFamily({ designSessionId, encryptedUserId });
}
