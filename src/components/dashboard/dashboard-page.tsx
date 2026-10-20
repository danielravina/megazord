"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { useDashboardData } from "@/components/dashboard/data-sources/use-dashboard-data";
import { useAuth } from "@/components/layout/auth-provider";
import { useDashboardLayout } from "@/components/dashboard/dashboard-storage";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { AddTilePicker } from "@/components/dashboard/add-tile-picker";
import { DocumentScanner } from "@/components/scans/document-scanner";
import { MonthlyExport } from "@/components/scans/monthly-export";
import type {
  WidgetType,
  TimeRange,
} from "@/components/dashboard/dashboard-types";
import { RefreshCw, Settings, FileText, X, ChevronLeft } from "lucide-react";

const WELCOME_DISMISS_KEY = "atzmai-welcome-dismissed";

const START_STEPS = [
  {
    label: "סרקו קבלה ראשונה",
    hint: "ה-AI קולט סכומים ותאריכים אוטומטית",
    href: "/scans/",
  },
  {
    label: "הוסיפו לקוח",
    hint: "לניהול קשרים והצעות מחיר",
    href: "/customers/",
  },
  {
    label: "פתחו פרויקט",
    hint: "אפיון ומעקב התקדמות",
    href: "/projects/",
  },
];

export function DashboardPage() {
  const { supabase } = useAuth();
  const { rawData, refresh, isRefreshing, dataLoading } = useDashboardData();
  const { layout, loading: layoutLoading, removeTile, updateTile, addTile, reorderTiles } =
    useDashboardLayout();
  const [customizing, setCustomizing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // קללת פתיחה: מוצגת למשתמש עד שמופיע נתון עסקי ראשון (הכנסה/הוצאה/מסמך/לקוח/פרויקט)
  const [welcomeDismissed, setWelcomeDismissed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(WELCOME_DISMISS_KEY) === "1",
  );
  const showWelcome =
    !dataLoading &&
    !welcomeDismissed &&
    rawData.incomes.length === 0 &&
    rawData.expenses.length === 0 &&
    rawData.documents.length === 0 &&
    rawData.projects.length === 0 &&
    rawData.savings.length === 0;

  function dismissWelcome() {
    localStorage.setItem(WELCOME_DISMISS_KEY, "1");
    setWelcomeDismissed(true);
  }

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-700">לוח בקרה</h2>
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
        <div className="flex flex-wrap items-center gap-2">
          <DocumentScanner onScanned={refresh} />
          <Button variant="secondary" size="sm" onClick={() => setShowReport(true)}>
            <FileText size={14} />
            דוח חודשי
          </Button>
          <Button
            variant={customizing ? "primary" : "secondary"}
            size="sm"
            className="max-md:hidden"
            onClick={() => {
              setCustomizing((c) => !c);
            }}
          >
            <Settings size={14} className="ml-1" />
            {customizing ? "סיום" : "התאמה אישית"}
          </Button>
        </div>
      </div>

      {showWelcome && (
        <div className="relative bg-gradient-to-l from-blue-50 via-sky-50 to-white border border-blue-100 rounded-2xl p-5 sm:p-6">
          <button
            onClick={dismissWelcome}
            className="absolute top-3 left-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-colors"
            aria-label="סגור"
          >
            <X size={16} />
          </button>
          <h3 className="text-lg font-bold text-slate-800">
            ברוכים הבאים לעצמאי
          </h3>
          <p className="text-sm text-slate-500 mt-0.5 mb-4">
            הדשבורד יתמלא אוטומטית ברגע שיהיו נתונים. שלוש דקות התחלה:
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {START_STEPS.map((step, i) => (
              <Link
                key={step.href}
                href={step.href}
                className="flex-1 flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3 hover:border-blue-300 hover:shadow-sm transition-all group"
              >
                <span className="w-7 h-7 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-700">{step.label}</span>
                  <span className="block text-xs text-slate-400 truncate">{step.hint}</span>
                </span>
                <ChevronLeft size={16} className="text-slate-300 ml-auto shrink-0 group-hover:text-blue-500 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      )}

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
        invoices={rawData.invoices}
        documents={rawData.documents}
        taxSettings={rawData.taxSettings}
        supabase={supabase}
      />
    </div>
  );
}
