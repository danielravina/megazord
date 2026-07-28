"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/layout/auth-provider";
import { CalculatorPage } from "@/components/calculator/calculator-page";
import { ExpensePieChart } from "@/components/ui/expense-pie-chart";
import { FutureTaxWidget } from "@/components/ui/future-tax-widget";
import { Modal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { formatCurrencyShort } from "@/components/shared/format-currency";
import {
  Calculator, FileText, Calendar, FolderKanban, CloudSun,
} from "lucide-react";
import Link from "next/link";
import type { Income, Expense, TaxSettings, Saving } from "@/components/finance/finance-types";
import { calculateTaxes } from "@/components/finance/tax-engine";
import type { Project } from "@/components/projects/project-types";

export function DashboardPage() {
  const { supabase, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [savings, setSavings] = useState<Saving[]>([]);
  const [taxSettings, setTaxSettings] = useState<TaxSettings | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCalculator, setShowCalculator] = useState(false);
  const [weather, setWeather] = useState<{ temp: number } | null>(null);
  const [time, setTime] = useState("");
  const [recentDocs, setRecentDocs] = useState<{ id: string; title: string; doc_type: string; total_amount: number | null; date: string; date_on_doc: string | null }[]>([]);
  const lastFetch = useRef(0);

  useEffect(() => {
    if (!user) return;
    const uid = user.id;
    let cancelled = false;

    // Skip if data is fresh (< 60 seconds old)
    if (Date.now() - lastFetch.current < 60000) {
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      const [incRes, expRes, savRes, taxRes, projRes, docRes] = await Promise.all([
        supabase.from("incomes").select("*").eq("user_id", uid),
        supabase.from("expenses").select("*").eq("user_id", uid),
        supabase.from("savings").select("*").eq("user_id", uid),
        supabase.from("tax_settings").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("projects").select("*").eq("user_id", uid),
        supabase.from("documents").select("id,title,doc_type,total_amount,date,date_on_doc").eq("user_id", uid).order("date", { ascending: false }).limit(5),
      ]);
      if (cancelled) return;
      setIncomes(incRes.data || []);
      setExpenses(expRes.data || []);
      setSavings(savRes.data || []);
      setTaxSettings(taxRes.data || null);
      setProjects(projRes.data || []);
      setRecentDocs((docRes.data || []) as typeof recentDocs);
      setLoading(false);
      lastFetch.current = Date.now();
    }
    load();
    return () => { cancelled = true; };
  }, [user, supabase]);

  useEffect(() => {
    const t = setInterval(() => {
      setTime(new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current_weather=true`
        );
        const data = await res.json();
        if (data?.current_weather) {
          setWeather({ temp: Math.round(data.current_weather.temperature) });
        }
      } catch {}
    });
  }, []);

  const taxCalc = calculateTaxes(incomes, expenses, savings, taxSettings);
  const totalIncome = incomes.reduce((s, i) => s + Number(i.amount), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalSavings = savings.reduce((s, sv) => s + Number(sv.amount), 0);
  const netWorth = Math.round(totalIncome - totalExpenses - totalSavings - taxCalc.totalTax);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "בוקר טוב" : hour < 17 ? "צהריים טובים" : "ערב טוב";
  const userName = taxSettings?.owner_name || "עצמאי";

  if (loading && incomes.length === 0 && expenses.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold text-slate-700 shrink-0">
          {greeting}, {userName}
        </h2>
        <div className="flex flex-nowrap gap-2 items-start overflow-x-auto mr-auto">
          <Link
            href="/projects/?new=1"
            className="w-16 h-16 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors shrink-0"
          >
            <FolderKanban size={18} className="text-indigo-500" />
            <span className="text-[10px] font-medium text-center leading-tight">פרויקט חדש</span>
          </Link>
          <button
            onClick={() => setShowCalculator(true)}
            className="w-16 h-16 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center gap-1 hover:bg-slate-50 transition-colors shrink-0"
          >
            <Calculator size={18} className="text-slate-500" />
            <span className="text-[10px] font-medium text-center leading-tight">מחשבון</span>
          </button>
          <div className="w-16 h-16 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center gap-0.5 shrink-0">
            <div className="flex items-center gap-1">
              <CloudSun size={14} className="text-sky-500" />
              <span className="text-xs font-bold text-slate-700">{time || "--:--"}</span>
            </div>
            <span className="text-[10px] font-medium text-slate-500 text-center leading-tight">
              {weather ? `${weather.temp}°C` : "מזג אוויר"}
            </span>
          </div>
        </div>
      </div>

      {/* Hero Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 lg:p-8 flex flex-col items-center justify-center relative overflow-hidden min-h-[200px]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/4" />
          <h2 className="text-slate-500 text-lg lg:text-xl font-medium mb-2">נטו חודשי</h2>
          <div className="text-4xl sm:text-6xl lg:text-7xl font-bold text-slate-800 tracking-tight flex items-baseline gap-2 mb-2">
            <span>₪</span>
            <span>{netWorth.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <span>ממוצע שנתי:</span>
            <span className="font-semibold text-slate-700">₪ {(netWorth * 12).toLocaleString()}</span>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">התפלגות הוצאות</h3>
          <ExpensePieChart
            data={projects
              .filter((p) => (p.expenses ?? 0) > 0)
              .map((p) => ({
                label: p.customer_name,
                amount: p.expenses ?? 0,
                color: p.color,
              }))}
          />
        </Card>
      </div>

      {/* At-a-Glance Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Recent Documents */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3 border-b pb-2">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
              <FileText size={16} className="text-blue-500" />
              מסמכים אחרונים
            </h3>
            <Link href="/documents/" className="text-xs text-blue-600 hover:text-blue-700">הכל →</Link>
          </div>
          {recentDocs.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">אין מסמכים עדיין</p>
          ) : (
            <div className="space-y-2">
              {recentDocs.map((doc) => (
                <Link key={doc.id} href="/documents/" className="block p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <p className="text-xs font-medium text-slate-700 truncate">{doc.title}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-slate-400">{doc.date_on_doc?.split("-").reverse().join("/") || "-"}</span>
                    {doc.total_amount ? <span className="text-xs font-bold text-rose-500">{formatCurrencyShort(doc.total_amount)}</span> : <span className="text-xs text-slate-300">-</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Cash Flow */}
        <Card className="p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3 border-b pb-2">תזרים חודשי</h3>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-slate-500">הכנסות</div>
              <div className="text-xl font-bold text-emerald-600">{formatCurrencyShort(totalIncome)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">הוצאות</div>
              <div className="text-xl font-bold text-rose-500">{formatCurrencyShort(totalExpenses)}</div>
            </div>
            <div className="border-t pt-2 space-y-1 text-xs text-slate-500">
              <div>• {projects.length} פרויקטים</div>
              <div>• {incomes.length} הכנסות</div>
              <div>• {expenses.length} הוצאות</div>
              <div>• {savings.length} הפקדות חסכון</div>
            </div>
          </div>
        </Card>

        {/* Future Tax */}
        <Card className="p-4">
          <FutureTaxWidget settings={taxSettings} estimatedIncome={totalIncome} />
        </Card>
      </div>

      <Modal open={showCalculator} onClose={() => setShowCalculator(false)} size="lg">
        <CalculatorPage />
      </Modal>
    </div>
  );
}
