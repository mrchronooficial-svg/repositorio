"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "./use-session";
import type {
  DashboardLayout,
  SectionId,
  GridItem,
} from "@/app/(dashboard)/dashboard/widgets/types";
import {
  DEFAULT_LAYOUT,
  DEFAULT_GRID_LAYOUT,
  SECTION_IDS,
} from "@/app/(dashboard)/dashboard/widgets/types";

const STORAGE_PREFIX = "mrchrono-dashboard-layout-";

function getStorageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function reconcileGrid(saved: GridItem[]): GridItem[] {
  const savedIds = new Set(saved.map((item) => item.i));
  const result = [...saved];

  for (const id of SECTION_IDS) {
    if (!savedIds.has(id)) {
      const defaultItem = DEFAULT_GRID_LAYOUT.find((d) => d.i === id);
      if (defaultItem) {
        const maxY = result.reduce((max, item) => Math.max(max, item.y + item.h), 0);
        result.push({ ...defaultItem, y: maxY });
      }
    }
  }

  return result.filter((item) =>
    (SECTION_IDS as readonly string[]).includes(item.i)
  );
}

function loadLayout(userId: string): DashboardLayout {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return DEFAULT_LAYOUT;

    const parsed = JSON.parse(raw) as Partial<DashboardLayout>;

    if (!parsed.grid || !Array.isArray(parsed.grid)) {
      return DEFAULT_LAYOUT;
    }

    return {
      grid: reconcileGrid(parsed.grid),
      hiddenSections: (parsed.hiddenSections ?? []).filter((id) =>
        (SECTION_IDS as readonly string[]).includes(id)
      ),
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function saveLayout(userId: string, layout: DashboardLayout) {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(layout));
  } catch {
    // localStorage full or unavailable
  }
}

function findFreePosition(grid: GridItem[], w: number, h: number, cols: number = 8): { x: number; y: number } {
  const maxY = grid.reduce((max, item) => Math.max(max, item.y + item.h), 0);

  for (let y = 0; y <= maxY + 1; y++) {
    for (let x = 0; x <= cols - w; x++) {
      const overlaps = grid.some(
        (item) =>
          x < item.x + item.w &&
          x + w > item.x &&
          y < item.y + item.h &&
          y + h > item.y
      );
      if (!overlaps) return { x, y };
    }
  }

  return { x: 0, y: maxY };
}

export function useDashboardLayout() {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "anonymous";

  const [layout, setLayout] = useState<DashboardLayout>(DEFAULT_LAYOUT);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLayout(loadLayout(userId));
    setLoaded(true);
  }, [userId]);

  const persist = useCallback(
    (next: DashboardLayout) => {
      setLayout(next);
      saveLayout(userId, next);
    },
    [userId]
  );

  const updateGrid = useCallback(
    (newGrid: GridItem[]) => {
      setLayout((prev) => {
        const next = { ...prev, grid: newGrid };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const hideSection = useCallback(
    (id: SectionId) => {
      setLayout((prev) => {
        const next = {
          ...prev,
          hiddenSections: [...prev.hiddenSections, id],
        };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const showSection = useCallback(
    (id: SectionId) => {
      setLayout((prev) => {
        const defaultItem = DEFAULT_GRID_LAYOUT.find((d) => d.i === id);
        const w = defaultItem?.w ?? 2;
        const h = defaultItem?.h ?? 1;

        const visibleGrid = prev.grid.filter(
          (item) => !prev.hiddenSections.includes(item.i) || item.i === id
        );

        const pos = findFreePosition(visibleGrid, w, h);

        const existsInGrid = prev.grid.some((item) => item.i === id);
        const newGrid = existsInGrid
          ? prev.grid.map((item) =>
              item.i === id ? { ...item, ...pos } : item
            )
          : [...prev.grid, { i: id, x: pos.x, y: pos.y, w, h }];

        const next = {
          grid: newGrid,
          hiddenSections: prev.hiddenSections.filter((s) => s !== id),
        };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const resizeSection = useCallback(
    (id: SectionId, newW: number, newH: number) => {
      setLayout((prev) => {
        const next = {
          ...prev,
          grid: prev.grid.map((item) =>
            item.i === id ? { ...item, w: newW, h: newH } : item
          ),
        };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const resetLayout = useCallback(() => {
    persist(DEFAULT_LAYOUT);
  }, [persist]);

  const toggleEditMode = useCallback(() => {
    setIsEditMode((prev) => !prev);
  }, []);

  return {
    layout,
    isEditMode,
    loaded,
    updateGrid,
    hideSection,
    showSection,
    resizeSection,
    resetLayout,
    toggleEditMode,
  };
}
