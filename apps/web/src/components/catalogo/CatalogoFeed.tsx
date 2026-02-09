"use client";

import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { WatchCard } from "./WatchCard";
import { WatchCardSkeleton } from "./WatchCardSkeleton";
import { EmptyState } from "./EmptyState";

interface CatalogoFeedProps {
  marca?: string;
  precoMin?: number;
  precoMax?: number;
}

export function CatalogoFeed({ marca, precoMin, precoMax }: CatalogoFeedProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery(
    trpc.catalogo.listarPecas.infiniteQueryOptions(
      { limit: 12, marca, precoMin, precoMax },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    )
  );

  // Intersection Observer para infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allItems = data?.pages.flatMap((page) => page.items) ?? [];
  const isFiltered = !!(marca || precoMin !== undefined || precoMax !== undefined);

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <WatchCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (allItems.length === 0) {
    return <EmptyState isFiltered={isFiltered} />;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {allItems.map((peca, index) => (
          <WatchCard key={peca.id} peca={peca} index={index} />
        ))}
      </div>

      {/* Sentinel para infinite scroll */}
      <div ref={sentinelRef} className="h-1" />

      {/* Loading more */}
      {isFetchingNextPage && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <WatchCardSkeleton key={`loading-${i}`} />
          ))}
        </div>
      )}

      {/* End of results */}
      {!hasNextPage && allItems.length > 0 && (
        <p
          className="text-center text-xs text-[#0a1628]/30 mt-8 pb-4"
          style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
        >
          Fim do catálogo
        </p>
      )}
    </div>
  );
}
