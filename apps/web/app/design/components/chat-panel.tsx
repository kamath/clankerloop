"use client";

import { useState, useEffect } from "react";
import { useAtomValue } from "jotai";
import { useParams } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { UIMessage } from "ai";
import { useDesignSessionMessages } from "@/hooks/use-design";
import { MessageResponse } from "@/components/ai-elements/message";
import { useDesignChatAtom } from "../atoms/chat-atoms";
import type { DesignMessage } from "@repo/api-types";

interface ChatPanelProps {
  encryptedUserId: string;
}

export function ChatPanel({ encryptedUserId }: ChatPanelProps) {
  const [prompt, setPrompt] = useState("");
  const params = useParams();
  const designSessionId = (params.designId as string) ?? "";

  // Get the atom directly using the hook (must be called unconditionally)
  const chatAtom = useDesignChatAtom(designSessionId, encryptedUserId);
  const chatState = useAtomValue(chatAtom);
  // atomFamily always creates a DesignChatState, so chatState should always exist
  const { chat, encryptedUserId: userId } = chatState;

  // useChat must be called unconditionally to maintain hook order
  const { messages, status, setMessages, sendMessage } = useChat({ chat });

  // Load initial messages using React Query hook (must be called unconditionally)
  const {
    isLoading: isLoadingMessages,
    data: designMessages,
    error: messagesError,
  } = useDesignSessionMessages(designSessionId, userId || encryptedUserId);

  // Sync initial messages with chat when they're loaded
  // Must be called before early return to maintain hook order
  useEffect(() => {
    if (designMessages && designMessages.length > 0 && messages.length === 0) {
      setMessages(
        designMessages
          .filter(
            (
              msg
            ): msg is DesignMessage & {
              role: "user" | "assistant" | "system";
            } => msg.role !== "tool"
          )
          .map((msg) => ({
            id: msg.id,
            role: msg.role,
            parts: [{ type: "text", text: msg.content }],
          }))
      );
    }
  }, [designMessages, messages.length, setMessages]);

  // Early return after all hooks are called
  if (!designSessionId || !chat) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!prompt.trim() || isLoadingMessages) return;

    await sendMessage({
      text: prompt,
    });
    setPrompt("");
  };

  const isDisabled =
    isLoadingMessages || status === "streaming" || status === "submitted";

  return (
    <div className="w-96 h-full flex flex-col border-r border-gray-200 bg-white">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Design Assistant</h2>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoadingMessages ? (
          <div className="text-center text-gray-500">Loading messages...</div>
        ) : messagesError ? (
          <div className="text-center text-red-500">
            Failed to load messages:{" "}
            {messagesError instanceof Error
              ? messagesError.message
              : "Unknown error"}
          </div>
        ) : (
          <>
            {messages.map((message: UIMessage) => (
              <div
                key={message.id}
                className={message.role === "user" ? "text-right" : "text-left"}
              >
                <div
                  className={`inline-block max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <MessageResponse>{JSON.stringify(message)}</MessageResponse>
                  ) : (
                    <p>{JSON.stringify(message)}</p>
                  )}
                </div>
              </div>
            ))}
            {(status === "streaming" || status === "submitted") && (
              <div className="text-left">
                <div className="inline-block bg-gray-100 rounded-lg p-3">
                  <p className="text-gray-500">Thinking...</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask about design..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isDisabled}
          />
          <button
            type="submit"
            disabled={isDisabled || !prompt.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
