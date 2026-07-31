"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useDashboardData } from "@/components/dashboard/data-sources/use-dashboard-data";
import { useDashboardLayout } from "@/components/dashboard/dashboard-storage";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { AddTilePicker } from "@/components/dashboard/add-tile-picker";
import type {
  DashboardTile,
  WidgetType,
  TimeRange,
} from "@/components/dashboard/dashboard-types";
import { RefreshCw, Settings } from "lucide-react";

export function DashboardPage() {
  const { rawData, refresh, isRefreshing, dataLoading } = useDashboardData();
  const { layout, loading: layoutLoading, removeTile, updateTile, addTile, reorderTiles } =
    useDashboardLayout();
  const [customizing, setCustomizing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const handleChangeType = (id: string, type: WidgetType) => {
    updateTile(id, { type });
  };

  const handleChangeSource = (id: string, dataSource: string) => {
    updateTile(id, { dataSource });
  };

  const handleChangeTimeRange = (id: string, timeRange: TimeRange) => {
    updateTile(id, { timeRange });
  };

  const handleSpanChange = (id: string, span: number) => {
    updateTile(id, { span: span as DashboardTile["span"] });
  };

  if (layoutLoading || (dataLoading && layout.length === 0)) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-700">לוח בקרה</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refresh()}
            disabled={isRefreshing}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="רענן נתונים"
          >
            <RefreshCw
              size={18}
              className={isRefreshing ? "animate-spin text-blue-500" : "text-slate-500"}
            />
          </button>
          <Button
            variant={customizing ? "primary" : "secondary"}
            size="sm"
            onClick={() => {
              setCustomizing((c) => !c);
            }}
          >
            <Settings size={14} className="ml-1" />
            {customizing ? "סיום" : "התאמה אישית"}
          </Button>
        </div>
      </div>

      <DashboardGrid
        tiles={layout}
        rawData={rawData}
        customizing={customizing}
        onReorder={reorderTiles}
        onSpanChange={handleSpanChange}
        onRemove={removeTile}
        onChangeType={handleChangeType}
        onChangeSource={handleChangeSource}
        onChangeTimeRange={handleChangeTimeRange}
        onShowPicker={() => setShowPicker(true)}
      />

      <AddTilePicker
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onAdd={addTile}
      />
    </div>
  );
}
