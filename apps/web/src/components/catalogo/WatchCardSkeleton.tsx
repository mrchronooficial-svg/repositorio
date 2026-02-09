"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function WatchCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[#0a1628]/[0.06] overflow-hidden">
      {/* Foto skeleton */}
      <Skeleton className="aspect-square w-full rounded-none" />

      {/* Info skeleton */}
      <div className="p-4 space-y-3">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-3/4 rounded" />
          <Skeleton className="h-3 w-1/2 rounded" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-5 w-1/3 rounded" />
          <Skeleton className="h-3 w-2/5 rounded" />
        </div>
      </div>
    </div>
  );
}
