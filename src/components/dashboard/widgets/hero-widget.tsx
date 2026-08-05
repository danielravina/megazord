"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrencyShort } from "@/components/shared/format-currency";
import { TIME_RANGE_LABELS } from "@/components/dashboard/dashboard-types";
import type { HeroData, TimeRange } from "@/components/dashboard/dashboard-types";

interface Props {
  data: unknown;
  tile: { id: string; type: string; span: number; title?: string; timeRange?: TimeRange };
}

export function HeroWidget({ data, tile }: Props) {
  const d = data as HeroData | null;

  if (!d || d.value === undefined) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[80px] text-slate-400 text-sm">
        --
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[80px] gap-1">
      {tile.title && (
        <div className="text-xs font-bold text-slate-500">{tile.title}</div>
      )}
      <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-800 tracking-tight">
        {formatCurrencyShort(d.value)}
      </div>
      <div className="text-xs text-slate-500">{TIME_RANGE_LABELS[tile.timeRange || "this_month"]}</div>
      {d.sublabel && <div className="text-[10px] text-slate-400">{d.sublabel}</div>}
      {d.trend && (
        <div className={`flex items-center gap-1 text-xs font-semibold ${d.trend.direction === "up" ? "text-emerald-600" : d.trend.direction === "down" ? "text-rose-600" : "text-slate-400"}`}>
          {d.trend.direction === "up" ? <TrendingUp size={14} /> : d.trend.direction === "down" ? <TrendingDown size={14} /> : null}
          {d.trend.direction !== "neutral" && `${d.trend.direction === "up" ? "+" : ""}${d.trend.percent}%`}
        </div>
      )}
    </div>
  );
}
