"use client";

import { useState } from "react";
import { addVat, removeVat } from "./calculator-utils";

export function VatCalculator() {
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState(18);

  const parsed = parseFloat(amount) || 0;
  const addResult = addVat(parsed, rate);
  const removeResult = removeVat(parsed, rate);

  return (
    <div className="space-y-4">
      <div className="flex bg-slate-100 rounded-lg p-1">
        <button
          onClick={() => setMode("add")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
            mode === "add" ? "bg-white shadow-sm text-blue-600" : "text-slate-500"
          }`}
        >
          הוסף מע״מ
        </button>
        <button
          onClick={() => setMode("remove")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
            mode === "remove" ? "bg-white shadow-sm text-blue-600" : "text-slate-500"
          }`}
        >
          הסר מע״מ
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          {mode === "add" ? "סכום לפני מע״מ" : "סכום כולל מע״מ"}
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="הזן סכום"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">שיעור מע״מ (%)</label>
        <input
          type="number"
          value={rate}
          onChange={(e) => setRate(parseFloat(e.target.value) || 18)}
          className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm min-h-[120px] flex flex-col justify-center">
        {parsed > 0 ? (
          mode === "add" ? (
            <>
              <div className="flex justify-between">
                <span className="text-slate-500">סכום לפני מע״מ</span>
                <span className="font-bold">₪{addResult.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">מע״מ ({rate}%)</span>
                <span className="font-bold text-blue-600">₪{addResult.vat.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">סה״כ כולל מע״מ</span>
                <span className="font-bold text-lg">₪{addResult.total.toLocaleString()}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-slate-500">סה״כ כולל מע״מ</span>
                <span className="font-bold">₪{removeResult.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">מע״מ ({rate}%)</span>
                <span className="font-bold text-blue-600">₪{removeResult.vat.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">סכום לפני מע״מ</span>
                <span className="font-bold text-lg">₪{removeResult.net.toLocaleString()}</span>
              </div>
            </>
          )
        ) : (
          <p className="text-slate-400 text-sm text-center">הזן סכום כדי לראות תוצאות</p>
        )}
      </div>
    </div>
  );
}
