import type { Income, Expense, TaxSettings, Saving } from "@/components/finance/finance-types";
import type { Project } from "@/components/projects/project-types";

export type WidgetType = "hero" | "table" | "bar" | "timeline" | "doughnut" | "calculator" | "clock" | "weather" | "calendar";

export const RESIZABLE_TYPES: WidgetType[] = ["hero", "table", "bar", "timeline", "doughnut", "calendar"];
export const LOCKED_1x1: WidgetType[] = ["calculator", "clock", "weather"];
export const STATIC_WIDGETS: WidgetType[] = ["calculator", "clock", "weather"];
export const DISPLAY_TYPES: WidgetType[] = ["hero", "table", "bar", "timeline", "doughnut"];

export const DEFAULT_SOURCE_BY_TYPE: Partial<Record<WidgetType, string>> = {
  hero: "income",
  table: "income",
  bar: "income",
  timeline: "income",
  doughnut: "expenses",
};

export interface StandaloneSourceDef {
  key: string;
  label: string;
  type: WidgetType;
}

export const STANDALONE_SOURCES: StandaloneSourceDef[] = [
  { key: "calendar", label: "יומן", type: "calendar" },
  { key: "calculator", label: "מחשבון", type: "calculator" },
  { key: "clock", label: "שעון", type: "clock" },
  { key: "weather", label: "מזג אוויר", type: "weather" },
];

export interface DashboardTile {
  id: string;
  type: WidgetType;
  dataSource?: string;
  timeRange?: TimeRange;
  span: 1 | 2 | 3 | 4;
  width?: number;
  title?: string;
}

export type TimeRange = "this_month" | "last_month" | "this_quarter" | "this_year" | "last_30_days" | "all_time";

export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  this_month: "החודש",
  last_month: "החודש שעבר",
  this_quarter: "הרבעון",
  this_year: "השנה",
  last_30_days: "30 יום אחרונים",
  all_time: "כל הזמן",
};

export interface DataSourceDef {
  key: string;
  label: string;
  compatibleTypes: WidgetType[];
  needsTimeRange: boolean;
}

export interface HeroData {
  value: number;
  label: string;
  sublabel?: string;
  trend?: { direction: "up" | "down" | "neutral"; percent: number };
}

export interface TableData {
  columns: { key: string; label: string; align?: "right" | "left" | "center" }[];
  rows: Record<string, string | number>[];
}

export interface BarData {
  labels: string[];
  datasets: { label: string; data: number[]; color: string }[];
}

export interface DoughnutData {
  labels: string[];
  segments: { label: string; value: number; color: string }[];
}

export interface CalendarData {
  events: CalendarEvent[];
}

export type WidgetData = HeroData | TableData | BarData | DoughnutData | CalendarData | null;

export interface DocRaw {
  id: string;
  user_id: string;
  title: string;
  image_url: string | null;
  tags: string[];
  extracted_text: string | null;
  doc_type: string;
  date_on_doc: string | null;
  total_amount: number | null;
  project_id: string | null;
  folder: string | null;
  is_investment: boolean;
  direction: string;
  is_paid: boolean;
  business_id: string | null;
  date: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  date: string;
  end_date: string | null;
  color: string | null;
  is_project: boolean;
  project_id: string | null;
}

export interface Todo {
  id: string;
  user_id: string;
  text: string;
  completed: boolean;
  created_at: string;
}

export interface KanbanRequest {
  id: string;
  user_id: string;
  title: string;
  details: string | null;
  priority: string;
  status: string;
  files: string[];
  comments: Record<string, unknown>[];
  created_at: string;
}

export interface DashboardRawData {
  incomes: Income[];
  expenses: Expense[];
  savings: Saving[];
  taxSettings: TaxSettings | null;
  projects: Project[];
  documents: DocRaw[];
  todos: Todo[];
  events: CalendarEvent[];
  requests: KanbanRequest[];
}

export function emptyRawData(): DashboardRawData {
  return {
    incomes: [],
    expenses: [],
    savings: [],
    taxSettings: null,
    projects: [],
    documents: [],
    todos: [],
    events: [],
    requests: [],
  };
}
