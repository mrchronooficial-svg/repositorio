"use client";

import { useRef, useEffect, useCallback } from "react";

interface SwipeContainerProps {
  activeTab: number;
  onTabChange: (index: number) => void;
  children: React.ReactNode[];
}

export function SwipeContainer({ activeTab, onTabChange, children }: SwipeContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingProgrammatically = useRef(false);

  // Sync scroll when activeTab changes programmatically
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    isScrollingProgrammatically.current = true;
    el.scrollTo({ left: activeTab * el.clientWidth, behavior: "smooth" });
    // Reset flag after scroll animation completes
    const timeout = setTimeout(() => {
      isScrollingProgrammatically.current = false;
    }, 400);
    return () => clearTimeout(timeout);
  }, [activeTab]);

  // Detect user-initiated scroll (swipe) to update active tab
  const handleScrollEnd = useCallback(() => {
    if (isScrollingProgrammatically.current) return;
    const el = containerRef.current;
    if (!el) return;
    const newIndex = Math.round(el.scrollLeft / el.clientWidth);
    if (newIndex !== activeTab) {
      onTabChange(newIndex);
    }
  }, [activeTab, onTabChange]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let scrollTimeout: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScrollEnd, 100);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      clearTimeout(scrollTimeout);
    };
  }, [handleScrollEnd]);

  return (
    <div
      ref={containerRef}
      className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {children.map((child, i) => (
        <div key={i} className="w-screen min-w-[100vw] shrink-0 snap-start">
          {child}
        </div>
      ))}
    </div>
  );
}
