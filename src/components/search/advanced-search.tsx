"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/layout/auth-provider";
import { useToast } from "@/components/ui/toast";
import {
  Search, Users, FolderKanban, Receipt, FileText,
  CalendarDays, Building, SlidersHorizontal, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface AdvancedSearchRow {
  result_type: string;
  result_href: string;
  result_title: string;
  result_subtitle: string | null;
}

interface SearchResult {
  type: string;
  href: string;
  title: string;
  subtitle?: string;
}

const TYPE_ICONS: Record<string, LucideIcon> = {
  "לקוחות": Users,
  "פרויקטים": FolderKanban,
  "דו״חות": FileText,
  "מסמכים": Receipt,
  "אירועים": CalendarDays,
  "ספקים": Building,
};

export function AdvancedSearch() {
  const { supabase, user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRef = useRef(false);

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [dateFrom, setDateFrom] = useState(searchParams.get("from") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("to") || "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function runSearch(q: string, from: string, to: string) {
    if (q.trim().length < 2 && !from && !to) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    const { data, error } = await supabase.rpc("advanced_search", {
      search_query: q.trim(),
      date_from: from || null,
      date_to: to || null,
    });
    if (error) toast("שגיאה בחיפוש", "error");
    setResults(
      ((data || []) as AdvancedSearchRow[]).map((r) => ({
        type: r.result_type,
        href: r.result_href,
        title: r.result_title,
        subtitle: r.result_subtitle || undefined,
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    if (!user || initialRef.current) return;
    initialRef.current = true;
    const q = searchParams.get("q") || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    if (q || from || to) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      runSearch(q, from, to);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const grouped = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    for (const r of results) {
      if (!map.has(r.type)) map.set(r.type, []);
      map.get(r.type)!.push(r);
    }
    return [...map.entries()];
  }, [results]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    const qs = params.toString();
    router.replace(qs ? `/search/?${qs}` : "/search/");
    runSearch(query, dateFrom, dateTo);
  }

  function handleClear() {
    setQuery("");
    setDateFrom("");
    setDateTo("");
    setResults([]);
    setSearched(false);
    router.replace("/search/");
  }

  const hasInput = query.trim().length >= 2 || dateFrom || dateTo;
  const totalResults = results.length;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <SlidersHorizontal size={24} className="text-blue-500" />
          חיפוש מתקדם
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 mb-6 space-y-4"
      >
        <div className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="מילות חיפוש..."
            autoComplete="off"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pr-9 pl-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-slate-500 mb-1">מתאריך</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-slate-500 mb-1">עד תאריך</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </label>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || !hasInput}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2 active:scale-95 text-sm"
          >
            <Search size={15} />
            חפש
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5"
          >
            <X size={15} />
            נקה
          </button>
        </div>
      </form>

      {loading ? (
        <div className="text-sm text-slate-400 text-center py-10">מחפש...</div>
      ) : !hasInput && !searched ? (
        <div className="text-sm text-slate-400 text-center py-10">
          הזן מילות חיפוש או טווח תאריכים כדי להתחיל
        </div>
      ) : searched && totalResults === 0 ? (
        <div className="text-sm text-slate-400 text-center py-10">אין תוצאות</div>
      ) : (
        grouped.map(([type, items]) => {
          const Icon = TYPE_ICONS[type] || Search;
          return (
            <div key={type} className="mb-4">
              <div className="flex items-center gap-1.5 px-1 pt-2 pb-1 text-xs font-bold text-slate-400">
                <Icon size={13} />
                {type}
                <span className="text-slate-300 font-medium">({items.length})</span>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                {items.map((r, i) => (
                  <button
                    key={`${type}-${i}`}
                    onClick={() => router.push(r.href)}
                    className="w-full text-right px-4 py-2.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="text-sm font-medium text-slate-700 truncate">{r.title}</div>
                    {r.subtitle && (
                      <div className="text-xs text-slate-400 truncate">{r.subtitle}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })
      )}

      {searched && !loading && totalResults > 0 && (
        <div className="text-xs text-slate-400 text-center mt-2">
          נמצאו {totalResults} תוצאות
        </div>
      )}
    </div>
  );
}
