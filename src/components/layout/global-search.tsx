"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/layout/auth-provider";
import {
  Search, Users, FolderKanban, Receipt, FileText,
  ClipboardList, CalendarDays, Building,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface SearchResult {
  type: string;
  href: string;
  title: string;
  subtitle?: string;
}

interface GlobalSearchRow {
  result_type: string;
  result_href: string;
  result_title: string;
  result_subtitle: string | null;
}

const TYPE_ICONS: Record<string, LucideIcon> = {
  "לקוחות": Users,
  "פרויקטים": FolderKanban,
  "מסמכים": Receipt,
  "סריקות": FileText,
  "משימות": ClipboardList,
  "אירועים": CalendarDays,
  "ספקים": Building,
};

async function fetchSearch(supabase: ReturnType<typeof import("@/lib/supabase/client").createClient>, q: string): Promise<SearchResult[]> {
  const { data, error } = await supabase.rpc("global_search", { search_query: q });
  if (error) return [];
  return ((data || []) as GlobalSearchRow[]).map((r) => ({
    type: r.result_type,
    href: r.result_href,
    title: r.result_title,
    subtitle: r.result_subtitle || undefined,
  }));
}

export function GlobalSearch() {
  const { supabase } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    debounceRef.current = setTimeout(async () => {
      if (q.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const res = await fetchSearch(supabase, q);
      setResults(res);
      setLoading(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, supabase]);

  const grouped = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    for (const r of results) {
      if (!map.has(r.type)) map.set(r.type, []);
      map.get(r.type)!.push(r);
    }
    return [...map.entries()];
  }, [results]);

  const hasQuery = query.trim().length >= 2;

  return (
    <div className="relative">
      <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="חיפוש..."
        className="w-40 sm:w-56 lg:w-72 bg-slate-100 rounded-lg py-2 pr-9 pl-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
      />

      {open && hasQuery && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-200 max-h-96 overflow-y-auto z-50 p-1.5">
          {loading ? (
            <div className="text-xs text-slate-400 px-3 py-2">מחפש...</div>
          ) : grouped.length === 0 ? (
            <div className="text-xs text-slate-400 px-3 py-2">אין תוצאות</div>
          ) : (
            grouped.map(([type, items]) => {
              const Icon = TYPE_ICONS[type] || Search;
              return (
                <div key={type} className="mb-1">
                  <div className="flex items-center gap-1.5 px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    <Icon size={11} />
                    {type}
                  </div>
                  {items.map((r, i) => (
                    <button
                      key={`${type}-${i}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        router.push(r.href);
                        setQuery("");
                        setOpen(false);
                      }}
                      className="w-full text-right px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="text-sm font-medium text-slate-700 truncate">{r.title}</div>
                      {r.subtitle && (
                        <div className="text-[10px] text-slate-400 truncate">{r.subtitle}</div>
                      )}
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
