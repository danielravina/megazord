"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { useDashboardData } from "@/components/dashboard/data-sources/use-dashboard-data";
import { useDashboardLayout } from "@/components/dashboard/dashboard-storage";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { AddTilePicker } from "@/components/dashboard/add-tile-picker";
import { DocumentScanner } from "@/components/documents/document-scanner";
import { MonthlyExport } from "@/components/documents/monthly-export";
import type {
  WidgetType,
  TimeRange,
} from "@/components/dashboard/dashboard-types";
import { RefreshCw, Settings, FileText } from "lucide-react";

export function DashboardPage() {
  const { rawData, refresh, isRefreshing, dataLoading } = useDashboardData();
  const { layout, loading: layoutLoading, removeTile, updateTile, addTile, reorderTiles } =
    useDashboardLayout();
  const [customizing, setCustomizing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const handleChangeType = (id: string, type: WidgetType) => {
    updateTile(id, { type });
  };

  const handleChangeSource = (id: string, dataSource: string) => {
    updateTile(id, { dataSource });
  };

  const handleChangeTimeRange = (id: string, timeRange: TimeRange) => {
    updateTile(id, { timeRange });
  };

  const handleWidthChange = (id: string, width: number) => {
    updateTile(id, { width });
  };

  if (layoutLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="w-40 h-8" />
            <Skeleton className="w-8 h-8" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-24 h-9 rounded-lg" />
            <Skeleton className="w-28 h-9 rounded-lg" />
            <Skeleton className="w-28 h-9 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 h-40">
              <SkeletonText className="w-24 mb-3" />
              <Skeleton className="w-full h-20 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold text-slate-700">לוח בקרה</h2>
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
        </div>
        <div className="flex items-center gap-2">
          <DocumentScanner onScanned={refresh} />
          <Button variant="secondary" size="sm" onClick={() => setShowReport(true)}>
            <FileText size={14} />
            דוח חודשי
          </Button>
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
        loading={dataLoading}
        customizing={customizing}
        onReorder={reorderTiles}
        onWidthChange={handleWidthChange}
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

      <MonthlyExport
        open={showReport}
        onClose={() => setShowReport(false)}
        incomes={rawData.incomes}
        expenses={rawData.expenses}
        savings={rawData.savings}
        taxSettings={rawData.taxSettings}
        businessName={rawData.taxSettings?.business_name || ""}
        vatNumber={rawData.taxSettings?.vat_number || ""}
        businessAddress={rawData.taxSettings?.business_address || ""}
        businessPhone={rawData.taxSettings?.business_phone || ""}
        accountantEmail={rawData.taxSettings?.accountant_email || ""}
        supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL || ""}
        supabaseKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}
      />
    </div>
  );
}
