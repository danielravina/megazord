"use client";

import { Modal } from "@/components/ui/modal";
import type { DashboardTile, WidgetType, TimeRange } from "@/components/dashboard/dashboard-types";
import {
  Hash, Table2, BarChart3, PieChart, Calculator, Clock, CloudSun, CalendarDays,
  DollarSign, Receipt, TrendingUp, Scale, PiggyBank, Briefcase,
  FileText, CheckSquare, Calendar, Landmark,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface TileTemplate {
  key: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  tile: Omit<DashboardTile, "id">;
}

const TEMPLATES: TileTemplate[] = [
  { key: "income:total", label: "סה״כ הכנסות", icon: DollarSign, tile: { type: "hero", dataSource: "income:total", timeRange: "this_month", span: 1 } },
  { key: "income:recent", label: "הכנסות אחרונות", icon: Table2, tile: { type: "table", dataSource: "income:recent", timeRange: "this_month", span: 2 } },
  { key: "income:chart", label: "מגמת הכנסות", icon: TrendingUp, tile: { type: "bar", dataSource: "income:by_month", timeRange: "this_year", span: 2 } },
  { key: "expenses:total", label: "סה״כ הוצאות", icon: Receipt, tile: { type: "hero", dataSource: "expenses:total", timeRange: "this_month", span: 1 } },
  { key: "expenses:by_category", label: "הוצאות לפי קטגוריה", icon: PieChart, tile: { type: "doughnut", dataSource: "expenses:by_category", timeRange: "this_month", span: 2 } },
  { key: "expenses:chart", label: "מגמת הוצאות", icon: BarChart3, tile: { type: "bar", dataSource: "expenses:by_month", timeRange: "this_year", span: 2 } },
  { key: "profit:net", label: "רווח נטו", icon: DollarSign, tile: { type: "hero", dataSource: "profit:net", timeRange: "this_month", span: 1 } },
  { key: "profit:cashflow", label: "תזרים מזומנים", icon: BarChart3, tile: { type: "bar", dataSource: "profit:cashflow", timeRange: "this_year", span: 2 } },
  { key: "tax:estimate", label: "חבות מס", icon: Scale, tile: { type: "hero", dataSource: "tax:estimate", timeRange: "this_month", span: 1 } },
  { key: "tax:upcoming", label: "תשלומים קרובים", icon: Calendar, tile: { type: "table", dataSource: "tax:upcoming", timeRange: "all_time" as TimeRange, span: 2 } },
  { key: "savings:total", label: "סה״כ חסכונות", icon: PiggyBank, tile: { type: "hero", dataSource: "savings:total", timeRange: "all_time" as TimeRange, span: 1 } },
  { key: "savings:by_fund", label: "פירוט חסכונות", icon: PieChart, tile: { type: "doughnut", dataSource: "savings:by_fund", timeRange: "all_time" as TimeRange, span: 2 } },
  { key: "savings:pension", label: "פנסיה", icon: PiggyBank, tile: { type: "hero", dataSource: "savings:pension", timeRange: "all_time" as TimeRange, span: 1 } },
  { key: "investments:total", label: "השקעות בציוד", icon: Landmark, tile: { type: "hero", dataSource: "investments:total", timeRange: "all_time" as TimeRange, span: 1 } },
  { key: "documents:recent", label: "מסמכים אחרונים", icon: FileText, tile: { type: "table", dataSource: "documents:recent", timeRange: "this_month", span: 2 } },
  { key: "projects:recent", label: "פרויקטים אחרונים", icon: Briefcase, tile: { type: "table", dataSource: "projects:recent", timeRange: "this_month", span: 2 } },
  { key: "todos:open", label: "משימות פתוחות", icon: CheckSquare, tile: { type: "table", dataSource: "todos:open", timeRange: "all_time" as TimeRange, span: 2 } },
  { key: "events:upcoming", label: "אירועים קרובים", icon: Calendar, tile: { type: "table", dataSource: "events:upcoming", timeRange: "all_time" as TimeRange, span: 2 } },
  { key: "calendar", label: "יומן", icon: CalendarDays, tile: { type: "calendar" as WidgetType, dataSource: "calendar:today", span: 1 } },
  { key: "calculator", label: "מחשבון", icon: Calculator, tile: { type: "calculator" as WidgetType, span: 1 } },
  { key: "clock", label: "שעון", icon: Clock, tile: { type: "clock" as WidgetType, span: 1 } },
  { key: "weather", label: "מזג אוויר", icon: CloudSun, tile: { type: "weather" as WidgetType, span: 1 } },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (tile: DashboardTile) => void;
}

export function AddTilePicker({ open, onClose, onAdd }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="מה תרצה לראות?"
      size="sm"
    >
      <div className="grid grid-cols-1 gap-1">
        {TEMPLATES.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => {
                onAdd({ ...t.tile, id: "" } as DashboardTile);
                onClose();
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-right"
            >
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <Icon size={18} className="text-slate-600" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-800">{t.label}</div>
                {t.description && (
                  <div className="text-xs text-slate-400 truncate">{t.description}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
