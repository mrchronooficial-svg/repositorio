import { cn } from "@/lib/utils";
import {
  STATUS_PECA_LABELS,
  STATUS_PECA_COLORS,
  STATUS_PAGAMENTO_LABELS,
  STATUS_PAGAMENTO_COLORS,
  STATUS_REPASSE_LABELS,
  STATUS_REPASSE_COLORS,
  STATUS_ENVIO_LABELS,
  STATUS_ENVIO_COLORS,
  SCORE_LABELS,
  SCORE_COLORS,
} from "@/lib/constants";

type StatusType = "peca" | "pagamento" | "repasse" | "envio" | "score";

interface StatusBadgeProps {
  type: StatusType;
  status: string;
  size?: "sm" | "md";
}

const labelsMap: Record<StatusType, Record<string, string>> = {
  peca: STATUS_PECA_LABELS,
  pagamento: STATUS_PAGAMENTO_LABELS,
  repasse: STATUS_REPASSE_LABELS,
  envio: STATUS_ENVIO_LABELS,
  score: SCORE_LABELS,
};

const colorsMap: Record<StatusType, Record<string, string>> = {
  peca: STATUS_PECA_COLORS,
  pagamento: STATUS_PAGAMENTO_COLORS,
  repasse: STATUS_REPASSE_COLORS,
  envio: STATUS_ENVIO_COLORS,
  score: SCORE_COLORS,
};

export function StatusBadge({ type, status, size = "md" }: StatusBadgeProps) {
  const labels = labelsMap[type];
  const colors = colorsMap[type];

  const label = labels[status] || status;
  const color = colors[status] || "bg-gray-100 text-gray-800";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        color,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-0.5 text-sm"
      )}
    >
      {label}
    </span>
  );
}
