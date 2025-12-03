"use client";

import { cn } from "@/lib/utils";
import type { FocusArea } from "@repo/api-types";

interface FocusAreaSelectorProps {
  focusAreas: FocusArea[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  disabled?: boolean;
  className?: string;
}

export function FocusAreaSelector({
  focusAreas,
  selectedIds,
  onChange,
  disabled = false,
  className,
}: FocusAreaSelectorProps) {
  const isAllSelected = selectedIds.length === 0;

  const handleToggle = (id: string) => {
    if (disabled) return;

    if (selectedIds.includes(id)) {
      // Remove from selection
      onChange(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      // Add to selection
      onChange([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (disabled) return;
    onChange([]);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSelectAll}
          disabled={disabled}
          className={cn(
            "inline-flex items-center justify-center rounded-full border px-3 py-1 text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:pointer-events-none disabled:opacity-50",
            isAllSelected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input bg-background hover:bg-accent hover:text-accent-foreground",
          )}
        >
          All (Random)
        </button>
        {focusAreas.map((focusArea) => {
          const isSelected = selectedIds.includes(focusArea.id);
          return (
            <button
              key={focusArea.id}
              type="button"
              onClick={() => handleToggle(focusArea.id)}
              disabled={disabled}
              title={focusArea.description || undefined}
              className={cn(
                "inline-flex items-center justify-center rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:pointer-events-none disabled:opacity-50",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {focusArea.name}
            </button>
          );
        })}
      </div>
      {selectedIds.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {selectedIds.length} focus area{selectedIds.length !== 1 ? "s" : ""}{" "}
          selected
        </p>
      )}
    </div>
  );
}
