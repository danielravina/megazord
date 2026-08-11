"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/components/layout/auth-provider";
import { generateId } from "@/components/shared/generate-id";
import type { DashboardTile } from "@/components/dashboard/dashboard-types";
import { LOCKED_1x1 } from "@/components/dashboard/dashboard-types";
import { getDefaultLayout } from "@/components/dashboard/dashboard-defaults";
import { migrateSourceKey } from "@/components/dashboard/data-sources/sources";

export function useDashboardLayout() {
  const { supabase, user } = useAuth();
  const [layout, setLayout] = useState<DashboardTile[]>(getDefaultLayout());
  const [loading, setLoading] = useState(false);
  const loaded = useRef(false);

  // Load persisted layout from DB — runs once after mount, non-blocking
  useEffect(() => {
    if (!user || loaded.current) return;
    loaded.current = true;

    async function load() {
      try {
        const { data } = await supabase
          .from("user_dashboard")
          .select("layout")
          .eq("user_id", user!.id)
          .maybeSingle();

        if (data?.layout && Array.isArray(data.layout) && data.layout.length > 0) {
          const migrated = (data.layout as DashboardTile[]).map((t) => ({
            ...t,
            dataSource: t.dataSource ? migrateSourceKey(t.dataSource) : t.dataSource,
          }));
          setLayout(migrated);
        }
      } catch {
        /* keep defaults */
      }
    }

    load();
  }, [user, supabase]);

  const saveLayout = useCallback(
    async (tiles: DashboardTile[]) => {
      if (!user) return;
      const safe = tiles.map((t) => ({
        ...t,
        span: LOCKED_1x1.includes(t.type) ? 1 : t.span,
      }));
      setLayout(safe);
      try {
        await supabase.from("user_dashboard").upsert({
          user_id: user.id,
          layout: safe,
          updated_at: new Date().toISOString(),
        });
      } catch {
        /* UI already updated */
      }
    },
    [user, supabase],
  );

  const updateTile = useCallback(
    (id: string, updates: Partial<DashboardTile>) => {
      setLayout((prev) => {
        const updated = prev.map((t) => (t.id === id ? { ...t, ...updates } : t));
        saveLayout(updated);
        return updated;
      });
    },
    [saveLayout],
  );

  const removeTile = useCallback(
    (id: string) => {
      setLayout((prev) => {
        const updated = prev.filter((t) => t.id !== id);
        saveLayout(updated);
        return updated;
      });
    },
    [saveLayout],
  );

  const addTile = useCallback(
    (tile: DashboardTile) => {
      setLayout((prev) => {
        const updated = [...prev, { ...tile, id: generateId() }];
        saveLayout(updated);
        return updated;
      });
    },
    [saveLayout],
  );

  const reorderTiles = useCallback(
    (tiles: DashboardTile[]) => {
      saveLayout(tiles);
    },
    [saveLayout],
  );

  return {
    layout,
    loading,
    saveLayout,
    updateTile,
    removeTile,
    addTile,
    reorderTiles,
  };
}
