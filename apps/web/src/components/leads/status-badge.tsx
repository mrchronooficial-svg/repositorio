import { STATUS_MAP, type StatusLead } from "./constants";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: StatusLead;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const info = STATUS_MAP[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
        info.badgeClass,
        className,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", info.dot)} />
      {info.label}
    </span>
  );
}
