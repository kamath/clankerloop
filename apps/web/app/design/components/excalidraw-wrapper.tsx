"use client";
import { useState } from "react";
import {
  Excalidraw,
  convertToExcalidrawElements,
} from "@excalidraw/excalidraw";
// import { generateShapes } from "@/lib/ai";

import "@excalidraw/excalidraw/index.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientFacingUserObject } from "@/lib/auth-types";
import { AppHeader } from "@/components/app-header";
import { ChatPanel } from "./chat-panel";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

interface ExcalidrawWrapperProps {
  encryptedUserId: string;
  user: ClientFacingUserObject;
}

export default function ExcalidrawWrapper({
  encryptedUserId,
  user,
}: ExcalidrawWrapperProps) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<
    | Parameters<
        NonNullable<React.ComponentProps<typeof Excalidraw>["excalidrawAPI"]>
      >[0]
    | null
  >(null);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

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
      //   const currentElements = excalidrawAPI.getSceneElements();
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

  return (
    <div className="w-screen h-screen flex flex-col">
      <AppHeader user={user} />
      <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
        {/* Chat panel - left side */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
          <ChatPanel encryptedUserId={encryptedUserId} />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Excalidraw canvas - right side */}
        <ResizablePanel defaultSize={70} minSize={50}>
          <div className="flex flex-col h-full">
            <div className="bg-black flex gap-2 p-4">
              {excalidrawAPI && (
                <>
                  <Button onClick={addRandomElement}>Add Random Element</Button>
                  <Button onClick={logElementsAsJSON}>
                    Log Elements as JSON
                  </Button>
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
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
