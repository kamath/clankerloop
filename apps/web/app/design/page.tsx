"use client";
import { useState } from "react";
import {
  Excalidraw,
  convertToExcalidrawElements,
} from "@excalidraw/excalidraw";
// import { generateShapes } from "@/lib/ai";

import "@excalidraw/excalidraw/index.css";
import { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

const ExcalidrawWrapper: React.FC = () => {
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

  return (
    <div className="w-screen h-screen flex flex-col">
      <div className="py-8 bg-black">
        {excalidrawAPI && (
          <>
            <button
              onClick={addRandomElement}
              style={{
                position: "absolute",
                top: "10px",
                left: "10px",
                zIndex: 10,
                padding: "10px 20px",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              Add Random Element
            </button>
            <button
              onClick={logElementsAsJSON}
              style={{
                position: "absolute",
                top: "10px",
                left: "200px",
                zIndex: 10,
                padding: "10px 20px",
                backgroundColor: "#2196F3",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              Log Elements as JSON
            </button>
            <div
              style={{
                position: "absolute",
                top: "10px",
                left: "400px",
                zIndex: 10,
                display: "flex",
                gap: "8px",
              }}
            >
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                placeholder="Describe a diagram..."
                style={{
                  padding: "10px 16px",
                  borderRadius: "5px",
                  border: "1px solid #ccc",
                  fontSize: "14px",
                  width: "300px",
                }}
                disabled={isGenerating}
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                style={{
                  padding: "10px 20px",
                  backgroundColor: isGenerating ? "#ccc" : "#9C27B0",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: isGenerating ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                {isGenerating ? "Generating..." : "Generate with AI"}
              </button>
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
  );
};
export default ExcalidrawWrapper;
