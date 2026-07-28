"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { generateId } from "@/components/shared/generate-id";
import { useAuth } from "@/components/layout/auth-provider";
import { Delete, Calculator, Percent, Receipt, TrendingUp } from "lucide-react";
import { VatCalculator } from "./vat-calc";
import { TaxCalculator } from "./tax-calc";
import { PricingCalculator } from "./pricing-calc";

interface HistoryEntry {
  id: string;
  expression: string;
  result: string;
  created_at: string;
}

const TABS = [
  { id: "calc", label: "מחשבון", icon: Calculator },
  { id: "vat", label: "מע״מ", icon: Percent },
  { id: "tax", label: "מס", icon: Receipt },
  { id: "price", label: "תמחור", icon: TrendingUp },
] as const;

type TabId = typeof TABS[number]["id"];

export function CalculatorPage() {
  const { supabase, user } = useAuth();
  const [tab, setTab] = useState<TabId>("calc");
  const [input, setInput] = useState("0");
  const [expression, setExpression] = useState("");
  const [shouldReset, setShouldReset] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("calc_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setHistory(data || []));
  }, [user]);

  function appendNumber(num: string) {
    setInput((prev) => {
      if (shouldReset) { setShouldReset(false); return num; }
      if (prev === "0" && num !== ".") return num;
      if (num === "." && prev.includes(".")) return prev;
      return prev + num;
    });
  }

  function appendOperator(op: string) {
    setExpression((prev) => (shouldReset ? input + " " + op + " " : prev + input + " " + op + " "));
    setInput("0");
    setShouldReset(false);
  }

  function clearAll() {
    setInput("0"); setExpression(""); setShouldReset(false);
  }

  function deleteLast() {
    if (shouldReset) { clearAll(); return; }
    setInput((prev) => prev.length > 1 ? prev.slice(0, -1) : "0");
  }

  async function calculate() {
    if (!expression && !shouldReset) return;
    const fullExpr = expression + input;
    try {
      const sanitized = fullExpr.replace(/[^-0-9+*/.\s]/g, "");
      const result = Function(`"use strict"; return (${sanitized})`)();
      const resultStr = result % 1 !== 0 ? parseFloat(result.toFixed(8)).toString() : result.toString();
      const entry: HistoryEntry = {
        id: generateId(),
        expression: fullExpr,
        result: resultStr,
        created_at: new Date().toISOString(),
      };
      setHistory((prev) => [entry, ...prev].slice(0, 5));
      setExpression(fullExpr + " =");
      setInput(resultStr);
      setShouldReset(true);
      if (user) {
        supabase.from("calc_history").insert({
          id: entry.id, user_id: user.id,
          expression: fullExpr, result: resultStr,
        });
      }
    } catch {
      setInput("Error");
      setTimeout(clearAll, 1500);
    }
  }

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex bg-slate-100 rounded-xl p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-colors ${
                tab === t.id
                  ? "bg-white shadow-sm text-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex flex-col md:flex-row gap-6">
        {tab === "calc" && (
          <>
            <Card className="p-4 sm:p-6 flex-1 flex flex-col gap-4">
              <div className="bg-slate-50 rounded-xl p-4 flex flex-col items-end justify-end min-h-[80px] gap-1 overflow-hidden border">
                <div className="text-sm text-slate-400 h-5 overflow-hidden w-full text-right">{expression}</div>
                <div className="text-3xl sm:text-4xl font-semibold tracking-wider overflow-x-auto w-full text-right text-slate-800">{input}</div>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:gap-3 text-base sm:text-lg font-medium">
                <Button variant="secondary" className="col-span-2 bg-red-50 text-red-600 hover:bg-red-100 border-red-100 text-sm" onClick={clearAll}>AC</Button>
                <Button variant="secondary" className="text-sm" onClick={deleteLast}><Delete size={16} /></Button>
                <button onClick={() => appendOperator("/")} className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-3 sm:p-4 rounded-xl border border-blue-100 font-medium">÷</button>
                {[7,8,9].map(n => <Button key={n} variant="secondary" className="text-sm" onClick={() => appendNumber(String(n))}>{n}</Button>)}
                <button onClick={() => appendOperator("*")} className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-3 sm:p-4 rounded-xl border border-blue-100 font-medium">×</button>
                {[4,5,6].map(n => <Button key={n} variant="secondary" className="text-sm" onClick={() => appendNumber(String(n))}>{n}</Button>)}
                <button onClick={() => appendOperator("-")} className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-3 sm:p-4 rounded-xl border border-blue-100 font-medium">−</button>
                {[1,2,3].map(n => <Button key={n} variant="secondary" className="text-sm" onClick={() => appendNumber(String(n))}>{n}</Button>)}
                <button onClick={() => appendOperator("+")} className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-3 sm:p-4 rounded-xl border border-blue-100 font-medium">+</button>
                <Button variant="secondary" className="col-span-2 text-sm" onClick={() => appendNumber("0")}>0</Button>
                <Button variant="secondary" className="text-sm" onClick={() => appendNumber(".")}>.</Button>
                <button onClick={calculate} className="bg-green-600 text-white hover:bg-green-700 p-3 sm:p-4 rounded-xl shadow-lg shadow-green-200 text-lg sm:text-xl font-bold">=</button>
              </div>
            </Card>
            <Card className="p-4 sm:p-6 w-full md:w-64 flex flex-col gap-4 max-h-[400px]">
              <h2 className="font-bold text-slate-500 border-b pb-3 flex items-center gap-2">
                <span>היסטוריה</span>
                <span className="text-xs text-slate-400">({history.length})</span>
              </h2>
              <div className="flex flex-col gap-3 overflow-y-auto flex-1">
                {history.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-4">אין חישובים קודמים</p>
                ) : (
                  history.map((h) => (
                    <div key={h.id} className="bg-slate-50 p-3 rounded-lg border cursor-pointer hover:bg-slate-100" onClick={() => { setInput(h.result); setExpression(""); setShouldReset(false); }}>
                      <div className="text-[10px] text-slate-400">{new Date(h.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}</div>
                      <div className="text-xs text-slate-500 font-mono">{h.expression}</div>
                      <div className="text-lg font-semibold">{h.result}</div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </>
        )}

        {tab === "vat" && (
          <Card className="p-4 sm:p-6 w-full max-w-sm mx-auto">
            <VatCalculator />
          </Card>
        )}

        {tab === "tax" && (
          <Card className="p-4 sm:p-6 w-full max-w-sm mx-auto">
            <TaxCalculator />
          </Card>
        )}

        {tab === "price" && (
          <Card className="p-4 sm:p-6 w-full max-w-sm mx-auto">
            <PricingCalculator />
          </Card>
        )}
      </div>
    </div>
  );
}
