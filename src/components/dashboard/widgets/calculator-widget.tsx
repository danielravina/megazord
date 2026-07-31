"use client";

import { useState } from "react";
import { Delete } from "lucide-react";

interface Props {
  data: unknown;
  tile: { id: string; type: string; span: number; title?: string };
}

export function CalculatorWidget({ data: _data }: Props) {
  const [input, setInput] = useState("0");
  const [expression, setExpression] = useState("");
  const [shouldReset, setShouldReset] = useState(false);

  function appendNumber(num: string) {
    setInput((prev) => {
      if (shouldReset) { setShouldReset(false); return num; }
      if (prev === "0" && num !== ".") return num;
      if (num === "." && prev.includes(".")) return prev;
      return prev.length < 10 ? prev + num : prev;
    });
  }

  function appendOperator(op: string) {
    setExpression((prev) =>
      shouldReset ? input + " " + op + " " : prev + input + " " + op + " ",
    );
    setInput("0");
    setShouldReset(false);
  }

  function clearAll() {
    setInput("0");
    setExpression("");
    setShouldReset(false);
  }

  function deleteLast() {
    if (shouldReset) { clearAll(); return; }
    setInput((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0"));
  }

  function calculate() {
    if (!expression && !shouldReset) return;
    const fullExpr = expression + input;
    try {
      const sanitized = fullExpr.replace(/[^-0-9+*/.\s]/g, "");
      const result = Function(`"use strict"; return (${sanitized})`)();
      const resultStr = Number.isInteger(result)
        ? result.toString()
        : parseFloat(result.toFixed(4)).toString();
      setExpression(fullExpr + " =");
      setInput(resultStr);
      setShouldReset(true);
    } catch {
      setInput("שגיאה");
      setTimeout(clearAll, 1500);
    }
  }

  const btn =
    "flex items-center justify-center rounded-lg text-xs font-medium transition-colors h-8 w-full";

  return (
    <div className="flex flex-col gap-1.5 h-full">
      <div className="bg-slate-50 rounded-lg p-2 flex flex-col items-end justify-end min-h-[36px] gap-0.5 border overflow-hidden">
        <div className="text-[10px] text-slate-400 h-4 overflow-hidden w-full text-right leading-4">
          {expression}
        </div>
        <div className="text-lg font-semibold tracking-wider w-full text-right text-slate-800 overflow-hidden whitespace-nowrap">
          {input}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1 flex-1">
        <button className={`${btn} col-span-2 bg-red-50 text-red-600 hover:bg-red-100`} onClick={clearAll}>
          AC
        </button>
        <button className={`${btn} bg-slate-100 text-slate-600 hover:bg-slate-200`} onClick={deleteLast}>
          <Delete size={12} />
        </button>
        <button className={`${btn} bg-blue-50 text-blue-600 hover:bg-blue-100`} onClick={() => appendOperator("/")}>
          ÷
        </button>

        {[7, 8, 9].map((n) => (
          <button key={n} className={`${btn} bg-white border border-slate-100 text-slate-700 hover:bg-slate-50`} onClick={() => appendNumber(String(n))}>
            {n}
          </button>
        ))}
        <button className={`${btn} bg-blue-50 text-blue-600 hover:bg-blue-100`} onClick={() => appendOperator("*")}>
          ×
        </button>

        {[4, 5, 6].map((n) => (
          <button key={n} className={`${btn} bg-white border border-slate-100 text-slate-700 hover:bg-slate-50`} onClick={() => appendNumber(String(n))}>
            {n}
          </button>
        ))}
        <button className={`${btn} bg-blue-50 text-blue-600 hover:bg-blue-100`} onClick={() => appendOperator("-")}>
          −
        </button>

        {[1, 2, 3].map((n) => (
          <button key={n} className={`${btn} bg-white border border-slate-100 text-slate-700 hover:bg-slate-50`} onClick={() => appendNumber(String(n))}>
            {n}
          </button>
        ))}
        <button className={`${btn} bg-blue-50 text-blue-600 hover:bg-blue-100`} onClick={() => appendOperator("+")}>
          +
        </button>

        <button className={`${btn} col-span-2 bg-white border border-slate-100 text-slate-700 hover:bg-slate-50`} onClick={() => appendNumber("0")}>
          0
        </button>
        <button className={`${btn} bg-white border border-slate-100 text-slate-700 hover:bg-slate-50`} onClick={() => appendNumber(".")}>
          .
        </button>
        <button className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700 font-bold`} onClick={calculate}>
          =
        </button>
      </div>
    </div>
  );
}
