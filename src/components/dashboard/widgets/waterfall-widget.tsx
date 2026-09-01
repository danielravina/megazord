"use client";

import { formatCurrency } from "@/components/shared/format-currency";
import type { WaterfallData, WaterfallStep } from "@/components/dashboard/dashboard-types";

interface Props {
  data: unknown;
  tile: { id: string; type: string; span: number; title?: string };
}

function stepClasses(step: WaterfallStep): string {
  switch (step.kind) {
    case "income":
      return "text-emerald-700";
    case "deduction":
      return "text-slate-500";
    case "subtotal":
      return "text-slate-800 font-semibold border-t border-slate-100 pt-1";
    case "result":
      return "";
  }
}

export function WaterfallWidget({ data, tile }: Props) {
  const d = data as WaterfallData | null;

  if (!d || !Array.isArray(d.steps) || d.steps.length === 0) {
    return (
      <div className="flex flex-col h-full">
        {tile.title && <div className="text-xs font-bold text-slate-500 mb-2">{tile.title}</div>}
        <div className="flex items-center justify-center flex-1 text-slate-400 text-sm">אין נתונים להצגה</div>
      </div>
    );
  }

  const { balanceDue } = d;
  const isRefund = balanceDue < 0;
  const isDebt = balanceDue > 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      {tile.title && <div className="text-xs font-bold text-slate-500 mb-2">{tile.title}</div>}
      <div className="overflow-auto flex-1 space-y-0.5 text-xs" dir="rtl">
        {d.steps.map((step, i) => (
          <div data-testid={`wf-step-${i}`} key={i} className={`flex justify-between items-center gap-2 ${stepClasses(step)}`}>
            <span className="whitespace-nowrap text-slate-600">
              {step.label}
              {step.hint && <span className="text-[10px] text-slate-400"> • {step.hint}</span>}
            </span>
            <span data-testid="wf-value" className="font-bold text-left whitespace-nowrap">
              {step.kind === "deduction" && step.value > 0 ? `−${formatCurrency(step.value)}` : formatCurrency(step.value)}
            </span>
          </div>
        ))}

        <div data-testid="wf-balance" className="border-t-2 border-slate-200 mt-1 pt-1.5">
          {isRefund ? (
            <div className="flex justify-between items-center gap-2 text-emerald-700">
              <span className="font-bold">= יתרה סופית: זכאי להחזר</span>
              <span className="font-bold text-left">{formatCurrency(Math.abs(balanceDue))}</span>
            </div>
          ) : isDebt ? (
            <div className="flex justify-between items-center gap-2 text-rose-700">
              <span className="font-bold">= יתרה סופית: לתשלום</span>
              <span className="font-bold text-left">{formatCurrency(balanceDue)}</span>
            </div>
          ) : (
            <div className="flex justify-between items-center gap-2 text-slate-600">
              <span className="font-bold">= יתרה סופית: מאוזן</span>
              <span className="font-bold text-left">{formatCurrency(0)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}