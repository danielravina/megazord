"use client";

import {
  GripHorizontal,
  X,
  BarChart3,
  Calendar,
} from "lucide-react";
import type { DashboardTile, WidgetType, WidgetData, TimeRange } from "@/components/dashboard/dashboard-types";
import {
  RESIZABLE_TYPES,
  STATIC_WIDGETS,
} from "@/components/dashboard/dashboard-types";
import { widgetRegistry, widgetMeta } from "@/components/dashboard/widgets/widget-registry";
import { DATA_SOURCES } from "@/components/dashboard/data-sources/sources";

interface TileProps {
  tile: DashboardTile;
  data: WidgetData;
  customizing: boolean;
  onSpanChange: (id: string, span: number) => void;
  onRemove: (id: string) => void;
  onChangeType: (id: string, type: WidgetType) => void;
  onChangeSource: (id: string, source: string) => void;
  onChangeTimeRange: (id: string, range: TimeRange) => void;
  dragHandleProps?: Record<string, unknown>;
}

const TIME_RANGES: TimeRange[] = [
  "this_month", "last_month", "this_quarter", "this_year", "last_30_days", "all_time",
];

export function DashboardTileComponent({
  tile,
  data,
  customizing,
  onSpanChange,
  onRemove,
  onChangeType,
  onChangeSource: _onChangeSource,
  onChangeTimeRange,
  dragHandleProps,
}: TileProps) {
  const WidgetComponent = widgetRegistry[tile.type];
  const isResizable = RESIZABLE_TYPES.includes(tile.type);
  const isStatic = STATIC_WIDGETS.includes(tile.type);

  function cycleType() {
    const compatible = isStatic
      ? (Object.keys(widgetMeta) as WidgetType[])
      : DATA_SOURCES
          .filter((s) => s.key === tile.dataSource)
          .flatMap((s) => s.compatibleTypes);
    const unique = [...new Set(compatible)];
    const idx = unique.indexOf(tile.type);
    const next = unique[(idx + 1) % unique.length];
    onChangeType(tile.id, next);
  }

  function cycleTimeRange() {
    if (isStatic) return;
    const idx = TIME_RANGES.indexOf(tile.timeRange || "this_month");
    const next = TIME_RANGES[(idx + 1) % TIME_RANGES.length];
    onChangeTimeRange(tile.id, next);
  }

  return (
    <div
      data-tile={tile.id}
      className={`relative group bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4 flex flex-col transition-shadow h-full ${
        customizing ? "hover:shadow-md" : ""
      }`}
      style={{ minHeight: tile.type === "calculator" ? 260 : 100 }}
      {...(dragHandleProps || {})}
    >
      {/* Drag handle */}
      {customizing && (
        <div className="absolute top-2 right-2 cursor-grab active:cursor-grabbing opacity-40 hover:opacity-100 transition-opacity z-10">
          <GripHorizontal size={14} />
        </div>
      )}

      {/* Widget content */}
      <div className="flex-1 min-h-0">
        <WidgetComponent data={data} tile={tile} />
      </div>

      {/* Edit overlay — hover in customize mode */}
      {customizing && (
        <div className="absolute top-0 left-0 right-0 flex items-center justify-center gap-1 p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-20">
          <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200 px-1.5 py-1">
            {/* Data tile controls */}
            {!isStatic && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); cycleType(); }}
                  className="p-1 rounded hover:bg-slate-100 text-slate-500"
                  title="שנה תצוגה"
                >
                  <BarChart3 size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); cycleTimeRange(); }}
                  className="p-1 rounded hover:bg-slate-100 text-slate-500"
                  title="שנה טווח זמן"
                >
                  <Calendar size={14} />
                </button>
                <div className="w-px h-4 bg-slate-200 mx-0.5" />
              </>
            )}

            {/* Size buttons — only for resizable tiles */}
            {isResizable && (
              <>
                {([1, 2, 3, 4] as const).map((n) => (
                  <button
                    key={n}
                    onClick={(e) => { e.stopPropagation(); onSpanChange(tile.id, n); }}
                    className={`px-1.5 py-0.5 rounded text-xs font-medium transition-colors ${
                      tile.span === n
                        ? "bg-blue-100 text-blue-700"
                        : "text-slate-400 hover:bg-slate-100"
                    }`}
                    title={`רוחב ${n}/4`}
                  >
                    {n}
                  </button>
                ))}
                <div className="w-px h-4 bg-slate-200 mx-0.5" />
              </>
            )}

            {/* Remove button */}
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(tile.id); }}
              className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
              title="הסר"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
