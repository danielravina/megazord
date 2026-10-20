"use client";

import { TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { formatCurrencyShort } from "@/components/shared/format-currency";
import { TIME_RANGE_LABELS } from "@/components/dashboard/dashboard-types";
import type { HeroData, TimeRange } from "@/components/dashboard/dashboard-types";

interface Props {
  data: unknown;
  tile: { id: string; type: string; span: number; title?: string; timeRange?: TimeRange; dataSource?: string };
}

// סרטים עדינים במקום תצוגת אפס סתמית — מילת חיבור שמסבירה איך "מכניסים" נתונים לטייל
const EMPTY_HINTS: Record<string, string> = {
  income: "מצב סר של מתחילים. הוסיפו חשבונית או הכנסה ראשונה דרך סריקה/ניהול כספים",
  expenses: "תת מלא — סרקו קבלה ראשונה והוא יתחיל להתמלא",
  profit: "מתמלא אוטומטית מהרגע שיש הכנסות והוצאות",
  tax: "יחושב אוטומטית לפי ההכנסות וההגדרות שלך",
  todos: "הוסיפו פתק ראשון בדף הפתקים",
  documents: "הוסיפו מסמך ראשון דרך סריקה חכמה",
  savings: "תסייע לחיסכון הראשון — הוסיפו בניהול הכספים",
};

function emptyHintFor(tile: Props["tile"]): string | undefined {
  const source = (tile.dataSource || "").split(":")[0];
  return EMPTY_HINTS[source];
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

  const hint = d.value === 0 ? emptyHintFor(tile) : undefined;

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[80px] gap-1">
      {tile.title && (
        <div className="text-xs font-bold text-slate-500">{tile.title}</div>
      )}
      <div
        className={`text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight ${
          hint ? "text-slate-300" : "text-slate-800"
        }`}
      >
        {formatCurrencyShort(d.value)}
      </div>
      <div className="text-xs text-slate-500">{TIME_RANGE_LABELS[tile.timeRange || "this_month"]}</div>
      {d.trend && (
        <div className={`flex items-center gap-1 text-xs font-semibold ${d.trend.direction === "up" ? "text-emerald-600" : d.trend.direction === "down" ? "text-rose-600" : "text-slate-400"}`}>
          {d.trend.direction === "up" ? <TrendingUp size={14} /> : d.trend.direction === "down" ? <TrendingDown size={14} /> : null}
          {d.trend.direction !== "neutral" && `${d.trend.direction === "up" ? "+" : ""}${d.trend.percent}%`}
        </div>
      )}
      {hint && (
        <div className="flex items-center gap-1.5 mt-1 max-w-[220px] text-center">
          <Sparkles size={12} className="text-blue-300 shrink-0" />
          <span className="text-[11px] leading-snug text-slate-400">{hint}</span>
        </div>
      )}
    </div>
  );
}
