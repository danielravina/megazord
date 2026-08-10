"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/components/layout/auth-provider";
import type { DashboardRawData } from "@/components/dashboard/dashboard-types";
import { emptyRawData } from "@/components/dashboard/dashboard-types";
import type { ProjectRow } from "@/components/projects/project-types";
import { normalizeProject } from "@/components/projects/project-types";

export function useDashboardData() {
  const { supabase, user } = useAuth();
  const [rawData, setRawData] = useState<DashboardRawData>(emptyRawData());
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastFetch = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const fetchData = useCallback(
    async (force = false) => {
      if (!user) return;
      if (!force && Date.now() - lastFetch.current < 60_000) {
        setLoading(false);
        return;
      }
      if (force) setIsRefreshing(true);
      else setLoading(true);

      const uid = user.id;

      try {
        const [inc, exp, sav, tax, proj, docs, todos, events, reqs] =
          await Promise.all([
            supabase
              .from("incomes")
              .select("*")
              .eq("user_id", uid)
              .order("date", { ascending: false }),
            supabase
              .from("expenses")
              .select("*")
              .eq("user_id", uid)
              .order("date", { ascending: false }),
            supabase
              .from("savings")
              .select("*")
              .eq("user_id", uid)
              .order("date", { ascending: false }),
            supabase
              .from("tax_settings")
              .select("*")
              .eq("user_id", uid)
              .maybeSingle(),
            supabase
              .from("projects")
              .select("*, customers(name)")
              .eq("user_id", uid)
              .order("start_date", { ascending: false }),
            supabase
              .from("documents")
              .select("*")
              .eq("user_id", uid)
              .order("date", { ascending: false }),
            supabase
              .from("todos")
              .select("*")
              .eq("user_id", uid)
              .order("created_at", { ascending: false }),
            supabase
              .from("events")
              .select("*")
              .eq("user_id", uid)
              .order("date", { ascending: false }),
            supabase
              .from("requests")
              .select("*")
              .eq("user_id", uid)
              .order("created_at", { ascending: false }),
          ]);

        lastFetch.current = Date.now();

        setRawData({
          incomes: (inc.data || []) as DashboardRawData["incomes"],
          expenses: (exp.data || []) as DashboardRawData["expenses"],
          savings: (sav.data || []) as DashboardRawData["savings"],
          taxSettings: (tax.data || null) as DashboardRawData["taxSettings"],
          projects: ((proj.data || []) as ProjectRow[]).map(normalizeProject) as DashboardRawData["projects"],
          documents: (docs.data || []) as DashboardRawData["documents"],
          todos: (todos.data || []) as DashboardRawData["todos"],
          events: (events.data || []) as DashboardRawData["events"],
          requests: (reqs.data || []) as DashboardRawData["requests"],
        });
      } catch {
        /* silent — stale data stays */
      }

      setLoading(false);
      setIsRefreshing(false);
    },
    [user, supabase],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const startTimer = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => fetchData(), 60_000);
    };

    startTimer();

    const onVis = () => {
      if (document.visibilityState === "visible") {
        fetchData();
        startTimer();
      } else {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = undefined;
        }
      }
    };

    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchData]);

  return {
    rawData,
    refresh: () => fetchData(true),
    isRefreshing,
    dataLoading: loading,
  };
}
