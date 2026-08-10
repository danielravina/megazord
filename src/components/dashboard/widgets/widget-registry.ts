import type { WidgetType } from "@/components/dashboard/dashboard-types";
import {
  Hash, Table2, BarChart3, LineChart, PieChart, Calculator, Clock, CloudSun, CalendarDays,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { HeroWidget } from "./hero-widget";
import { TableWidget } from "./table-widget";
import { BarChartWidget } from "./bar-chart-widget";
import { LineChartWidget } from "./line-chart-widget";
import { DoughnutChartWidget } from "./doughnut-chart-widget";
import { CalculatorWidget } from "./calculator-widget";
import { ClockWidget } from "./clock-widget";
import { WeatherWidget } from "./weather-widget";
import { CalendarWidget } from "./calendar-widget";

export const widgetRegistry: Record<WidgetType, React.ComponentType<{ data: unknown; tile: { id: string; type: string; span: number; title?: string } }>> = {
  hero: HeroWidget,
  table: TableWidget,
  bar: BarChartWidget,
  timeline: LineChartWidget,
  doughnut: DoughnutChartWidget,
  calculator: CalculatorWidget,
  clock: ClockWidget,
  weather: WeatherWidget,
  calendar: CalendarWidget,
};

export const widgetMeta: Record<WidgetType, { label: string; icon: LucideIcon; spanLocked: boolean }> = {
  hero:      { label: "מספר גדול",  icon: Hash,        spanLocked: false },
  table:     { label: "טבלה",       icon: Table2,       spanLocked: false },
  bar:       { label: "גרף עמודות", icon: BarChart3,    spanLocked: false },
  timeline:  { label: "גרף מגמה",   icon: LineChart,    spanLocked: false },
  doughnut:  { label: "גרף עוגה",   icon: PieChart,     spanLocked: false },
  calculator:{ label: "מחשבון",     icon: Calculator,   spanLocked: true },
  clock:     { label: "שעון",       icon: Clock,         spanLocked: true },
  weather:   { label: "מזג אוויר",  icon: CloudSun,      spanLocked: true },
  calendar:  { label: "יומן",       icon: CalendarDays,  spanLocked: false },
};
