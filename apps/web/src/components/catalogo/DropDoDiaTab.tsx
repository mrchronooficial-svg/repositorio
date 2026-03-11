"use client";

import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { DropCountdown } from "./DropCountdown";
import { DropActive } from "./DropActive";
import { DropCompleted } from "./DropCompleted";
import { DropEmpty } from "./DropEmpty";

export function DropDoDiaTab() {
  const { data, isLoading } = useQuery(
    trpc.drop.getCurrent.queryOptions(undefined, {
      refetchInterval: 8000,
    })
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <DropEmpty />;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = data as any;
  const drop = result.drop;
  const nextDrop = result.nextDrop;

  // No active drop, but there's a scheduled one → countdown
  if (!drop && nextDrop) {
    return <DropCountdown launchDateTime={nextDrop.launchDateTime} launchTime={nextDrop.launchTime} />;
  }

  // No drop at all
  if (!drop) {
    return <DropEmpty />;
  }

  // Active drop with items
  if (drop.status === "ACTIVE") {
    return <DropActive drop={drop} nextDrop={nextDrop} />;
  }

  // Completed drop
  if (drop.status === "COMPLETED") {
    return <DropCompleted drop={drop} nextDrop={nextDrop} />;
  }

  // Scheduled drop (show countdown) — shouldn't normally happen since getCurrent lazy-transitions
  if (drop.status === "SCHEDULED" && drop.launchDateTime) {
    return <DropCountdown launchDateTime={drop.launchDateTime} launchTime={drop.launchTime} />;
  }

  return <DropEmpty />;
}
