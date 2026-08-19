"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/layout/auth-provider";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonText, SkeletonCircle } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/components/shared/format-currency";
import { formatDate } from "@/components/shared/format-date";
import { generateId } from "@/components/shared/generate-id";
import { calculateTaxes } from "./tax-engine";
import { buildLedger } from "./ledger";
import type { Invoice } from "@/components/documents/invoice-types";
import type { ScanEvidence } from "./ledger";
import { ExpensePieChart } from "@/components/ui/expense-pie-chart";
import { MonthlyExport } from "@/components/scans/monthly-export";
import {
  PieChart, Wallet, Coins, Receipt, PiggyBank,
  TrendingUp, TrendingDown, Check, Clock, FileText, Plus,
} from "lucide-react";
import type { Income, Expense, TaxSettings, Saving, TaxCalculation } from "./finance-types";

const TAB_DEFS = [
  { id: "dashboard", label: "לוח בקרה", icon: PieChart },
  { id: "incomes", label: "הכנסות", icon: Coins },
  { id: "expenses", label: "הוצאות", icon: Receipt },
  { id: "savings", label: "חסכונות", icon: PiggyBank },
] as const;

const EXPENSE_CATEGORIES = [
  { value: "שיווק", label: "שיווק" },
  { value: "שכירות", label: "שכירות" },
  { value: "חשבונות", label: "חשבונות" },
  { value: "פרויקט", label: "פרויקט" },
  { value: "רכש", label: "רכש" },
  { value: "הפרשות", label: "הפרשות" },
];

const SAVING_TYPES = [
  { value: "קרן השתלמות", label: "קרן השתלמות" },
  { value: "פנסיה", label: "פנסיה" },
  { value: "קופת גמל", label: "קופת גמל להשקעה" },
  { value: "אחר", label: "אחר" },
];

function getNextBillingDay(day: number): string {
  const today = new Date();
  const maxDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const safeDay = Math.min(day, maxDay);
  const target = new Date(today.getFullYear(), today.getMonth(), safeDay);
  if (today.getDate() >= safeDay) {
    target.setMonth(target.getMonth() + 1);
  }
  return target.toLocaleDateString("he-IL", { day: "numeric", month: "numeric" });
}

export function FinancePage() {
  const { supabase, user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const transactionParam = searchParams.get("transaction");
  const [tab, setTab] = useState<string>("dashboard");
  const [loading, setLoading] = useState(true);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [savings, setSavings] = useState<Saving[]>([]);
  const [taxSettings, setTaxSettings] = useState<TaxSettings | null>(null);
  const [showReport, setShowReport] = useState(false);

  // Form states (savings only — income/expense are derived from evidence)
  const [savType, setSavType] = useState("קרן השתלמות");
  const [savAmount, setSavAmount] = useState("");
  const [savDate, setSavDate] = useState(new Date().toISOString().split("T")[0]);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Switch to the requested tab directly when navigating with ?tab=<id> (e.g. from global search)
  useEffect(() => {
    if (!tabParam || !TAB_DEFS.some((t) => t.id === tabParam)) return;
    const t = setTimeout(() => setTab(tabParam), 0);
    return () => clearTimeout(t);
  }, [tabParam]);

  // Scroll to + highlight the transaction when navigating with ?transaction=<id> (e.g. from global search)
  useEffect(() => {
    if (!transactionParam) return;
    const start = setTimeout(() => setHighlightId(transactionParam), 0);
    const clear = setTimeout(() => setHighlightId(null), 3000);
    return () => { clearTimeout(start); clearTimeout(clear); };
  }, [transactionParam]);

  useEffect(() => {
    if (loading || !transactionParam) return;
    const inc = incomes.find((i) => i.id === transactionParam);
    const exp = expenses.find((e) => e.id === transactionParam);
    const rowId = inc ? `income-${transactionParam}` : exp ? `expense-${transactionParam}` : null;
    if (!rowId) return;
    const scroll = setTimeout(() => {
      document.getElementById(rowId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    return () => clearTimeout(scroll);
  }, [loading, incomes, expenses, transactionParam]);

  useEffect(() => {
    if (!user) return;
    const uid = user.id;
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [invRes, docRes, savRes, taxRes] = await Promise.all([
        supabase.from("invoices").select("*").eq("user_id", uid),
        supabase.from("documents").select("*").eq("user_id", uid),
        supabase.from("savings").select("*").eq("user_id", uid).order("date", { ascending: false }),
        supabase.from("tax_settings").select("*").eq("user_id", uid).maybeSingle(),
      ]);
      if (cancelled) return;
      if (invRes.error) toast("שגיאה בטעינת המסמכים", "error");
      if (docRes.error) toast("שגיאה בטעינת הסריקות", "error");
      if (savRes.error) toast("שגיאה בטעינת חסכונות", "error");
      if (taxRes.error && taxRes.error.code !== "PGRST116") toast("שגיאה בטעינת הגדרות מס", "error");
      const vatStatus = (taxRes.data as TaxSettings | null)?.vat_status ?? "morashi";
      const { incomes: derivedIn, expenses: derivedEx } = buildLedger(
        (invRes.data || []) as unknown as Invoice[],
        (docRes.data || []) as unknown as ScanEvidence[],
        vatStatus,
      );
      setIncomes(derivedIn);
      setExpenses(derivedEx);
      setSavings(savRes.data || []);
      setTaxSettings(taxRes.data || null);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [user, supabase]);

  const taxCalc: TaxCalculation = calculateTaxes(incomes, expenses, savings, taxSettings);

  async function addSaving(e: React.FormEvent) {
    e.preventDefault();
    if (!savAmount || !user) return;
    const row: Saving = {
      id: generateId(), user_id: user.id, fund_type: savType,
      amount: parseFloat(savAmount), date: savDate,
      created_at: new Date().toISOString(),
    };
    setSavings((p) => [row, ...p]);
    setSavAmount("");
    const { error } = await supabase.from("savings").insert({
      id: row.id, user_id: user.id, fund_type: savType,
      amount: parseFloat(savAmount), date: savDate,
    });
    if (error) { setSavings((p) => p.filter((s) => s.id !== row.id)); toast("שגיאה", "error"); }
  }

  if (loading && incomes.length === 0 && expenses.length === 0) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Skeleton className="w-48 h-8" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
              <div className="space-y-2">
                <SkeletonText className="w-24" />
                <Skeleton className="h-8 w-32" />
              </div>
              <SkeletonCircle className="w-12 h-12" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="flex border-b border-slate-200 px-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-20 my-4 mx-2 rounded" />
            ))}
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                  <SkeletonText className="w-24" />
                  <Skeleton className="h-7 w-28" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
                  <Skeleton className="w-40 h-5 mb-4" />
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Wallet size={24} className="text-blue-500" />
          ניהול כספים
        </h1>
        <Button variant="secondary" size="sm" onClick={() => setShowReport(true)}>
          <FileText size={14} />
          דוח חודשי
        </Button>
      </div>

      {/* Totals Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 mb-1">סך הכנסות</p>
            <p className="text-3xl font-bold text-emerald-600">
              {formatCurrency(incomes.reduce((s, i) => s + Number(i.amount), 0))}
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
            <TrendingUp size={20} className="text-emerald-600" />
          </div>
        </Card>
        <Card className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 mb-1">סך הוצאות</p>
            <p className="text-3xl font-bold text-rose-600">
              {formatCurrency(expenses.reduce((s, e) => s + Number(e.amount), 0))}
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
            <TrendingDown size={20} className="text-rose-600" />
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {TAB_DEFS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  tab === t.id
                    ? "text-blue-600 border-blue-600"
                    : "text-slate-500 border-transparent hover:text-slate-700"
                }`}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* Dashboard Tab */}
          {tab === "dashboard" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-xl">
                  <p className="text-sm text-indigo-800 mb-1">הכנסות נטו (מוערך)</p>
                  <p className="text-3xl font-bold text-indigo-600">
                    {formatCurrency(taxCalc.netIncome)}
                  </p>
                </div>
                <div className="bg-amber-50 border border-amber-100 p-5 rounded-xl">
                  <p className="text-sm text-amber-800 mb-1">הוצאות עסקיות</p>
                  <p className="text-3xl font-bold text-amber-600">
                    {formatCurrency(expenses.reduce((s, e) => s + Number(e.amount), 0) + savings.reduce((s, sv) => s + Number(sv.amount), 0))}
                  </p>
                </div>
                <div className="bg-rose-50 border border-rose-100 p-5 rounded-xl">
                  <p className="text-sm text-rose-800 mb-1">חבות מס כוללת</p>
                  <p className="text-3xl font-bold text-rose-600">
                    {formatCurrency(taxCalc.totalTax)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-5">
                  <h3 className="text-lg font-bold mb-4 border-b pb-2">חלוקת חבויות מס</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'מע"מ (מגולם)', due: getNextBillingDay(taxSettings?.vat_billing_day ?? 15), val: taxCalc.vat },
                      { label: "מקדמות מס הכנסה", due: getNextBillingDay(taxSettings?.income_tax_billing_day ?? 15), val: taxCalc.incomeTax },
                      { label: "ביטוח לאומי", due: getNextBillingDay(taxSettings?.bituah_leumi_billing_day ?? 15), val: taxCalc.bituahLeumi },
                    ].map((row) => (
                      <div key={row.label} className="flex justify-between items-center">
                        <div>
                          <span className="text-sm text-slate-600">{row.label}</span>
                          <p className="text-xs text-blue-500">חיוב הבא: {row.due}</p>
                        </div>
                        <span className="font-bold">{formatCurrency(row.val)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card className="p-5">
                  <h3 className="text-lg font-bold mb-4 border-b pb-2">מאזן כספי</h3>
                  <ExpensePieChart
                    data={EXPENSE_CATEGORIES.map((cat) => ({
                      label: cat.label,
                      amount: expenses.filter((e) => e.category === cat.value).reduce((s, e) => s + Number(e.amount), 0),
                      color: "",
                    }))}
                  />
                </Card>
              </div>
            </div>
          )}

          {/* Incomes Tab */}
          {tab === "incomes" && (
            <div>
              <p className="text-sm text-slate-500 mb-4 bg-slate-50 border rounded-lg p-3">
                ההכנסות נרשמות אוטומטית מחשבוניות מס, חשבוניות מס/קבלה וזיכויים שהונפקו ללקוחות (ולעוסק פטור או זעיר — מקבלות).
                לצפייה במסמכים יש לגשת למסך מסמכים.
              </p>
              {incomes.length === 0 ? (
                <EmptyState title="אין הכנסות להצגה" description="הנפק חשבונית מס או קבלה כדי לרשום הכנסה" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        {["תאריך", "תיאור", "סוג", "סכום"].map((h) => (
                          <th key={h} className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {incomes.map((inc) => (
                        <tr key={inc.id} id={`income-${inc.id}`} className={`hover:bg-slate-50 ${highlightId === inc.id ? "bg-blue-50" : ""}`}>
                          <td className="px-4 py-3 text-sm text-slate-500">{formatDate(inc.date)}</td>
                          <td className="px-4 py-3 text-sm font-medium">{inc.description}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${inc.type === "שוטף" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`}>
                              {inc.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-emerald-600">{formatCurrency(inc.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Expenses Tab */}
          {tab === "expenses" && (
            <div>
              <p className="text-sm text-slate-500 mb-4 bg-slate-50 border rounded-lg p-3">
                ההוצאות נרשמות אוטומטית מהמסמכים שנסרקו (קבלות, חשבוניות מס וכדומה). מסמכים מסוג חשבונית עסקה (תשלום עתידי) יירשמו רק לאחר סימונם כשולמו.
              </p>
              {expenses.length === 0 ? (
                <EmptyState title="אין הוצאות להצגה" description="סרוק קבלה או חשבונית כדי לרשום הוצאה" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        {["תאריך", "תיאור", "קטגוריה", "סטטוס", "סכום"].map((h) => (
                          <th key={h} className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {expenses.map((exp) => (
                        <tr key={exp.id} id={`expense-${exp.id}`} className={`hover:bg-slate-50 ${highlightId === exp.id ? "bg-blue-50" : ""}`}>
                          <td className="px-4 py-3 text-sm text-slate-500">{formatDate(exp.date)}</td>
                          <td className="px-4 py-3 text-sm font-medium">{exp.description}</td>
                          <td className="px-4 py-3 text-sm text-slate-500">{exp.category}</td>
                          <td className="px-4 py-3 text-sm">
                            {exp.is_paid ? (
                              <span className="text-emerald-500 flex items-center gap-1"><Check size={12} /> שולם</span>
                            ) : (
                              <span className="text-amber-500 flex items-center gap-1"><Clock size={12} /> ממתין</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-rose-600">{formatCurrency(exp.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Savings Tab */}
          {tab === "savings" && (
            <div>
              <form onSubmit={addSaving} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6 bg-slate-50 p-4 rounded-lg border">
                <Select label="סוג הקופה" options={SAVING_TYPES} value={savType} onChange={(e) => setSavType(e.target.value)} />
                <Input label="תאריך הפקדה" type="date" value={savDate} onChange={(e) => setSavDate(e.target.value)} required />
                <Input label="סכום (₪)" type="number" min="0" step="0.01" value={savAmount} onChange={(e) => setSavAmount(e.target.value)} required />
                <div className="flex items-end">
                  <Button type="submit"><Plus size={14} /> הוסף הפקדה</Button>
                </div>
              </form>
              {savings.length === 0 ? (
                <EmptyState title="אין הפקדות להצגה" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        {["תאריך", "סוג הקרן", "סכום"].map((h) => (
                          <th key={h} className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {savings.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-500">{formatDate(s.date)}</td>
                          <td className="px-4 py-3 text-sm font-medium">{s.fund_type}</td>
                          <td className="px-4 py-3 text-sm font-bold text-teal-600">{formatCurrency(s.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      <MonthlyExport
        open={showReport}
        onClose={() => setShowReport(false)}
        incomes={incomes}
        expenses={expenses}
        savings={savings}
        taxSettings={taxSettings}
        businessName={taxSettings?.business_name || ""}
        vatNumber={taxSettings?.vat_number || ""}
        businessAddress={taxSettings?.business_address || ""}
        businessPhone={taxSettings?.business_phone || ""}
        accountantEmail={taxSettings?.accountant_email || ""}
        supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL || ""}
        supabaseKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}
      />
    </div>
  );
}
