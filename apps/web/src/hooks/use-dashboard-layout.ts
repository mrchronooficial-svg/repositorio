"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "./use-session";
import type {
  DashboardLayout,
  SectionId,
  SectionDimensions,
} from "@/app/(dashboard)/dashboard/widgets/types";
import {
  DEFAULT_LAYOUT,
  SECTION_IDS,
} from "@/app/(dashboard)/dashboard/widgets/types";

const STORAGE_PREFIX = "mrchrono-dashboard-layout-";

function getStorageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function reconcileOrder<T extends string>(
  saved: T[],
  defaults: readonly T[]
): T[] {
  const result: T[] = [];
  const seen = new Set<T>();

  for (const id of saved) {
    if ((defaults as readonly T[]).includes(id) && !seen.has(id)) {
      result.push(id);
      seen.add(id);
    }
  }

  for (const id of defaults) {
    if (!seen.has(id)) {
      result.push(id);
      seen.add(id);
    }
  }

  return result;
}

function loadLayout(userId: string): DashboardLayout {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return DEFAULT_LAYOUT;

    const parsed = JSON.parse(raw) as Partial<DashboardLayout>;
    return {
      sectionOrder: reconcileOrder(
        parsed.sectionOrder ?? [],
        SECTION_IDS
      ),
      hiddenSections: (parsed.hiddenSections ?? []).filter((id) =>
        (SECTION_IDS as readonly string[]).includes(id)
      ),
      sectionDimensions: parsed.sectionDimensions ?? {},
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

  const updateSectionOrder = useCallback(
    (newOrder: SectionId[]) => {
      setLayout((prev) => {
        const next = { ...prev, sectionOrder: newOrder };
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
        const next = {
          ...prev,
          hiddenSections: prev.hiddenSections.filter((s) => s !== id),
        };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const setSectionDimensions = useCallback(
    (id: SectionId, dims: SectionDimensions) => {
      setLayout((prev) => {
        const next = {
          ...prev,
          sectionDimensions: { ...prev.sectionDimensions, [id]: dims },
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
    updateSectionOrder,
    hideSection,
    showSection,
    setSectionDimensions,
    resetLayout,
    toggleEditMode,
  };
}
