"use client";

import type { ReactNode } from "react";
import {
  GripVertical,
  X,
  Minus,
  Plus,
  ArrowLeftRight,
  ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_W = 8;
const MIN_W = 1;
const MAX_H = 4;
const MIN_H = 1;

interface SectionWrapperProps {
  id: string;
  isEditMode: boolean;
  w: number;
  h: number;
  onHide: () => void;
  onResize: (w: number, h: number) => void;
  children: ReactNode;
}

export function SectionWrapper({
  id,
  isEditMode,
  w,
  h,
  onHide,
  onResize,
  children,
}: SectionWrapperProps) {
  const canShrinkW = w > MIN_W;
  const canGrowW = w < MAX_W;
  const canShrinkH = h > MIN_H;
  const canGrowH = h < MAX_H;

  return (
    <div
      className={cn(
        "relative group/section h-full",
        isEditMode &&
          "rounded-lg border-2 border-dashed border-muted-foreground/30 p-2"
      )}
    >
      {isEditMode && (
        <>
          {/* Grip handle for drag */}
          <div
            className="drag-handle absolute -left-1 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center h-8 w-6 rounded bg-muted border border-border shadow-sm cursor-grab active:cursor-grabbing opacity-0 group-hover/section:opacity-100 transition-opacity"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Top-right controls */}
          <div className="absolute -top-3 -right-1 z-10 flex items-center gap-0.5 opacity-0 group-hover/section:opacity-100 transition-opacity">
            {/* Width controls */}
            <div className="flex items-center h-6 bg-muted border border-border rounded shadow-sm">
              <button
                type="button"
                disabled={!canShrinkW}
                onClick={() => canShrinkW && onResize(w - 1, h)}
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
                onClick={() => canGrowW && onResize(w + 1, h)}
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
                onClick={() => canShrinkH && onResize(w, h - 1)}
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
                onClick={() => canGrowH && onResize(w, h + 1)}
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
