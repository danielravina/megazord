"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Globe } from "lucide-react";

interface IndexData {
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

// Free API via Yahoo Finance proxy
async function fetchIndices(): Promise<IndexData[]> {
  const symbols = [
    { name: "TA-125", symbol: "^TA125.TA" },
    { name: "S&P 500", symbol: "^GSPC" },
  ];

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbols.map((s) => s.symbol).join(",")}?range=1d&interval=1d`
    );
    if (!res.ok) throw new Error("Failed to fetch");
    const json = await res.json();
    const result = json.chart?.result;
    if (!result) throw new Error("No data");

    return result.map((r: any, i: number) => {
      const meta = r.meta;
      const prevClose = meta.chartPreviousClose || meta.regularMarketPreviousClose || 0;
      const current = meta.regularMarketPrice || 0;
      const change = current - prevClose;
      const changePercent = prevClose ? (change / prevClose) * 100 : 0;
      return {
        name: symbols[i].name,
        value: current,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
      };
    });
  } catch {
    return [];
  }
}

export function MarketIndicesWidget() {
  const [indices, setIndices] = useState<IndexData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchIndices()
      .then((data) => {
        setIndices(data);
        setError(data.length === 0);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (error || indices.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 flex items-center gap-3 h-16 shrink-0">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <Globe size={14} />
        מדדים
      </div>
      {indices.map((idx) => (
        <div key={idx.name} className="flex items-center gap-1.5 text-xs">
          <span className="font-semibold text-slate-700">{idx.name}</span>
          <span className="tabular-nums">{idx.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className={`flex items-center gap-0.5 tabular-nums ${idx.change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {idx.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {idx.changePercent > 0 ? "+" : ""}{idx.changePercent}%
          </span>
        </div>
      ))}
    </div>
  );
}
