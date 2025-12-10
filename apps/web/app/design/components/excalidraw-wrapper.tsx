"use client";
import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  Excalidraw,
  convertToExcalidrawElements,
} from "@excalidraw/excalidraw";
import { MessageResponse } from "@/components/ai-elements/message";
// import { generateShapes } from "@/lib/ai";

import "@excalidraw/excalidraw/index.css";
import { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { DefaultChatTransport, UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ExcalidrawWrapperProps {
  encryptedUserId: string;
}

export default function ExcalidrawWrapper({
  encryptedUserId,
}: ExcalidrawWrapperProps) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<
    | Parameters<
        NonNullable<React.ComponentProps<typeof Excalidraw>["excalidrawAPI"]>
      >[0]
    | null
  >(null);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // AI SDK UI's useChat hook
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/design/chat`,
      headers: {
        "X-API-Key": encryptedUserId,
      },
    }),
  });
  const initialElements = convertToExcalidrawElements([
    {
      type: "rectangle",
      x: 100,
      y: 250,
    },
    {
      type: "ellipse",
      x: 250,
      y: 250,
    },
    {
      type: "diamond",
      x: 380,
      y: 250,
    },
  ]);

  const addRandomElement = () => {
    if (!excalidrawAPI) return;

    const elementTypes = ["rectangle", "ellipse", "diamond"] as const;

    const randomIndex = Math.floor(Math.random() * elementTypes.length);
    const randomType = elementTypes[randomIndex];

    if (!randomType) return; // Type guard to ensure randomType is defined

    // Generate random position (assuming canvas viewport is roughly 800x600)
    const randomX = Math.random() * 600 + 50;
    const randomY = Math.random() * 400 + 50;

    const newElement = convertToExcalidrawElements([
      {
        type: randomType,
        x: randomX,
        y: randomY,
      },
    ]);

    // Get current elements and add the new one
    const currentElements = excalidrawAPI.getSceneElements();
    excalidrawAPI.updateScene({
      elements: [...currentElements, ...newElement],
    });
  };

  const logElementsAsJSON = () => {
    if (!excalidrawAPI) return;

    const elements = excalidrawAPI.getSceneElements();
    console.log(JSON.stringify(elements, null, 2));
  };

  const handleGenerate = async () => {
    if (!excalidrawAPI || !prompt.trim()) return;

    setIsGenerating(true);
    try {
      const currentElements = excalidrawAPI.getSceneElements();
      //   const newElements = await generateShapes(prompt, [...currentElements]);
      // Cast to expected type - schema ensures valid structure
      //   const convertedElements = convertToExcalidrawElements(
      //     newElements as Parameters<typeof convertToExcalidrawElements>[0]
      //   );
      //   excalidrawAPI.updateScene({
      //     elements: [...currentElements, ...convertedElements],
      //   });
      setPrompt("");
    } catch (error) {
      console.error("Generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await sendMessage({
      text: prompt,
    });
  };
  return (
    <div className="w-screen h-screen flex">
      {/* Chat panel - left side */}
      <div className="w-96 h-full flex flex-col border-r border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Design Assistant</h2>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
              disabled={status === "streaming" || status === "submitted"}
            />
            <button
              type="submit"
              disabled={
                status === "streaming" ||
                status === "submitted" ||
                !prompt.trim()
              }
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </form>
      </div>

      {/* Excalidraw canvas - right side */}
      <div className="flex-1 flex flex-col">
        <div className="bg-black flex gap-2 p-4">
          {excalidrawAPI && (
            <>
              <Button onClick={addRandomElement}>Add Random Element</Button>
              <Button onClick={logElementsAsJSON}>Log Elements as JSON</Button>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                  placeholder="Describe a diagram..."
                  disabled={isGenerating}
                />
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                >
                  {isGenerating ? "Generating..." : "Generate with AI"}
                </Button>
              </div>
            </>
          )}
        </div>
        <div className="w-full flex-1">
          <Excalidraw
            excalidrawAPI={(api) => setExcalidrawAPI(api)}
            initialData={{
              elements: initialElements,
              scrollToContent: true,
            }}
            //   viewModeEnabled={true}
          />
        </div>
      </div>
    </div>
  );
}
