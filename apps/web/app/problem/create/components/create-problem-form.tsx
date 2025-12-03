"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FocusAreaSelector } from "@/components/focus-area-selector";
import { listModels } from "@/actions/list-models";
import { createProblem } from "@/actions/create-problem";
import { listFocusAreas } from "@/actions/list-focus-areas";
import type { FocusArea } from "@repo/api-types";

interface CreateProblemFormProps {
  encryptedUserId: string;
}

export default function CreateProblemForm({
  encryptedUserId,
}: CreateProblemFormProps) {
  const router = useRouter();
  const [models, setModels] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [autoGenerate, setAutoGenerate] = useState<boolean>(true);
  const [returnDummy, setReturnDummy] = useState<boolean>(false);
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([]);
  const [selectedFocusAreaIds, setSelectedFocusAreaIds] = useState<string[]>(
    [],
  );
  const [isLoadingFocusAreas, setIsLoadingFocusAreas] = useState(true);

  useEffect(() => {
    async function loadModels() {
      try {
        const modelsList = await listModels(encryptedUserId);
        if (!modelsList || modelsList.length === 0 || !modelsList[0]) {
          throw new Error("No models found. Please create a model first.");
        }
        setModels(modelsList);
        setSelectedModel(modelsList[0].name);
      } catch (error) {
        console.error("Failed to load models:", error);
      } finally {
        setIsLoadingModels(false);
      }
    }
    loadModels();
  }, [encryptedUserId]);

  useEffect(() => {
    async function loadFocusAreas() {
      try {
        const areas = await listFocusAreas(encryptedUserId);
        setFocusAreas(areas);
      } catch (error) {
        console.error("Failed to load focus areas:", error);
      } finally {
        setIsLoadingFocusAreas(false);
      }
    }
    loadFocusAreas();
  }, [encryptedUserId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedModel) {
      alert("Please select a model.");
      return;
    }

    setIsCreating(true);

    try {
      // Create problem with selected model
      const { problemId } = await createProblem(
        selectedModel,
        encryptedUserId,
        autoGenerate,
        returnDummy,
        undefined, // startFrom
        selectedFocusAreaIds.length > 0 ? selectedFocusAreaIds : undefined,
      );
      router.push(`/problem/${problemId}`);
    } catch (error) {
      console.error("Failed to create problem:", error);
      alert("Failed to create problem. Please try again.");
      setIsCreating(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <h1 className="text-2xl font-bold mb-6">Create New Problem</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="model-select">Select Model</Label>
          {isLoadingModels ? (
            <div className="text-sm text-muted-foreground">
              Loading models...
            </div>
          ) : (
            <Select
              value={selectedModel}
              onValueChange={setSelectedModel}
              disabled={isCreating}
            >
              <SelectTrigger id="model-select" className="w-full">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.name}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-2">
          <Label>Focus Areas</Label>
          {isLoadingFocusAreas ? (
            <div className="text-sm text-muted-foreground">
              Loading focus areas...
            </div>
          ) : (
            <FocusAreaSelector
              focusAreas={focusAreas}
              selectedIds={selectedFocusAreaIds}
              onChange={setSelectedFocusAreaIds}
              disabled={isCreating}
            />
          )}
          <p className="text-sm text-muted-foreground">
            Select specific focus areas or leave empty for a random topic.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="auto-generate"
            checked={autoGenerate}
            onCheckedChange={(checked) =>
              setAutoGenerate(checked === true || checked === "indeterminate")
            }
            disabled={isCreating}
          />
          <Label
            htmlFor="auto-generate"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Auto-enqueue next step
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="return-dummy"
            checked={returnDummy}
            onCheckedChange={(checked) =>
              setReturnDummy(checked === true || checked === "indeterminate")
            }
            disabled={isCreating}
          />
          <Label
            htmlFor="return-dummy"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Return dummy data
          </Label>
        </div>

        <Button
          type="submit"
          disabled={isCreating || isLoadingModels || !selectedModel}
        >
          {isCreating ? "Creating..." : "Create Problem"}
        </Button>
      </form>
    </div>
  );
}
