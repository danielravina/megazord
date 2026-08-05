"use client";

import { GripHorizontal, MoreVertical, X } from "lucide-react";
import type { DashboardTile, WidgetType, WidgetData, TimeRange } from "@/components/dashboard/dashboard-types";
import {
  RESIZABLE_TYPES,
  STATIC_WIDGETS,
  TIME_RANGE_LABELS,
} from "@/components/dashboard/dashboard-types";
import { widgetRegistry, widgetMeta } from "@/components/dashboard/widgets/widget-registry";
import { DATA_SOURCES } from "@/components/dashboard/data-sources/sources";
import { Dropdown, MenuLabel, MenuItem } from "@/components/ui/dropdown";

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

const SPAN_LABELS: Record<number, string> = {
  1: "¼ (1/4)",
  2: "½ (2/4)",
  3: "¾ (3/4)",
  4: "מלא (4/4)",
};

export function DashboardTileComponent({
  tile,
  data,
  customizing,
  onSpanChange,
  onRemove,
  onChangeType,
  onChangeTimeRange,
  dragHandleProps,
}: TileProps) {
  const WidgetComponent = widgetRegistry[tile.type];
  const isStatic = STATIC_WIDGETS.includes(tile.type);
  const isResizable = RESIZABLE_TYPES.includes(tile.type);
  const sourceDef = tile.dataSource ? DATA_SOURCES.find((s) => s.key === tile.dataSource) : undefined;
  const title = tile.title || sourceDef?.label || "";

  if (!WidgetComponent) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        תצוגה לא נתמכת
      </div>
    );
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
      {(customizing || !isStatic) && (
        <div className="flex items-center gap-2 mb-2">
          {customizing && (
            <GripHorizontal size={14} className="text-slate-400 cursor-grab active:cursor-grabbing shrink-0 opacity-50" />
          )}
          {!isStatic && <h3 className="text-xs font-bold text-slate-500 truncate">{title}</h3>}
          <div className="flex-1" />
          {customizing && (
            <Dropdown
              align="left"
              trigger={
                <button
                  className="p-1 rounded hover:bg-slate-100 text-slate-500"
                  title="אפשרויות"
                  aria-label="אפשרויות טייל"
                >
                  <MoreVertical size={14} />
                </button>
              }
            >
              {(close) => (
                <div>
                  {!isStatic && sourceDef && sourceDef.compatibleTypes.length > 1 && (
                    <>
                      <MenuLabel>תצוגה</MenuLabel>
                      {sourceDef.compatibleTypes.map((vt) => {
                        const meta = widgetMeta[vt];
                        const Icon = meta.icon;
                        return (
                          <MenuItem
                            key={vt}
                            active={tile.type === vt}
                            icon={<Icon size={14} />}
                            onClick={() => {
                              onChangeType(tile.id, vt);
                              close();
                            }}
                          >
                            {meta.label}
                          </MenuItem>
                        );
                      })}
                    </>
                  )}

                  {isResizable && (
                    <>
                      <MenuLabel>רוחב</MenuLabel>
                      {([1, 2, 3, 4] as const).map((n) => (
                        <MenuItem
                          key={n}
                          active={tile.span === n}
                          onClick={() => {
                            onSpanChange(tile.id, n);
                            close();
                          }}
                        >
                          {SPAN_LABELS[n]}
                        </MenuItem>
                      ))}
                    </>
                  )}

                  {!isStatic && sourceDef?.needsTimeRange && (
                    <>
                      <MenuLabel>טווח זמן</MenuLabel>
                      {TIME_RANGES.map((r) => (
                        <MenuItem
                          key={r}
                          active={tile.timeRange === r}
                          onClick={() => {
                            onChangeTimeRange(tile.id, r);
                            close();
                          }}
                        >
                          {TIME_RANGE_LABELS[r]}
                        </MenuItem>
                      ))}
                    </>
                  )}

                  <div className="my-1 border-t border-slate-100" />
                  <MenuItem
                    onClick={() => {
                      onRemove(tile.id);
                      close();
                    }}
                    icon={<X size={14} />}
                  >
                    <span className="text-red-600">הסר</span>
                  </MenuItem>
                </div>
              )}
            </Dropdown>
          )}
        </div>
      )}

      {/* Widget content */}
      <div className="flex-1 min-h-0">
        <WidgetComponent data={data} tile={tile} />
      </div>
    </div>
  );
}
