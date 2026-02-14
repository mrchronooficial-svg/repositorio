"use client";

import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  X,
  Minus,
  Plus,
  ArrowLeftRight,
  ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SectionDimensions, SectionWidth, SectionHeight } from "./types";

const MIN_HEIGHTS: Record<SectionHeight, string | undefined> = {
  1: undefined,
  2: "16rem",
  3: "28rem",
};

interface SectionWrapperProps {
  id: string;
  isEditMode: boolean;
  dimensions: SectionDimensions;
  onHide: () => void;
  onDimensionsChange: (dims: SectionDimensions) => void;
  children: ReactNode;
}

export function SectionWrapper({
  id,
  isEditMode,
  dimensions,
  onHide,
  onDimensionsChange,
  children,
}: SectionWrapperProps) {
  const { w, h } = dimensions;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditMode });

  const canShrinkW = w > 1;
  const canGrowW = w < 4;
  const canShrinkH = h > 1;
  const canGrowH = h < 3;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${w} / span ${w}`,
    minHeight: MIN_HEIGHTS[h],
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group/section",
        isEditMode &&
          "rounded-lg border-2 border-dashed border-muted-foreground/30 p-2",
        isDragging && "opacity-50 z-50"
      )}
    >
      {isEditMode && (
        <>
          {/* Grip handle */}
          <button
            type="button"
            className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center h-8 w-6 rounded bg-muted border border-border shadow-sm cursor-grab active:cursor-grabbing opacity-0 group-hover/section:opacity-100 transition-opacity"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Top-right controls */}
          <div className="absolute -top-3 -right-1 z-10 flex items-center gap-0.5 opacity-0 group-hover/section:opacity-100 transition-opacity">
            {/* Width controls */}
            <div className="flex items-center h-6 bg-muted border border-border rounded shadow-sm">
              <button
                type="button"
                disabled={!canShrinkW}
                onClick={() =>
                  canShrinkW &&
                  onDimensionsChange({ w: (w - 1) as SectionWidth, h })
                }
                className={cn(
                  "flex items-center justify-center h-full w-5 rounded-l",
                  canShrinkW
                    ? "hover:bg-accent cursor-pointer"
                    : "opacity-40 cursor-not-allowed"
                )}
              >
                <Minus className="h-2.5 w-2.5 text-muted-foreground" />
              </button>
              <div className="flex items-center gap-px px-1 border-x border-border">
                <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
              </div>
              <button
                type="button"
                disabled={!canGrowW}
                onClick={() =>
                  canGrowW &&
                  onDimensionsChange({ w: (w + 1) as SectionWidth, h })
                }
                className={cn(
                  "flex items-center justify-center h-full w-5 rounded-r",
                  canGrowW
                    ? "hover:bg-accent cursor-pointer"
                    : "opacity-40 cursor-not-allowed"
                )}
              >
                <Plus className="h-2.5 w-2.5 text-muted-foreground" />
              </button>
            </div>

            {/* Height controls */}
            <div className="flex items-center h-6 bg-muted border border-border rounded shadow-sm">
              <button
                type="button"
                disabled={!canShrinkH}
                onClick={() =>
                  canShrinkH &&
                  onDimensionsChange({ w, h: (h - 1) as SectionHeight })
                }
                className={cn(
                  "flex items-center justify-center h-full w-5 rounded-l",
                  canShrinkH
                    ? "hover:bg-accent cursor-pointer"
                    : "opacity-40 cursor-not-allowed"
                )}
              >
                <Minus className="h-2.5 w-2.5 text-muted-foreground" />
              </button>
              <div className="flex items-center gap-px px-1 border-x border-border">
                <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
              </div>
              <button
                type="button"
                disabled={!canGrowH}
                onClick={() =>
                  canGrowH &&
                  onDimensionsChange({ w, h: (h + 1) as SectionHeight })
                }
                className={cn(
                  "flex items-center justify-center h-full w-5 rounded-r",
                  canGrowH
                    ? "hover:bg-accent cursor-pointer"
                    : "opacity-40 cursor-not-allowed"
                )}
              >
                <Plus className="h-2.5 w-2.5 text-muted-foreground" />
              </button>
            </div>

            {/* Hide */}
            <button
              type="button"
              onClick={onHide}
              className="flex items-center justify-center h-6 w-6 rounded bg-muted border border-border shadow-sm hover:bg-destructive/10 hover:border-destructive/30 cursor-pointer"
              title="Ocultar"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        </>
      )}
      {children}
    </div>
  );
}
