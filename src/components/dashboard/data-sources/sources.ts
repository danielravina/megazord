import type {
  DashboardRawData,
  DataSourceDef,
  WidgetData,
  HeroData,
  TableData,
  BarData,
  DoughnutData,
  TimeRange,
} from "@/components/dashboard/dashboard-types";
import { calculateTaxes } from "@/components/finance/tax-engine";

const CHART_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
];

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

// ── Data Source Definitions ──────────────────────────

export const DATA_SOURCES: DataSourceDef[] = [
  { key: "income:total", label: "סה״כ הכנסות", compatibleTypes: ["hero"], needsTimeRange: true },
  { key: "income:recent", label: "הכנסות אחרונות", compatibleTypes: ["table"], needsTimeRange: true },
  { key: "income:by_month", label: "הכנסות חודשיות", compatibleTypes: ["bar"], needsTimeRange: true },
  { key: "expenses:total", label: "סה״כ הוצאות", compatibleTypes: ["hero"], needsTimeRange: true },
  { key: "expenses:recent", label: "הוצאות אחרונות", compatibleTypes: ["table"], needsTimeRange: true },
  { key: "expenses:by_category", label: "הוצאות לפי קטגוריה", compatibleTypes: ["doughnut", "table"], needsTimeRange: true },
  { key: "expenses:by_month", label: "הוצאות חודשיות", compatibleTypes: ["bar"], needsTimeRange: true },
  { key: "profit:net", label: "רווח נטו", compatibleTypes: ["hero"], needsTimeRange: true },
  { key: "profit:cashflow", label: "הכנסות מול הוצאות", compatibleTypes: ["bar"], needsTimeRange: true },
  { key: "tax:estimate", label: "חבות מס משוערת", compatibleTypes: ["hero"], needsTimeRange: true },
  { key: "tax:breakdown", label: "פירוט מס", compatibleTypes: ["doughnut"], needsTimeRange: true },
  { key: "tax:upcoming", label: "תשלומים קרובים", compatibleTypes: ["table"], needsTimeRange: false },
  { key: "savings:total", label: "סה״כ חסכונות", compatibleTypes: ["hero"], needsTimeRange: false },
  { key: "savings:recent", label: "הפקדות אחרונות", compatibleTypes: ["table"], needsTimeRange: true },
  { key: "savings:by_fund", label: "חסכונות לפי סוג", compatibleTypes: ["doughnut", "table"], needsTimeRange: false },
  { key: "savings:pension", label: "פנסיה", compatibleTypes: ["hero"], needsTimeRange: false },
  { key: "savings:hishtalmut", label: "קרן השתלמות", compatibleTypes: ["hero"], needsTimeRange: false },
  { key: "savings:gemel", label: "קופת גמל", compatibleTypes: ["hero"], needsTimeRange: false },
  { key: "investments:total", label: "השקעות בציוד", compatibleTypes: ["hero"], needsTimeRange: false },
  { key: "investments:recent", label: "השקעות אחרונות", compatibleTypes: ["table"], needsTimeRange: true },
  { key: "projects:active", label: "פרויקטים פעילים", compatibleTypes: ["table", "hero"], needsTimeRange: false },
  { key: "projects:pipeline", label: "צבר פרויקטים", compatibleTypes: ["hero"], needsTimeRange: false },
  { key: "projects:recent", label: "פרויקטים אחרונים", compatibleTypes: ["table"], needsTimeRange: true },
  { key: "documents:recent", label: "מסמכים אחרונים", compatibleTypes: ["table"], needsTimeRange: true },
  { key: "documents:receivables", label: "חובות לקוחות", compatibleTypes: ["hero"], needsTimeRange: false },
  { key: "todos:open", label: "משימות פתוחות", compatibleTypes: ["table", "hero"], needsTimeRange: false },
  { key: "events:upcoming", label: "אירועים קרובים", compatibleTypes: ["table", "hero"], needsTimeRange: false },
  { key: "requests:open", label: "בקשות פתוחות", compatibleTypes: ["table", "hero"], needsTimeRange: false },
  { key: "requests:by_status", label: "בקשות לפי סטטוס", compatibleTypes: ["doughnut", "bar"], needsTimeRange: false },
];

// ── Transform Functions ──────────────────────────────

export function resolveDataSource(
  raw: DashboardRawData,
  sourceKey: string,
  timeRange: TimeRange,
): WidgetData {
  switch (sourceKey) {
    // ── Income ──────────────
    case "income:total": {
      const items = filterByTimeRange(raw.incomes, timeRange);
      return hero(
        items.reduce((s, i) => s + Number(i.amount), 0),
        "סה״כ הכנסות",
        `${items.length} רשומות`,
      );
    }

    case "income:recent": {
      const items = filterByTimeRange(raw.incomes, timeRange).slice(0, 10);
      return table(
        [
          { key: "description", label: "תיאור" },
          { key: "amount", label: "סכום", align: "left" as const },
          { key: "date", label: "תאריך", align: "left" as const },
        ],
        items.map((i) => ({
          description: i.description,
          amount: `₪ ${Number(i.amount).toLocaleString()}`,
          date: i.date?.split("-").reverse().join("/") || "-",
        })),
      );
    }

    case "income:by_month": {
      const items = filterByTimeRange(raw.incomes, timeRange);
      const byMonth = new Map<string, number>();
      for (const i of items) {
        const m = i.date.slice(0, 7);
        byMonth.set(m, (byMonth.get(m) || 0) + Number(i.amount));
      }
      const sorted = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
      return bar(
        sorted.map(([m]) => m.split("-").reverse().join("/")),
        [{ label: "הכנסות", data: sorted.map(([, v]) => v), color: CHART_COLORS[2] }],
      );
    }

    // ── Expenses ────────────
    case "expenses:total": {
      const items = filterByTimeRange(raw.expenses, timeRange);
      return hero(
        items.reduce((s, e) => s + Number(e.amount), 0),
        "סה״כ הוצאות",
        `${items.length} רשומות`,
      );
    }

    case "expenses:recent": {
      const items = filterByTimeRange(raw.expenses, timeRange).slice(0, 10);
      return table(
        [
          { key: "description", label: "תיאור" },
          { key: "category", label: "קטגוריה" },
          { key: "amount", label: "סכום", align: "left" as const },
          { key: "date", label: "תאריך", align: "left" as const },
        ],
        items.map((e) => ({
          description: e.description,
          category: e.category,
          amount: `₪ ${Number(e.amount).toLocaleString()}`,
          date: e.date?.split("-").reverse().join("/") || "-",
        })),
      );
    }

    case "expenses:by_category": {
      const items = filterByTimeRange(raw.expenses, timeRange);
      const byCat = new Map<string, number>();
      for (const e of items) {
        const cat = e.category || "אחר";
        byCat.set(cat, (byCat.get(cat) || 0) + Number(e.amount));
      }
      const sorted = [...byCat.entries()].sort(([, a], [, b]) => b - a);
      return doughnut(
        sorted.map(([c]) => c),
        sorted.map(([c, v], i) => ({ label: c, value: v, color: CHART_COLORS[i % CHART_COLORS.length] })),
      );
    }

    case "expenses:by_month": {
      const items = filterByTimeRange(raw.expenses, timeRange);
      const byMonth = new Map<string, number>();
      for (const e of items) {
        const m = e.date.slice(0, 7);
        byMonth.set(m, (byMonth.get(m) || 0) + Number(e.amount));
      }
      const sorted = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
      return bar(
        sorted.map(([m]) => m.split("-").reverse().join("/")),
        [{ label: "הוצאות", data: sorted.map(([, v]) => v), color: CHART_COLORS[1] }],
      );
    }

    // ── Profit ──────────────
    case "profit:net": {
      const incItems = filterByTimeRange(raw.incomes, timeRange);
      const expItems = filterByTimeRange(raw.expenses, timeRange);
      const totalInc = incItems.reduce((s, i) => s + Number(i.amount), 0);
      const totalExp = expItems.reduce((s, e) => s + Number(e.amount), 0);
      const tax = calculateTaxes(incItems, expItems, raw.savings, raw.taxSettings);
      return hero(totalInc - totalExp - tax.totalTax, "רווח נטו");
    }

    case "profit:cashflow": {
      const items = filterByTimeRange(raw.incomes, timeRange);
      const expItems = filterByTimeRange(raw.expenses, timeRange);
      const byMonth = new Map<string, { inc: number; exp: number }>();
      for (const i of items) {
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
      return bar(
        sorted.map(([m]) => m.split("-").reverse().join("/")),
        [
          { label: "הכנסות", data: sorted.map(([, v]) => v.inc), color: CHART_COLORS[2] },
          { label: "הוצאות", data: sorted.map(([, v]) => v.exp), color: CHART_COLORS[1] },
        ],
      );
    }

    // ── Tax ─────────────────
    case "tax:estimate": {
      const incItems = filterByTimeRange(raw.incomes, timeRange);
      const expItems = filterByTimeRange(raw.expenses, timeRange);
      const tax = calculateTaxes(incItems, expItems, raw.savings, raw.taxSettings);
      return hero(tax.totalTax, "חבות מס משוערת", "מע״מ + מקדמות + ביטוח לאומי");
    }

    case "tax:breakdown": {
      const incItems = filterByTimeRange(raw.incomes, timeRange);
      const expItems = filterByTimeRange(raw.expenses, timeRange);
      const tax = calculateTaxes(incItems, expItems, raw.savings, raw.taxSettings);
      const segments = [
        { label: "מע״מ", value: tax.vat, color: CHART_COLORS[0] },
        { label: "מס הכנסה", value: tax.incomeTax, color: CHART_COLORS[3] },
        { label: "ביטוח לאומי", value: tax.bituahLeumi, color: CHART_COLORS[4] },
      ].filter((s) => s.value > 0);
      return doughnut(
        segments.map((s) => s.label),
        segments,
      );
    }

    case "tax:upcoming": {
      const s = raw.taxSettings;
      const vatRate = s?.vat_rate ?? 17;
      const incTaxRate = s?.income_tax_advance ?? 0;
      const blRate = s?.bituah_leumi ?? 5;
      const totalIncome = raw.incomes.reduce((sum, i) => sum + Number(i.amount), 0);
      const grossWithoutVat = totalIncome - (totalIncome - totalIncome / (1 + vatRate / 100));
      const estVat = Math.round(totalIncome - totalIncome / (1 + vatRate / 100));
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

      const rows: Record<string, string | number>[] = [];
      if (estVat > 0) {
        rows.push({
          label: vatFreq === "bimonthly" ? 'מע"מ (דו-חודשי)' : 'מע"מ',
          amount: `₪ ${(estVat * (vatFreq === "bimonthly" ? 2 : 1)).toLocaleString()}`,
          date: getNextBillingDay(s?.vat_billing_day ?? 15),
        });
      }
      if (estIncTax > 0) {
        rows.push({
          label: "מקדמות מס הכנסה",
          amount: `₪ ${Math.round(estIncTax * (vatFreq === "bimonthly" ? 2 : 1)).toLocaleString()}`,
          date: getNextBillingDay(s?.income_tax_billing_day ?? 15),
        });
      }
      if (estBL > 0) {
        rows.push({
          label: "ביטוח לאומי",
          amount: `₪ ${estBL.toLocaleString()}`,
          date: getNextBillingDay(s?.bituah_leumi_billing_day ?? 15),
        });
      }

      return table(
        [
          { key: "label", label: "תשלום" },
          { key: "amount", label: "סכום", align: "left" as const },
          { key: "date", label: "חיוב", align: "left" as const },
        ],
        rows,
      );
    }

    // ── Savings ─────────────
    case "savings:total": {
      const total = raw.savings.reduce((s, sv) => s + Number(sv.amount), 0);
      return hero(total, "סה״כ חסכונות", `${raw.savings.length} הפקדות`);
    }

    case "savings:recent": {
      const items = filterByTimeRange(raw.savings, timeRange).slice(0, 10);
      return table(
        [
          { key: "fund_type", label: "סוג" },
          { key: "amount", label: "סכום", align: "left" as const },
          { key: "date", label: "תאריך", align: "left" as const },
        ],
        items.map((s) => ({
          fund_type: s.fund_type,
          amount: `₪ ${Number(s.amount).toLocaleString()}`,
          date: s.date?.split("-").reverse().join("/") || "-",
        })),
      );
    }

    case "savings:by_fund": {
      const byFund = new Map<string, number>();
      for (const s of raw.savings) {
        const f = s.fund_type || "אחר";
        byFund.set(f, (byFund.get(f) || 0) + Number(s.amount));
      }
      const sorted = [...byFund.entries()].sort(([, a], [, b]) => b - a);
      return doughnut(
        sorted.map(([f]) => f),
        sorted.map(([f, v], i) => ({ label: f, value: v, color: CHART_COLORS[i % CHART_COLORS.length] })),
      );
    }

    case "savings:pension": {
      const total = raw.savings
        .filter((s) => s.fund_type === "פנסיה")
        .reduce((sum, s) => sum + Number(s.amount), 0);
      return hero(total, "פנסיה");
    }

    case "savings:hishtalmut": {
      const total = raw.savings
        .filter((s) => s.fund_type === "קרן השתלמות")
        .reduce((sum, s) => sum + Number(s.amount), 0);
      return hero(total, "קרן השתלמות");
    }

    case "savings:gemel": {
      const total = raw.savings
        .filter((s) => s.fund_type === "קופת גמל להשקעה")
        .reduce((sum, s) => sum + Number(s.amount), 0);
      return hero(total, "קופת גמל להשקעה");
    }

    // ── Investments ─────────
    case "investments:total": {
      const total = raw.documents
        .filter((d) => d.is_investment)
        .reduce((sum, d) => sum + Number(d.total_amount || 0), 0);
      return hero(total, "השקעות בציוד");
    }

    case "investments:recent": {
      const items = filterByTimeRange(
        raw.documents.filter((d) => d.is_investment),
        timeRange,
      ).slice(0, 10);
      return table(
        [
          { key: "title", label: "תיאור" },
          { key: "amount", label: "סכום", align: "left" as const },
          { key: "date", label: "תאריך", align: "left" as const },
        ],
        items.map((d) => ({
          title: d.title,
          amount: d.total_amount ? `₪ ${d.total_amount.toLocaleString()}` : "-",
          date: d.date_on_doc?.split("-").reverse().join("/") || "-",
        })),
      );
    }

    // ── Projects ────────────
    case "projects:active": {
      return hero(raw.projects.length, "פרויקטים פעילים");
    }

    case "projects:pipeline": {
      const total = raw.projects.reduce((sum, p) => sum + Number(p.quote_price || 0), 0);
      return hero(total, "צבר פרויקטים", `${raw.projects.length} פרויקטים`);
    }

    case "projects:recent": {
      const items = filterByTimeRange(raw.projects, timeRange, "start_date").slice(0, 10);
      return table(
        [
          { key: "customer_name", label: "לקוח" },
          { key: "quote_price", label: "הצעת מחיר", align: "left" as const },
          { key: "start_date", label: "תאריך", align: "left" as const },
        ],
        items.map((p) => ({
          customer_name: p.customer_name,
          quote_price: p.quote_price ? `₪ ${p.quote_price.toLocaleString()}` : "-",
          start_date: p.start_date?.split("-").reverse().join("/") || "-",
        })),
      );
    }

    // ── Documents ───────────
    case "documents:recent": {
      const items = filterByTimeRange(raw.documents, timeRange).slice(0, 10);
      return table(
        [
          { key: "title", label: "מסמך" },
          { key: "type", label: "סוג" },
          { key: "amount", label: "סכום", align: "left" as const },
          { key: "date", label: "תאריך", align: "left" as const },
        ],
        items.map((d) => ({
          title: d.title,
          type: d.doc_type,
          amount: d.total_amount ? `₪ ${d.total_amount.toLocaleString()}` : "-",
          date: d.date_on_doc?.split("-").reverse().join("/") || "-",
        })),
      );
    }

    case "documents:receivables": {
      const total = raw.documents
        .filter((d) => !d.is_paid && d.direction === "income")
        .reduce((sum, d) => sum + Number(d.total_amount || 0), 0);
      return hero(total, "חובות לקוחות");
    }

    // ── Todos ───────────────
    case "todos:open": {
      const open = raw.todos.filter((t) => !t.completed);
      return table(
        [{ key: "text", label: "משימה" }, { key: "status", label: "" }],
        open.slice(0, 10).map((t) => ({
          text: t.text,
          status: "פתוח",
        })),
      );
    }

    // ── Events ──────────────
    case "events:upcoming": {
      const today = new Date().toISOString().slice(0, 10);
      const upcoming = raw.events
        .filter((e) => e.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 10);
      return table(
        [
          { key: "title", label: "אירוע" },
          { key: "date", label: "תאריך", align: "left" as const },
        ],
        upcoming.map((e) => ({
          title: e.title,
          date: e.date?.split("-").reverse().join("/") || "-",
        })),
      );
    }

    // ── Requests ────────────
    case "requests:open": {
      const open = raw.requests.filter((r) => r.status !== "done");
      return table(
        [
          { key: "title", label: "בקשה" },
          { key: "priority", label: "עדיפות" },
          { key: "status", label: "סטטוס" },
        ],
        open.slice(0, 10).map((r) => {
          const priorityMap: Record<string, string> = { high: "דחוף", medium: "בינוני", low: "נמוך" };
          const statusMap: Record<string, string> = { new: "חדש", in_progress: "בביצוע", done: "הושלם" };
          return {
            title: r.title,
            priority: priorityMap[r.priority] || r.priority,
            status: statusMap[r.status] || r.status,
          };
        }),
      );
    }

    case "requests:by_status": {
      const byStatus = new Map<string, number>();
      for (const r of raw.requests) {
        byStatus.set(r.status, (byStatus.get(r.status) || 0) + 1);
      }
      const statusMap: Record<string, string> = { new: "חדש", in_progress: "בביצוע", done: "הושלם" };
      const sorted = [...byStatus.entries()];
      return doughnut(
        sorted.map(([s]) => statusMap[s] || s),
        sorted.map(([s, v], i) => ({ label: statusMap[s] || s, value: v, color: CHART_COLORS[i % CHART_COLORS.length] })),
      );
    }

    default:
      return null;
  }
}
