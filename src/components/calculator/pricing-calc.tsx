"use client";

import { useState } from "react";
import { priceForNet } from "./calculator-utils";

export function PricingCalculator() {
  const [desiredNet, setDesiredNet] = useState("");
  const [expenses, setExpenses] = useState("");
  const [vatRate, setVatRate] = useState(18);

  const net = parseFloat(desiredNet) || 0;
  const monthlyExpenses = parseFloat(expenses) || 0;
  const result = priceForNet(net, monthlyExpenses, vatRate);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          סכום נטו רצוי ביד (₪)
        </label>
        <input
          type="number"
          value={desiredNet}
          onChange={(e) => setDesiredNet(e.target.value)}
          placeholder='"אני רוצה להרוויח..."'
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
        <label className="block text-xs font-medium text-slate-500 mb-1">שיעור מע״מ (%)</label>
        <input
          type="number"
          value={vatRate}
          onChange={(e) => setVatRate(parseFloat(e.target.value) || 18)}
          className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm min-h-[120px] flex flex-col justify-center">
        {net > 0 ? (
          <>
            <div className="text-center mb-2">
              <p className="text-xs text-slate-500 mb-1">כדי לקבל <span className="font-bold text-slate-700">₪{result.desiredNet.toLocaleString()}</span> נטו</p>
              <p className="text-lg font-bold text-blue-700">
                עליך לחייב: ₪{result.requiredGross.toLocaleString()}
              </p>
            </div>
            <div className="border-t pt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">מע״מ ({vatRate}%)</span>
                <span className="font-bold">₪{result.vat.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">מס הכנסה + ביטוח לאומי</span>
                <span className="font-bold">₪{result.estimatedTax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-medium border-t pt-1">
                <span>נטו סופי</span>
                <span className="text-emerald-600">₪{result.finalNet.toLocaleString()}</span>
              </div>
            </div>
          </>
        ) : (
          <p className="text-slate-400 text-sm text-center">הזן סכום נטו רצוי</p>
        )}
      </div>
    </div>
  );
}
