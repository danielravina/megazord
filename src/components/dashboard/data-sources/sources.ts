import type {
  DashboardRawData,
  DataSourceDef,
  WidgetData,
  WidgetType,
  HeroData,
  TableData,
  BarData,
  DoughnutData,
  TimeRange,
} from "@/components/dashboard/dashboard-types";
import { DISPLAY_TYPES } from "@/components/dashboard/dashboard-types";
import { calculateTaxes, totalVat } from "@/components/finance/tax-engine";

const CHART_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
];

const fmtNIS = (n: number) => `₪ ${n.toLocaleString()}`;

const fmtDate = (d?: string | null) => d?.split("-").reverse().join("/") || "-";

export function filterByTimeRange<T>(
  items: T[],
  range: TimeRange,
  dateField = "date",
): T[] {
  if (range === "all_time") return items;

  const now = new Date();
  const start = new Date(now);

  switch (range) {
    case "this_month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case "last_month":
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case "this_quarter":
      start.setMonth(Math.floor(start.getMonth() / 3) * 3);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case "this_year":
      start.setMonth(0);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case "last_30_days":
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
  }

  const cutoff = start.toISOString().slice(0, 10);

  return items.filter((item) => {
    const val = (item as Record<string, unknown>)[dateField];
    if (typeof val !== "string") return true;
    return val.slice(0, 10) >= cutoff;
  });
}

function hero(value: number, label: string, sublabel?: string): HeroData {
  return { value, label, sublabel };
}

function table(
  columns: { key: string; label: string; align?: "right" | "left" | "center" }[],
  rows: Record<string, string | number>[],
): TableData {
  return { columns, rows };
}

function bar(labels: string[], datasets: { label: string; data: number[]; color: string }[]): BarData {
  return { labels, datasets };
}

function doughnut(
  labels: string[],
  segments: { label: string; value: number; color: string }[],
): DoughnutData {
  return { labels, segments };
}

// ── Generic helpers ──────────────────────────────

function monthBreakdown(
  items: { date?: string | null; amount?: number }[],
): { labels: string[]; values: number[] } {
  const byMonth = new Map<string, number>();
  for (const i of items) {
    const m = (i.date || "").slice(0, 7);
    if (!m) continue;
    byMonth.set(m, (byMonth.get(m) || 0) + Number(i.amount || 0));
  }
  const sorted = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
  return {
    labels: sorted.map(([m]) => m.split("-").reverse().join("/")),
    values: sorted.map(([, v]) => v),
  };
}

function breakdown<T>(
  items: T[],
  keyFn: (item: T) => string,
  valueFn: (item: T) => number = (i) => Number((i as { amount?: number }).amount),
): { labels: string[]; values: number[] } {
  const by = new Map<string, number>();
  for (const i of items) {
    const k = keyFn(i);
    by.set(k, (by.get(k) || 0) + valueFn(i));
  }
  const sorted = [...by.entries()].sort(([, a], [, b]) => b - a);
  return { labels: sorted.map(([k]) => k), values: sorted.map(([, v]) => v) };
}

type Col = { key: string; label: string; align?: "right" | "left" | "center" };
type Row = Record<string, string | number>;

function recordsView<T>(
  view: WidgetType,
  items: T[],
  columns: Col[],
  mapper: (item: T) => Row,
  heroValue: number,
  heroLabel: string,
  heroSublabel?: string,
): WidgetData {
  if (view === "hero") return hero(heroValue, heroLabel, heroSublabel);
  if (view === "table") return table(columns, items.slice(0, 10).map(mapper));
  return null;
}

function barSeriesView(
  view: WidgetType,
  monthLabels: string[],
  monthValues: number[],
  fallbackLabels: string[],
  fallbackValues: number[],
  label: string,
  color: string,
): WidgetData {
  if (view !== "bar" && view !== "timeline") return null;

  if (view === "timeline") {
    const labels = monthLabels.length > 1 ? monthLabels : fallbackLabels;
    const values = monthLabels.length > 1 ? monthValues : fallbackValues;
    if (labels.length === 0) return null;
    return bar(labels, [{ label, data: values, color }]);
  }

  if (fallbackLabels.length === 0) return null;
  if (fallbackLabels.length === 1) {
    return bar(fallbackLabels, [{ label, data: fallbackValues, color }]);
  }
  return bar(
    fallbackLabels,
    fallbackLabels.map((l, idx) => ({
      label: l,
      color: CHART_COLORS[idx % CHART_COLORS.length],
      data: fallbackLabels.map((_, j) => (j === idx ? fallbackValues[idx] : 0)),
    })),
  );
}

// ── Family resolvers ─────────────────────────────

function incomeView(raw: DashboardRawData, range: TimeRange, view: WidgetType, label: string): WidgetData {
  const items = filterByTimeRange(raw.incomes, range);
  const total = items.reduce((s, i) => s + Number(i.amount), 0);
  const t = recordsView(
    view, items,
    [
      { key: "description", label: "תיאור" },
      { key: "amount", label: "סכום", align: "left" as const },
      { key: "date", label: "תאריך", align: "left" as const },
    ],
    (i) => ({ description: i.description, amount: fmtNIS(Number(i.amount)), date: fmtDate(i.date) }),
    total, label, `${items.length} רשומות`,
  );
  if (t) return t;
  const { labels, values } = monthBreakdown(items);
  const d = breakdown(items, (i) => i.type || "אחר");
  const s = barSeriesView(view, labels, values, d.labels, d.values, "הכנסות", CHART_COLORS[2]);
  if (s) return s;
  if (view === "doughnut") {
    return doughnut(d.labels, d.values.map((v, idx) => ({ label: d.labels[idx], value: v, color: CHART_COLORS[idx % CHART_COLORS.length] })));
  }
  return null;
}

function expenseView(raw: DashboardRawData, range: TimeRange, view: WidgetType, label: string): WidgetData {
  const items = filterByTimeRange(raw.expenses, range);
  const total = items.reduce((s, e) => s + Number(e.amount), 0);
  const t = recordsView(
    view, items,
    [
      { key: "description", label: "תיאור" },
      { key: "category", label: "קטגוריה" },
      { key: "amount", label: "סכום", align: "left" as const },
      { key: "date", label: "תאריך", align: "left" as const },
    ],
    (e) => ({ description: e.description, category: e.category, amount: fmtNIS(Number(e.amount)), date: fmtDate(e.date) }),
    total, label, `${items.length} רשומות`,
  );
  if (t) return t;
  const { labels, values } = monthBreakdown(items);
  const d = breakdown(items, (e) => e.category || "אחר");
  const s = barSeriesView(view, labels, values, d.labels, d.values, "הוצאות", CHART_COLORS[1]);
  if (s) return s;
  if (view === "doughnut") {
    return doughnut(d.labels, d.values.map((v, idx) => ({ label: d.labels[idx], value: v, color: CHART_COLORS[idx % CHART_COLORS.length] })));
  }
  return null;
}

function profitView(raw: DashboardRawData, range: TimeRange, view: WidgetType, label: string): WidgetData {
  const incItems = filterByTimeRange(raw.incomes, range);
  const expItems = filterByTimeRange(raw.expenses, range);
  const totalInc = incItems.reduce((s, i) => s + Number(i.amount), 0);
  const totalExp = expItems.reduce((s, e) => s + Number(e.amount), 0);
  const tax = calculateTaxes(incItems, expItems, raw.savings, raw.taxSettings);
  const net = totalInc - totalExp - tax.totalTax;

  if (view === "hero") return hero(net, label);
  if (view === "table") {
    return table(
      [
        { key: "row", label: "" },
        { key: "amount", label: "סכום", align: "left" as const },
      ],
      [
        { row: "הכנסות", amount: fmtNIS(totalInc) },
        { row: "הוצאות", amount: fmtNIS(totalExp) },
        { row: "מס", amount: fmtNIS(tax.totalTax) },
        { row: "רווח נטו", amount: fmtNIS(net) },
      ],
    );
  }

  const byMonth = new Map<string, { inc: number; exp: number }>();
  for (const i of incItems) {
    const m = i.date.slice(0, 7);
    const cur = byMonth.get(m) || { inc: 0, exp: 0 };
    cur.inc += Number(i.amount);
    byMonth.set(m, cur);
  }
  for (const e of expItems) {
    const m = e.date.slice(0, 7);
    const cur = byMonth.get(m) || { inc: 0, exp: 0 };
    cur.exp += Number(e.amount);
    byMonth.set(m, cur);
  }
  const sorted = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));

  if (view === "bar" || view === "timeline") {
    return bar(
      sorted.map(([m]) => m.split("-").reverse().join("/")),
      [
        { label: "הכנסות", data: sorted.map(([, v]) => v.inc), color: CHART_COLORS[2] },
        { label: "הוצאות", data: sorted.map(([, v]) => v.exp), color: CHART_COLORS[1] },
      ],
    );
  }
  if (view === "doughnut") {
    return doughnut(["הכנסות", "הוצאות"], [
      { label: "הכנסות", value: totalInc, color: CHART_COLORS[2] },
      { label: "הוצאות", value: totalExp, color: CHART_COLORS[1] },
    ]);
  }
  return null;
}

function taxView(raw: DashboardRawData, range: TimeRange, view: WidgetType, label: string): WidgetData {
  const incItems = filterByTimeRange(raw.incomes, range);
  const expItems = filterByTimeRange(raw.expenses, range);
  const tax = calculateTaxes(incItems, expItems, raw.savings, raw.taxSettings);
  const segments = [
    { label: 'מע"מ', value: tax.vat, color: CHART_COLORS[0] },
    { label: "מס הכנסה", value: tax.incomeTax, color: CHART_COLORS[3] },
    { label: "ביטוח לאומי", value: tax.bituahLeumi, color: CHART_COLORS[4] },
  ].filter((s) => s.value > 0);

  if (view === "hero") return hero(tax.totalTax, label, "מע״מ + מקדמות + ביטוח לאומי");
  if (view === "doughnut") return doughnut(segments.map((s) => s.label), segments);
  if (view === "bar" || view === "timeline") {
    return bar(segments.map((s) => s.label), [{ label: "מס", data: segments.map((s) => s.value), color: CHART_COLORS[3] }]);
  }
  if (view === "table") {
    return table(
      [
        { key: "label", label: "סוג מס" },
        { key: "amount", label: "סכום", align: "left" as const },
      ],
      segments.map((s) => ({ label: s.label, amount: fmtNIS(s.value) })),
    );
  }
  return null;
}

function taxUpcomingView(raw: DashboardRawData, view: WidgetType): WidgetData {
  const s = raw.taxSettings;
  const vatRate = s?.vat_rate ?? 18;
  const incTaxRate = s?.income_tax_advance ?? 0;
  const blRate = s?.bituah_leumi ?? 5;
  const totalIncome = raw.incomes.reduce((sum, i) => sum + Number(i.amount), 0);
  const estVat = Math.round(totalVat(raw.incomes, vatRate));
  const grossWithoutVat = totalIncome - estVat;
  const estIncTax = Math.round(grossWithoutVat * (incTaxRate / 100));
  const estBL = Math.round(grossWithoutVat * (blRate / 100));
  const vatFreq = s?.vat_frequency || "bimonthly";

  function getNextBillingDay(day: number): string {
    const today = new Date();
    const target = new Date(today.getFullYear(), today.getMonth(), 1);
    const maxDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    const safeDay = Math.min(day, maxDay);
    const date = new Date(target.getFullYear(), target.getMonth(), safeDay);
    if (today.getDate() >= safeDay) date.setMonth(date.getMonth() + 1);
    return date.toLocaleDateString("he-IL", { day: "numeric", month: "numeric", year: "2-digit" });
  }

  const entries: { label: string; amount: number; date: string }[] = [];
  if (estVat > 0) {
    entries.push({
      label: vatFreq === "bimonthly" ? 'מע"מ (דו-חודשי)' : 'מע"מ',
      amount: estVat * (vatFreq === "bimonthly" ? 2 : 1),
      date: getNextBillingDay(s?.vat_billing_day ?? 15),
    });
  }
  if (estIncTax > 0) {
    entries.push({
      label: "מקדמות מס הכנסה",
      amount: Math.round(estIncTax * (vatFreq === "bimonthly" ? 2 : 1)),
      date: getNextBillingDay(s?.income_tax_billing_day ?? 15),
    });
  }
  if (estBL > 0) {
    entries.push({
      label: "ביטוח לאומי",
      amount: estBL,
      date: getNextBillingDay(s?.bituah_leumi_billing_day ?? 15),
    });
  }

  if (view === "table") {
    return table(
      [
        { key: "label", label: "תשלום" },
        { key: "amount", label: "סכום", align: "left" as const },
        { key: "date", label: "חיוב", align: "left" as const },
      ],
      entries.map((e) => ({ label: e.label, amount: fmtNIS(e.amount), date: e.date })),
    );
  }
  if (view === "hero") return hero(entries.reduce((sum, e) => sum + e.amount, 0), "תשלומים קרובים", `${entries.length} תשלומים`);
  if (view === "bar" || view === "timeline") {
    return bar(entries.map((e) => e.label), [{ label: "תשלומים", data: entries.map((e) => e.amount), color: CHART_COLORS[4] }]);
  }
  if (view === "doughnut") {
    return doughnut(entries.map((e) => e.label), entries.map((e, i) => ({ label: e.label, value: e.amount, color: CHART_COLORS[i % CHART_COLORS.length] })));
  }
  return null;
}

function savingsView(
  raw: DashboardRawData,
  range: TimeRange,
  view: WidgetType,
  fundFilter: string | null,
  label: string,
): WidgetData {
  let all = raw.savings;
  if (fundFilter) all = all.filter((sv) => sv.fund_type === fundFilter);
  const items = filterByTimeRange(all, range);
  const total = items.reduce((s, sv) => s + Number(sv.amount), 0);

  const t = recordsView(
    view, items,
    [
      { key: "fund_type", label: "סוג" },
      { key: "amount", label: "סכום", align: "left" as const },
      { key: "date", label: "תאריך", align: "left" as const },
    ],
    (sv) => ({ fund_type: sv.fund_type, amount: fmtNIS(Number(sv.amount)), date: fmtDate(sv.date) }),
    total, label, `${items.length} הפקדות`,
  );
  if (t) return t;
  const { labels, values } = monthBreakdown(items);
  const d = breakdown(items, (sv) => sv.fund_type || "אחר");
  const s = barSeriesView(view, labels, values, d.labels, d.values, label, CHART_COLORS[5]);
  if (s) return s;
  if (view === "doughnut") {
    return doughnut(d.labels, d.values.map((v, idx) => ({ label: d.labels[idx], value: v, color: CHART_COLORS[idx % CHART_COLORS.length] })));
  }
  return null;
}

function documentsView(
  raw: DashboardRawData,
  range: TimeRange,
  view: WidgetType,
  opts: { investment?: boolean; unpaidIncome?: boolean },
  label: string,
): WidgetData {
  let docs = raw.documents;
  if (opts.investment) docs = docs.filter((d) => d.is_investment);
  // חובות לקוחות = מסמכי חשבונית עסקה (תשלום עתידי) שטרם שולמו
  if (opts.unpaidIncome) docs = docs.filter((d) => d.doc_type === "transaction_account");
  const items = filterByTimeRange(docs, range);
  const total = items.reduce((s, d) => s + Number(d.total_amount || 0), 0);

  const t = recordsView(
    view, items,
    [
      { key: "title", label: "מסמך" },
      { key: "amount", label: "סכום", align: "left" as const },
      { key: "date", label: "תאריך", align: "left" as const },
    ],
    (d) => ({ title: d.title, amount: d.total_amount ? fmtNIS(d.total_amount) : "-", date: fmtDate(d.date_on_doc) }),
    total, label, `${items.length} מסמכים`,
  );
  if (t) return t;
  const { labels, values } = monthBreakdown(items.map((d) => ({ date: d.date_on_doc || d.date, amount: d.total_amount || 0 })));
  const d = breakdown(items, (doc) => doc.doc_type || "אחר", (doc) => Number(doc.total_amount || 0));
  const s = barSeriesView(view, labels, values, d.labels, d.values, label, CHART_COLORS[6]);
  if (s) return s;
  if (view === "doughnut") {
    return doughnut(d.labels, d.values.map((v, idx) => ({ label: d.labels[idx], value: v, color: CHART_COLORS[idx % CHART_COLORS.length] })));
  }
  return null;
}

function projectsView(raw: DashboardRawData, range: TimeRange, view: WidgetType, label: string): WidgetData {
  const items = filterByTimeRange(raw.projects, range, "start_date");
  const total = items.reduce((sum, p) => sum + Number(p.quote_price || 0), 0);

  const t = recordsView(
    view, items,
    [
      { key: "customer_name", label: "לקוח" },
      { key: "quote_price", label: "הצעת מחיר", align: "left" as const },
      { key: "start_date", label: "תאריך", align: "left" as const },
    ],
    (p) => ({ customer_name: p.customer_name || "-", quote_price: p.quote_price ? fmtNIS(p.quote_price) : "-", start_date: fmtDate(p.start_date) }),
    total, label, `${items.length} פרויקטים`,
  );
  if (t) return t;
  const { labels, values } = monthBreakdown(items.map((p) => ({ date: p.start_date || p.created_at, amount: p.quote_price || 0 })));
  const d = breakdown(items, (p) => p.customer_name || "אחר", (p) => Number(p.quote_price || 0));
  const s = barSeriesView(view, labels, values, d.labels, d.values, label, CHART_COLORS[6]);
  if (s) return s;
  if (view === "doughnut") {
    return doughnut(d.labels, d.values.map((v, idx) => ({ label: d.labels[idx], value: v, color: CHART_COLORS[idx % CHART_COLORS.length] })));
  }
  return null;
}

function todosView(raw: DashboardRawData, view: WidgetType): WidgetData {
  const open = raw.todos.filter((t) => !t.completed);
  if (view === "table") {
    return table(
      [{ key: "text", label: "משימה" }, { key: "status", label: "" }],
      open.slice(0, 10).map((t) => ({ text: t.text, status: "פתוח" })),
    );
  }
  return null;
}

// ── Data Source Definitions ──────────────────────────

const NO_TIMELINE: WidgetType[] = ["hero", "table", "bar", "doughnut"];
const NO_DOUGHNUT: WidgetType[] = ["hero", "table", "bar", "timeline"];
const TABLE_ONLY: WidgetType[] = ["table"];

export const DATA_SOURCES: DataSourceDef[] = [
  { key: "income", label: "הכנסות", compatibleTypes: DISPLAY_TYPES, needsTimeRange: true },
  { key: "expenses", label: "הוצאות", compatibleTypes: DISPLAY_TYPES, needsTimeRange: true },
  { key: "profit", label: "רווח נטו", compatibleTypes: DISPLAY_TYPES, needsTimeRange: true },
  { key: "tax", label: "חבות מס", compatibleTypes: NO_TIMELINE, needsTimeRange: true },
  { key: "tax:upcoming", label: "תשלומים קרובים", compatibleTypes: NO_TIMELINE, needsTimeRange: false },
  { key: "savings", label: "חסכונות", compatibleTypes: DISPLAY_TYPES, needsTimeRange: false },
  { key: "savings:pension", label: "פנסיה", compatibleTypes: NO_DOUGHNUT, needsTimeRange: false },
  { key: "savings:hishtalmut", label: "קרן השתלמות", compatibleTypes: NO_DOUGHNUT, needsTimeRange: false },
  { key: "savings:gemel", label: "קופת גמל", compatibleTypes: NO_DOUGHNUT, needsTimeRange: false },
  { key: "investments", label: "השקעות", compatibleTypes: DISPLAY_TYPES, needsTimeRange: false },
  { key: "projects", label: "פרויקטים", compatibleTypes: DISPLAY_TYPES, needsTimeRange: true },
  { key: "documents", label: "מסמכים", compatibleTypes: DISPLAY_TYPES, needsTimeRange: true },
  { key: "receivables", label: "חובות לקוחות", compatibleTypes: DISPLAY_TYPES, needsTimeRange: false },
  { key: "todos", label: "משימות פתוחות", compatibleTypes: TABLE_ONLY, needsTimeRange: false },
];

// Map old granular keys to the consolidated ones so saved layouts keep working
const SOURCE_KEY_MIGRATIONS: Record<string, string> = {
  "income:total": "income",
  "income:recent": "income",
  "income:by_month": "income",
  "expenses:total": "expenses",
  "expenses:recent": "expenses",
  "expenses:by_month": "expenses",
  "expenses:by_category": "expenses",
  "profit:net": "profit",
  "profit:cashflow": "profit",
  "tax:estimate": "tax",
  "tax:breakdown": "tax",
  "savings:total": "savings",
  "savings:recent": "savings",
  "savings:by_fund": "savings",
  "investments:total": "investments",
  "investments:recent": "investments",
  "projects:active": "projects",
  "projects:pipeline": "projects",
  "projects:recent": "projects",
  "documents:recent": "documents",
  "documents:receivables": "receivables",
  "todos:open": "todos",
};

export function migrateSourceKey(key?: string): string | undefined {
  if (!key) return key;
  return SOURCE_KEY_MIGRATIONS[key] || key;
}

// ── Resolver ──────────────────────────────────────

export function resolveDataSource(
  raw: DashboardRawData,
  sourceKey: string,
  timeRange: TimeRange,
  view: WidgetType,
): WidgetData {
  sourceKey = SOURCE_KEY_MIGRATIONS[sourceKey] || sourceKey;
  const def = DATA_SOURCES.find((s) => s.key === sourceKey);
  if (def && !def.compatibleTypes.includes(view)) return null;
  const range: TimeRange = def?.needsTimeRange ? timeRange : "all_time";
  const label = def?.label || "הנתונים";

  switch (sourceKey) {
    // ── Income ──────────────
    case "income":
      return incomeView(raw, range, view, label);

    // ── Expenses ────────────
    case "expenses":
      return expenseView(raw, range, view, label);

    // ── Profit ──────────────
    case "profit":
      return profitView(raw, range, view, label);

    // ── Tax ─────────────────
    case "tax":
      return taxView(raw, range, view, label);

    case "tax:upcoming":
      return taxUpcomingView(raw, view);

    // ── Savings ─────────────
    case "savings":
      return savingsView(raw, range, view, null, label);

    case "savings:pension":
      return savingsView(raw, range, view, "פנסיה", label);
    case "savings:hishtalmut":
      return savingsView(raw, range, view, "קרן השתלמות", label);
    case "savings:gemel":
      return savingsView(raw, range, view, "קופת גמל", label);

    // ── Investments ─────────
    case "investments":
      return documentsView(raw, range, view, { investment: true }, label);

    // ── Projects ────────────
    case "projects":
      return projectsView(raw, range, view, label);

    // ── Documents ───────────
    case "documents":
      return documentsView(raw, range, view, {}, label);
    case "receivables":
      return documentsView(raw, range, view, { unpaidIncome: true }, label);

    // ── Todos ───────────────
    case "todos":
      return todosView(raw, view);

    case "calendar:today":
      return { events: raw.events };

    default:
      return null;
  }
}
