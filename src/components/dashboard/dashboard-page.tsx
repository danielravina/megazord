"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/layout/auth-provider";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { formatCurrencyShort } from "@/components/shared/format-currency";
import {
  ClipboardList, Calendar, CloudSun, Calculator,
  Layers, FolderKanban, Wallet, FileText,
} from "lucide-react";
import Link from "next/link";
import type { Income, Expense, TaxSettings, Saving } from "@/components/finance/finance-types";
import { calculateTaxes } from "@/components/finance/tax-engine";
import type { Project } from "@/components/projects/project-types";

const modules = [
  { href: "/todos/", label: "פתקים", sub: "ToDo", icon: ClipboardList, color: "text-yellow-500 bg-yellow-50 border-yellow-200" },
  { href: "/calendar/", label: "יומן", sub: "Calendar", icon: Calendar, color: "text-red-400 bg-red-50 border-red-200" },
  { href: "/weather/", label: "מזג אוויר", sub: "Weather", icon: CloudSun, color: "text-sky-500 bg-sky-50 border-sky-200" },
  { href: "/calculator/", label: "מחשבון", sub: "Calculator", icon: Calculator, color: "text-slate-500 bg-slate-50 border-slate-200" },
  { href: "/kanban/", label: "מעקב בקשות", sub: "Kanban", icon: Layers, color: "text-blue-500 bg-blue-50 border-blue-200" },
  { href: "/projects/", label: "פרויקטים", sub: "Projects", icon: FolderKanban, color: "text-indigo-500 bg-indigo-50 border-indigo-200" },
  { href: "/finance/", label: "ניהול כספים", sub: "Finance", icon: Wallet, color: "text-emerald-500 bg-emerald-50 border-emerald-200" },
  { href: "/documents/", label: "מסמכים", sub: "Documents", icon: FileText, color: "text-slate-400 bg-slate-50 border-slate-200" },
];

export function DashboardPage() {
  const { supabase, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [savings, setSavings] = useState<Saving[]>([]);
  const [taxSettings, setTaxSettings] = useState<TaxSettings | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [weather, setWeather] = useState<{ temp: number; desc: string } | null>(null);
  const [time, setTime] = useState("");

  useEffect(() => {
    if (!user) return;
    const uid = user.id;
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [incRes, expRes, savRes, taxRes, projRes] = await Promise.all([
        supabase.from("incomes").select("*").eq("user_id", uid),
        supabase.from("expenses").select("*").eq("user_id", uid),
        supabase.from("savings").select("*").eq("user_id", uid),
        supabase.from("tax_settings").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("projects").select("*").eq("user_id", uid),
      ]);
      if (cancelled) return;
      setIncomes(incRes.data || []);
      setExpenses(expRes.data || []);
      setSavings(savRes.data || []);
      setTaxSettings(taxRes.data || null);
      setProjects(projRes.data || []);
      setLoading(false);
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

  // Try geolocation for weather
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current_weather=true`,
        );
        const data = await res.json();
        if (data?.current_weather) {
          setWeather({
            temp: Math.round(data.current_weather.temperature),
            desc: "מזג אוויר",
          });
        }
      } catch {}
    });
  }, []);

  const taxCalc = calculateTaxes(incomes, expenses, savings, taxSettings);
  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalSavings = savings.reduce((s, sv) => s + sv.amount, 0);
  const netWorth = Math.round(totalIncome - totalExpenses - taxCalc.totalTax);

  const recentExpenses = [...expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const savingsByType = savings.reduce<Record<string, number>>((acc, s) => {
    acc[s.fund_type] = (acc[s.fund_type] || 0) + s.amount;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-6 justify-between items-start">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/weather/"
            className="w-24 h-24 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center gap-1 hover:bg-slate-50 transition-colors p-1"
          >
            <div className="flex items-center gap-1.5">
              <CloudSun size={18} className="text-sky-500" />
              <span className="text-sm font-bold text-slate-700">{time || "--:--"}</span>
            </div>
            <span className="text-xs font-medium text-slate-500 text-center leading-tight mt-1">
              {weather ? `${weather.temp}°C` : "מזג אוויר"}
            </span>
          </Link>
          {modules.filter(m => m.href !== "/weather/").map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className="w-24 h-24 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
              >
                <Icon size={22} className={mod.color.split(" ")[0]} />
                <span className="text-xs font-medium text-center leading-tight">{mod.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Net Worth + Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Link
            href="/documents/"
            className="w-full h-full min-h-[120px] bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center gap-3 hover:bg-slate-50 transition-colors p-4"
          >
            <FileText size={36} className="text-slate-400" />
            <span className="text-lg font-medium text-slate-700">מסמכים</span>
          </Link>
        </div>
        <Card className="lg:col-span-3 p-8 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/4" />
          <h2 className="text-slate-500 text-xl font-medium mb-2">נטו חודשי (פרויקטים)</h2>
          <div className="text-5xl sm:text-7xl font-bold text-slate-800 tracking-tight flex items-baseline gap-2 mb-4">
            <span>₪</span>
            <span>{netWorth.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500 text-lg">
            <span>ממוצע שנתי:</span>
            <span className="font-semibold text-slate-700">₪ {(netWorth * 12).toLocaleString()}</span>
          </div>
        </Card>
      </div>

      {/* Bottom Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Income & Expenses */}
        <Card className="p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">תזרים חודשי</h3>
          <div className="flex justify-between items-end mb-4">
            <div>
              <div className="text-sm text-slate-500">סך הכנסות</div>
              <div className="text-2xl font-bold text-emerald-600">{formatCurrencyShort(totalIncome)}</div>
            </div>
          </div>
          <div className="mb-4">
            <div className="text-sm text-slate-500 mb-1">סך הוצאות</div>
            <div className="text-xl font-bold text-rose-500">{formatCurrencyShort(totalExpenses)}</div>
            <ul className="mt-4 space-y-2 text-sm">
              {recentExpenses.length === 0 ? (
                <li className="text-slate-400 italic">אין הוצאות רשומות</li>
              ) : (
                recentExpenses.map((exp) => (
                  <li key={exp.id} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                    <span className="truncate max-w-[140px]">{exp.description}</span>
                    <span className="font-bold text-rose-500">{formatCurrencyShort(exp.amount)}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="mt-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <ul className="space-y-1 text-sm text-slate-600">
              <li>• {projects.length} פרויקטים פעילים</li>
              <li>• {incomes.length} הכנסות רשומות</li>
              <li>• {expenses.length} הוצאות רשומות</li>
            </ul>
          </div>
        </Card>

        {/* Savings */}
        <Card className="p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">חסכונות</h3>
          {Object.keys(savingsByType).length === 0 ? (
            <p className="text-slate-400 italic text-sm">אין הפקדות רשומות</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(savingsByType).map(([type, amount]) => (
                <div key={type}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-slate-700">{type}</span>
                    <span className="font-bold">{formatCurrencyShort(amount)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full"
                      style={{ width: `${totalSavings > 0 ? (amount / totalSavings) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">סה״כ הפקדות</span>
                  <span className="font-semibold text-blue-600">{formatCurrencyShort(totalSavings)}</span>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Loans & Assets */}
        <Card className="p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">הלוואות ועסקים</h3>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-slate-500">שווי עסק מוערך</div>
              <div className="text-3xl font-bold">₪ 300,000</div>
            </div>
            <div>
              <div className="text-sm text-slate-500 mb-2">הלוואות פעילות</div>
              <div className="bg-rose-50 p-4 rounded-lg border border-rose-100">
                <div className="flex justify-between items-end mb-2">
                  <span className="font-medium text-rose-800">הלוואה עסקית</span>
                  <span className="text-xl font-bold text-rose-700">₪ 161,200</span>
                </div>
                <div className="flex justify-between text-sm text-rose-600/80">
                  <span>החזר חודשי</span>
                  <span>₪ 4,500</span>
                </div>
                <div className="mt-3 w-full bg-rose-200 rounded-full h-1">
                  <div className="bg-rose-500 h-1 rounded-full" style={{ width: "35%" }} />
                </div>
              </div>
            </div>
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-bold">התפלגות הוצאות פרויקטים</h4>
              </div>
              {projects.filter(p => (p.expenses ?? 0) > 0).length === 0 ? (
                <p className="text-xs text-slate-400 text-center">אין הוצאות פרויקטים</p>
              ) : (
                <div className="space-y-2">
                  {projects.filter(p => (p.expenses ?? 0) > 0).slice(0, 5).map(p => (
                      <div key={p.id} className="flex justify-between text-sm">
                        <span className="text-slate-600 truncate max-w-[140px]">{p.customer_name}</span>
                        <span className="font-medium">{formatCurrencyShort(p.expenses ?? 0)}</span>
                      </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
