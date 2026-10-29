"use client";

import { useState, useEffect } from "react";
import { clearDebugLog, formatLogAsText, pushDebug } from "@/lib/supabase/auth-debug";

export default function DebugPage() {
  const [log, setLog] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    pushDebug("debug-page-open", {});
    const fill = () => setLog(formatLogAsText());
    const initial = setTimeout(fill, 0);
    const interval = setInterval(fill, 2000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, []);

  const handleCopy = async () => {
    const text = formatLogAsText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      const area = document.getElementById("debug-log-area") as HTMLTextAreaElement | null;
      if (area) {
        area.focus();
        area.select();
        setCopied(false);
      }
    }
  };

  const handleClear = () => {
    clearDebugLog();
    setLog(formatLogAsText());
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-2xl mx-auto py-6 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h1 className="text-xl font-bold text-slate-800">אבחון התחברות</h1>
          <ol className="text-sm text-slate-600 mt-3 list-decimal pr-5 space-y-1">
            <li>פתח את האתר רגיל, נסה להיכנס לחשבון ותן לבעיה לקרות</li>
            <li>חזור לדף הזה</li>
            <li>לחץ על העתק ושלח את הכל בוואטסאפ</li>
          </ol>
          <div className="flex gap-3 mt-5">
            <button
              onClick={handleCopy}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors"
            >
              {copied ? "מוכתן! שלח בוואטסאפ" : "העתק לוג"}
            </button>
            <button
              onClick={handleClear}
              className="border border-slate-300 text-slate-600 hover:bg-slate-50 py-2.5 px-4 rounded-lg text-sm transition-colors"
            >
              נקה
            </button>
          </div>
        </div>
        <textarea
          id="debug-log-area"
          readOnly
          value={log}
          dir="ltr"
          className="w-full h-96 font-mono text-xs bg-white border border-slate-200 rounded-xl p-3 overflow-auto"
        />
      </div>
    </div>
  );
}
