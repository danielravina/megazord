"use client";

import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  DollarSign, Receipt, TrendingUp, Scale, Calendar, PiggyBank, Landmark,
  Briefcase, FileText, HandCoins, CheckSquare,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { DATA_SOURCES } from "@/components/dashboard/data-sources/sources";
import { STANDALONE_SOURCES } from "@/components/dashboard/dashboard-types";
import type { WidgetType, TimeRange } from "@/components/dashboard/dashboard-types";
import { widgetMeta } from "@/components/dashboard/widgets/widget-registry";

export interface WidgetItem {
  key: string;
  label: string;
  icon: LucideIcon;
  standalone?: boolean;
  type?: WidgetType;
  dataSource?: string;
  defaultType: WidgetType;
  defaultTimeRange: TimeRange;
}

const WIDGET_ICONS: Record<string, LucideIcon> = {
  income: DollarSign,
  expenses: Receipt,
  profit: TrendingUp,
  tax: Scale,
  "tax:upcoming": Calendar,
  savings: PiggyBank,
  "savings:pension": PiggyBank,
  "savings:hishtalmut": PiggyBank,
  "savings:gemel": PiggyBank,
  investments: Landmark,
  projects: Briefcase,
  documents: FileText,
  receivables: HandCoins,
  todos: CheckSquare,
};

const DEFAULT_TYPE: Partial<Record<string, WidgetType>> = {
  income: "hero",
  expenses: "doughnut",
  profit: "hero",
  tax: "hero",
  "tax:upcoming": "table",
  savings: "hero",
  "savings:pension": "hero",
  "savings:hishtalmut": "hero",
  "savings:gemel": "hero",
  investments: "hero",
  projects: "table",
  documents: "table",
  receivables: "hero",
  todos: "table",
};

const DEFAULT_TIME_RANGE: Partial<Record<string, TimeRange>> = {
  income: "this_month",
  expenses: "this_month",
  profit: "this_month",
  tax: "this_month",
  projects: "this_month",
  documents: "this_month",
};

export const WIDGET_ITEMS: WidgetItem[] = [
  ...DATA_SOURCES.map((s) => ({
    key: s.key,
    label: s.label,
    icon: WIDGET_ICONS[s.key] || FileText,
    defaultType: (DEFAULT_TYPE[s.key] || "hero") as WidgetType,
    defaultTimeRange: (DEFAULT_TIME_RANGE[s.key] || "all_time") as TimeRange,
  })),
  ...STANDALONE_SOURCES.map((s) => ({
    key: s.key,
    label: s.label,
    icon: widgetMeta[s.type].icon,
    standalone: true,
    type: s.type,
    dataSource: s.type === "calendar" ? "calendar:today" : undefined,
    defaultType: s.type,
    defaultTimeRange: "all_time" as TimeRange,
  })),
];

export function WidgetPicker({
  open,
  onClose,
  onSelect,
  activeKey,
  title = "וידג׳ט",
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (item: WidgetItem) => void;
  activeKey?: string;
  title?: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {WIDGET_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeKey === item.key;
          return (
            <button
              key={item.key}
              onClick={() => {
                onSelect(item);
                onClose();
              }}
              className={`relative flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 transition-colors text-center ${
                isActive
                  ? "border-blue-400 bg-blue-50/60"
                  : "border-slate-200 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              <Icon size={20} className={isActive ? "text-blue-600" : "text-slate-500"} />
              <span className="text-xs font-medium text-slate-700 leading-tight">{item.label}</span>
              {isActive && <Check size={14} className="absolute top-1.5 left-1.5 text-blue-600" />}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
