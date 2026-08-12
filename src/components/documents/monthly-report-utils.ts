import type { Income, Expense, Saving, TaxSettings, TaxCalculation } from "@/components/finance/finance-types";
import { calculateTaxes, totalVat } from "@/components/finance/tax-engine";

export const FOLDER_LABELS: Record<string, string> = {
  Bank: "בנק",
  VAT: 'מע"מ',
  "Income Tax": "מס הכנסה",
  "National Insurance": "ביטוח לאומי",
  Accountant: "רואה חשבון",
  Suppliers: "ספקים",
  Employees: "עובדים",
  Other: "אחר",
};

export function categoryLabel(category: string): string {
  return FOLDER_LABELS[category] || category;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function filterByMonth<T extends { date: string }>(items: T[], month: number, year: number): T[] {
  return items.filter((item) => {
    const [y, m] = item.date.split("-").map(Number);
    return y === year && m - 1 === month;
  });
}

export interface ExpenseGroup {
  category: string;
  label: string;
  items: Expense[];
  total: number;
}

export interface MonthlyReport {
  incomeItems: Income[];
  incomeTotal: number;
  expenseGroups: ExpenseGroup[];
  expenseTotal: number;
  savingsItems: Saving[];
  savingsTotal: number;
  tax: TaxCalculation;
  netBeforeTax: number;
  netAfterTax: number;
}

export function buildMonthlyReport(
  incomes: Income[],
  expenses: Expense[],
  savings: Saving[],
  taxSettings: TaxSettings | null,
  month: number,
  year: number,
): MonthlyReport {
  const incomeItems = filterByMonth(incomes, month, year);
  const expenseItems = filterByMonth(expenses, month, year);
  const savingsItems = filterByMonth(savings, month, year);

  const incomeTotal = incomeItems.reduce((s, i) => s + Number(i.amount), 0);
  const expenseTotal = expenseItems.reduce((s, e) => s + Number(e.amount), 0);
  const savingsTotal = savingsItems.reduce((s, sv) => s + Number(sv.amount), 0);

  const groups = new Map<string, Expense[]>();
  for (const e of expenseItems) {
    const cat = e.category || "אחר";
    const arr = groups.get(cat) || [];
    arr.push(e);
    groups.set(cat, arr);
  }
  const expenseGroups: ExpenseGroup[] = [...groups.entries()].map(([category, items]) => ({
    category,
    label: categoryLabel(category),
    items,
    total: items.reduce((s, e) => s + Number(e.amount), 0),
  })).sort((a, b) => b.total - a.total);

  const tax = calculateTaxes(incomeItems, expenseItems, savingsItems, taxSettings);
  const netBeforeTax = incomeTotal - expenseTotal - savingsTotal;
  const netAfterTax = netBeforeTax - tax.totalTax;

  return {
    incomeItems,
    incomeTotal,
    expenseGroups,
    expenseTotal,
    savingsItems,
    savingsTotal,
    tax,
    netBeforeTax,
    netAfterTax,
  };
}

export function vatForMonth(incomes: Income[], taxSettings: TaxSettings | null, month: number, year: number): number {
  const items = filterByMonth(incomes, month, year);
  return Math.round(totalVat(items, taxSettings?.vat_rate ?? 17));
}
