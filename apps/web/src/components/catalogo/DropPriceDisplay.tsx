"use client";

import { formatarPreco } from "@/lib/catalogo/price";

interface DropPriceDisplayProps {
  dropPrice: number;
  originalPrice: number;
  isSold: boolean;
}

export function DropPriceDisplay({ dropPrice, originalPrice, isSold }: DropPriceDisplayProps) {
  const hasDiscount = dropPrice < originalPrice;

  if (isSold) {
    return (
      <div>
        <p className="text-lg font-bold text-gray-400 line-through">
          {formatarPreco(dropPrice)}
        </p>
      </div>
    );
  }

  if (hasDiscount) {
    return (
      <div>
        <p className="text-sm text-[#0a1628]/40 line-through">
          {formatarPreco(originalPrice)}
        </p>
        <div className="flex items-center gap-2">
          <p className="text-xl font-bold text-emerald-600">
            {formatarPreco(dropPrice)}
          </p>
          <span className="text-[10px] font-medium bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
            Preço Drop
          </span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-lg font-bold text-[#0a1628]">
        {formatarPreco(dropPrice)}
      </p>
    </div>
  );
}
