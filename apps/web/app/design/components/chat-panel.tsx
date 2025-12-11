"use client";

import { useState, useEffect } from "react";
import { useAtomValue } from "jotai";
import { useParams } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { useDesignSessionMessages } from "@/hooks/use-design";
import {
  MessageAction,
  MessageActions,
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { useDesignChatAtom } from "../atoms/chat-atoms";
import { CopyIcon, RefreshCcwIcon } from "lucide-react";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { exportToCanvas, Excalidraw } from "@excalidraw/excalidraw";

interface ChatPanelProps {
  encryptedUserId: string;
  excalidrawAPI:
    | Parameters<
        NonNullable<React.ComponentProps<typeof Excalidraw>["excalidrawAPI"]>
      >[0]
    | null;
}

export function ChatPanel({ encryptedUserId, excalidrawAPI }: ChatPanelProps) {
  const [prompt, setPrompt] = useState("");
  const params = useParams();
  const designSessionId = (params.designId as string) ?? "";

  // Get the atom directly using the hook (must be called unconditionally)
  const chatAtom = useDesignChatAtom(designSessionId, encryptedUserId);
  const chatState = useAtomValue(chatAtom);
  // atomFamily always creates a DesignChatState, so chatState should always exist
  const { chat, encryptedUserId: userId } = chatState;

  // useChat must be called unconditionally to maintain hook order
  const { messages, status, setMessages, sendMessage, regenerate } = useChat({
    chat,
  });

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
        designMessages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          parts: msg.contentParts.map((part) => ({
            type: "text",
            text: part.text,
          })),
        })),
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

    // Export Excalidraw scene as base64 image
    if (excalidrawAPI) {
      try {
        const elements = excalidrawAPI.getSceneElements();
        const appState = excalidrawAPI.getAppState();
        const files = excalidrawAPI.getFiles();

        const canvas = await exportToCanvas({
          elements,
          appState,
          files,
          getDimensions: () => ({ width: 800, height: 600, scale: 1 }),
        });

        const base64Image = canvas.toDataURL("image/png");
        console.log("Excalidraw image (base64):", base64Image);
        await sendMessage({
          text: prompt,
          files: [
            {
              type: "file",
              filename: "excalidraw.png",
              mediaType: "image/png",
              url: base64Image,
            },
          ],
        });
      } catch (error) {
        console.error("Failed to export Excalidraw image:", error);
      }
    }
    setPrompt("");
  };

  const isDisabled =
    isLoadingMessages || status === "streaming" || status === "submitted";

  return (
    <div className="w-full h-full flex flex-col border-r border-gray-200 bg-white">
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
            {messages.map((message, i) => (
              <div key={`msg-${message.id}-${i}`}>
                {message.parts.map((part, i) => {
                  switch (part.type) {
                    case "text":
                      return (
                        <Message key={`${message.id}-${i}`} from={message.role}>
                          <MessageContent>
                            <MessageResponse>{part.text}</MessageResponse>
                          </MessageContent>
                          {message.role === "assistant" &&
                            i === messages.length - 1 && (
                              <MessageActions>
                                <MessageAction
                                  onClick={() => regenerate()}
                                  label="Retry"
                                >
                                  <RefreshCcwIcon className="size-3" />
                                </MessageAction>
                                <MessageAction
                                  onClick={() =>
                                    navigator.clipboard.writeText(part.text)
                                  }
                                  label="Copy"
                                >
                                  <CopyIcon className="size-3" />
                                </MessageAction>
                              </MessageActions>
                            )}
                        </Message>
                      );
                    case "reasoning":
                      return (
                        <Reasoning
                          key={`${message.id}-${i}`}
                          className="w-full"
                          isStreaming={
                            status === "streaming" &&
                            i === message.parts.length - 1 &&
                            message.id === messages.at(-1)?.id
                          }
                        >
                          <ReasoningTrigger />
                          <ReasoningContent>{part.text}</ReasoningContent>
                        </Reasoning>
                      );
                    default:
                      return null;
                  }
                })}
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
