"use client";

import { useState } from "react";
import { estimateTaxes } from "./calculator-utils";

export function TaxCalculator() {
  const [income, setIncome] = useState("");
  const [expenses, setExpenses] = useState("");
  const [creditPoints, setCreditPoints] = useState(2.25);

  const monthlyIncome = parseFloat(income) || 0;
  const monthlyExpenses = parseFloat(expenses) || 0;
  const result = estimateTaxes(monthlyIncome, monthlyExpenses, creditPoints);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">הכנסה חודשית (₪)</label>
        <input
          type="number"
          value={income}
          onChange={(e) => setIncome(e.target.value)}
          placeholder="לפני מס"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">הוצאות חודשיות (₪)</label>
        <input
          type="number"
          value={expenses}
          onChange={(e) => setExpenses(e.target.value)}
          placeholder="הוצאות מוכרות"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">נקודות זיכוי</label>
        <input
          type="number"
          value={creditPoints}
          step="0.25"
          min="1"
          max="12"
          onChange={(e) => setCreditPoints(parseFloat(e.target.value) || 2.25)}
          className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm min-h-[120px] flex flex-col justify-center">
        {monthlyIncome > 0 ? (
          <>
            <div className="flex justify-between">
              <span className="text-slate-500">הכנסה חודשית</span>
              <span className="font-bold">₪{result.monthlyIncome.toLocaleString()}</span>
            </div>
            {monthlyExpenses > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">הוצאות</span>
                <span className="font-bold">₪{result.monthlyExpenses.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">הכנסה חייבת</span>
              <span className="font-bold">₪{result.taxableIncome.toLocaleString()}</span>
            </div>
            <div className="border-t pt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">מס הכנסה</span>
                <span className="font-bold text-rose-500">₪{result.incomeTax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ביטוח לאומי</span>
                <span className="font-bold text-rose-500">₪{result.bituahLeumi.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-medium border-t pt-1">
                <span>סה״כ מס</span>
                <span className="text-rose-600">₪{result.totalTax.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-medium">נטו</span>
              <span className="font-bold text-lg text-emerald-600">₪{result.netIncome.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>שיעור מס אפקטיבי</span>
              <span>{result.effectiveRate}%</span>
            </div>
          </>
        ) : (
          <p className="text-slate-400 text-sm text-center">הזן ערכים כדי לראות תוצאות</p>
        )}
      </div>
    </div>
  );
}
