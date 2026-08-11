"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/layout/auth-provider";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonText, SkeletonCircle } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/components/shared/format-currency";
import { formatDate } from "@/components/shared/format-date";
import { todayISO } from "@/components/shared/format-date";
import { generateId } from "@/components/shared/generate-id";
import { calculateTaxes } from "./tax-engine";
import { ExpensePieChart } from "@/components/ui/expense-pie-chart";
import { MonthlyExport } from "@/components/documents/monthly-export";
import {
  PieChart, Wallet, Coins, Receipt, Scale, PiggyBank,
  TrendingUp, TrendingDown, Plus, Save, Check, Clock, FileText,
} from "lucide-react";
import type { Income, Expense, TaxSettings, Saving, TaxCalculation } from "./finance-types";

const TAB_DEFS = [
  { id: "dashboard", label: "לוח בקרה", icon: PieChart },
  { id: "incomes", label: "הכנסות", icon: Coins },
  { id: "expenses", label: "הוצאות", icon: Receipt },
  { id: "taxes", label: "מיסים", icon: Scale },
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

const INCOME_TYPES = [
  { value: "שוטף", label: "שוטף" },
  { value: "עתידי", label: "עתידי" },
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
  const [docs, setDocs] = useState<{ id: string; title: string; date_on_doc: string | null; total_amount: number | null; folder: string | null; doc_type: string; date: string }[]>([]);
  const [showReport, setShowReport] = useState(false);

  // Form states
  const [incDesc, setIncDesc] = useState("");
  const [incAmount, setIncAmount] = useState("");
  const [incDate, setIncDate] = useState(todayISO());
  const [incType, setIncType] = useState("שוטף");
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expDate, setExpDate] = useState(todayISO());
  const [expCategory, setExpCategory] = useState("שיווק");
  const [expPaid, setExpPaid] = useState(false);
  const [savType, setSavType] = useState("קרן השתלמות");
  const [savAmount, setSavAmount] = useState("");
  const [savDate, setSavDate] = useState(todayISO());
  const [taxSaving, setTaxSaving] = useState(false);
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
      const [incRes, expRes, savRes, taxRes, docsRes] = await Promise.all([
        supabase.from("incomes").select("*").eq("user_id", uid).order("date", { ascending: false }),
        supabase.from("expenses").select("*").eq("user_id", uid).order("date", { ascending: false }),
        supabase.from("savings").select("*").eq("user_id", uid).order("date", { ascending: false }),
        supabase.from("tax_settings").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("documents").select("id, title, date_on_doc, total_amount, folder, doc_type, date").eq("user_id", uid).order("date", { ascending: false }),
      ]);
      if (cancelled) return;
      if (incRes.error) toast("שגיאה בטעינת הכנסות", "error");
      if (expRes.error) toast("שגיאה בטעינת הוצאות", "error");
      if (savRes.error) toast("שגיאה בטעינת חסכונות", "error");
      if (taxRes.error && taxRes.error.code !== "PGRST116") toast("שגיאה בטעינת הגדרות מס", "error");
      setIncomes(incRes.data || []);
      setExpenses(expRes.data || []);
      setSavings(savRes.data || []);
      setTaxSettings(taxRes.data || null);
      setDocs(docsRes.data || []);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [user, supabase]);

  const taxCalc: TaxCalculation = calculateTaxes(incomes, expenses, savings, taxSettings);

  async function addIncome(e: React.FormEvent) {
    e.preventDefault();
    if (!incDesc || !incAmount || !user) return;
    const row: Income = {
      id: generateId(), user_id: user.id, description: incDesc,
      amount: parseFloat(incAmount), date: incDate, type: incType,
      created_at: new Date().toISOString(),
    };
    setIncomes((p) => [row, ...p]);
    setIncDesc(""); setIncAmount("");
    const { error } = await supabase.from("incomes").insert({
      id: row.id, user_id: user.id, description: incDesc,
      amount: parseFloat(incAmount), date: incDate, type: incType,
    });
    if (error) { setIncomes((p) => p.filter((i) => i.id !== row.id)); toast("שגיאה", "error"); }
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!expDesc || !expAmount || !user) return;
    const row: Expense = {
      id: generateId(), user_id: user.id, description: expDesc,
      amount: parseFloat(expAmount), date: expDate, category: expCategory,
      is_paid: expPaid, created_at: new Date().toISOString(),
    };
    setExpenses((p) => [row, ...p]);
    setExpDesc(""); setExpAmount(""); setExpPaid(false);
    const { error } = await supabase.from("expenses").insert({
      id: row.id, user_id: user.id, description: expDesc,
      amount: parseFloat(expAmount), date: expDate, category: expCategory,
      is_paid: expPaid,
    });
    if (error) { setExpenses((p) => p.filter((e) => e.id !== row.id)); toast("שגיאה", "error"); }
  }

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

  async function saveTaxSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setTaxSaving(true);
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const settings: TaxSettings = {
      user_id: user.id,
      vat_rate: parseFloat(fd.get("vat_rate") as string) || 17,
      vat_frequency: fd.get("vat_frequency") as string || "bimonthly",
      vat_billing_day: parseInt(fd.get("vat_billing_day") as string) || 15,
      income_tax_advance: parseFloat(fd.get("income_tax_advance") as string) || 0,
      income_tax_billing_day: parseInt(fd.get("income_tax_billing_day") as string) || 15,
      bituah_leumi: parseFloat(fd.get("bituah_leumi") as string) || 5,
      bituah_leumi_billing_day: parseInt(fd.get("bituah_leumi_billing_day") as string) || 15,
      credit_points: parseFloat(fd.get("credit_points") as string) || 2.25,
      business_name: null,
      vat_number: null,
      business_address: null,
      business_phone: null,
      accountant_email: null,
      owner_name: null,
    };
    setTaxSettings(settings);
    const { error } = await supabase.from("tax_settings").upsert(settings);
    if (error) toast("שגיאה בשמירה", "error");
    else toast("הגדרות נשמרו", "success");
    setTaxSaving(false);
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
      <div className="flex items-center justify-between mb-6">
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
              <form onSubmit={addIncome} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6 bg-slate-50 p-4 rounded-lg border">
                <div className="md:col-span-2">
                  <Input label="תיאור" value={incDesc} onChange={(e) => setIncDesc(e.target.value)} required />
                </div>
                <Input label="סכום (₪)" type="number" min="0" step="0.01" value={incAmount} onChange={(e) => setIncAmount(e.target.value)} required />
                <Input label="תאריך" type="date" value={incDate} onChange={(e) => setIncDate(e.target.value)} required />
                <Select label="סוג" options={INCOME_TYPES} value={incType} onChange={(e) => setIncType(e.target.value)} />
                <div className="md:col-span-5 flex justify-end">
                  <Button type="submit"><Plus size={14} /> הוסף הכנסה</Button>
                </div>
              </form>
              {incomes.length === 0 ? (
                <EmptyState title="אין הכנסות להצגה" />
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
              <form onSubmit={addExpense} className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-6 bg-slate-50 p-4 rounded-lg border">
                <div className="md:col-span-2">
                  <Input label="תיאור" value={expDesc} onChange={(e) => setExpDesc(e.target.value)} required />
                </div>
                <Input label="סכום (₪)" type="number" min="0" step="0.01" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} required />
                <Input label="תאריך" type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} required />
                <Select label="קטגוריה" options={EXPENSE_CATEGORIES} value={expCategory} onChange={(e) => setExpCategory(e.target.value)} />
                <div className="flex items-end pb-2">
                  <Checkbox label="שולם?" checked={expPaid} onChange={(e) => setExpPaid(e.target.checked)} />
                </div>
                <div className="md:col-span-6 flex justify-end">
                  <Button type="submit" variant="secondary"><Plus size={14} /> הוסף הוצאה</Button>
                </div>
              </form>
              {expenses.length === 0 ? (
                <EmptyState title="אין הוצאות להצגה" />
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

          {/* Taxes Tab */}
          {tab === "taxes" && (
            <div>
              <form onSubmit={saveTaxSettings} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-lg border">
                <div className="md:col-span-2">
                  <h3 className="text-lg font-bold border-b pb-2 mb-4">הגדרות מיסים ומועדי חיוב</h3>
                </div>
                <Input label='מע"מ (%)' name="vat_rate" type="number" min="0" max="100" step="0.1" defaultValue={taxSettings?.vat_rate ?? 17} />
                <Input label="יום חיוב מע״מ" name="vat_billing_day" type="number" min="1" max="31" defaultValue={taxSettings?.vat_billing_day ?? 15} />
                <Select label="תדירות דיווח מע״מ" name="vat_frequency" options={[{ value: "bimonthly", label: "דו-חודשי" }, { value: "monthly", label: "חודשי" }]} defaultValue={taxSettings?.vat_frequency ?? "bimonthly"} />
                <Input label="מקדמות מס הכנסה (%)" name="income_tax_advance" type="number" min="0" max="100" step="0.1" defaultValue={taxSettings?.income_tax_advance ?? 0} />
                <Input label="יום חיוב מס הכנסה" name="income_tax_billing_day" type="number" min="1" max="31" defaultValue={taxSettings?.income_tax_billing_day ?? 15} />
                <Input label="ביטוח לאומי (%)" name="bituah_leumi" type="number" min="0" max="100" step="0.1" defaultValue={taxSettings?.bituah_leumi ?? 5} />
                <Input label="יום חיוב ביטוח לאומי" name="bituah_leumi_billing_day" type="number" min="1" max="31" defaultValue={taxSettings?.bituah_leumi_billing_day ?? 15} />
                <Input label="נקודות זכות" name="credit_points" type="number" min="0" max="20" step="0.25" defaultValue={taxSettings?.credit_points ?? 2.25} />
                <div className="md:col-span-2 flex justify-end mt-4">
                  <Button type="submit" loading={taxSaving}><Save size={14} /> שמור הגדרות מיסים</Button>
                </div>
              </form>
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
        docs={docs}
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
