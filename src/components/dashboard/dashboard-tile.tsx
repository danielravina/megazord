"use client";

import { useState, useRef } from "react";
import { GripHorizontal, MoreVertical, X, LayoutGrid, ArrowLeftRight } from "lucide-react";
import type { DashboardTile, WidgetType, WidgetData, TimeRange } from "@/components/dashboard/dashboard-types";
import {
  STATIC_WIDGETS,
  DISPLAY_TYPES,
  RESIZABLE_TYPES,
  TIME_RANGE_LABELS,
  DEFAULT_SOURCE_BY_TYPE,
  STANDALONE_SOURCES,
} from "@/components/dashboard/dashboard-types";
import { widgetRegistry, widgetMeta } from "@/components/dashboard/widgets/widget-registry";
import { DATA_SOURCES } from "@/components/dashboard/data-sources/sources";
import { WidgetPicker, WIDGET_ITEMS } from "@/components/dashboard/widget-picker";
import type { WidgetItem } from "@/components/dashboard/widget-picker";
import { Dropdown, MenuLabel, MenuItem } from "@/components/ui/dropdown";
import {
  computeRowInfo,
  computeResizeWidth,
} from "@/components/dashboard/resize-utils";

interface TileProps {
  tile: DashboardTile;
  data: WidgetData;
  loading?: boolean;
  customizing: boolean;
  onResizePreview: (widths: Record<string, number>) => void;
  onResizeEnd: (id: string, width: number) => void;
  onRemove: (id: string) => void;
  onChangeType: (id: string, type: WidgetType) => void;
  onChangeSource: (id: string, source: string) => void;
  onChangeTimeRange: (id: string, range: TimeRange) => void;
  dragHandleProps?: Record<string, unknown>;
}

const TIME_RANGES: TimeRange[] = [
  "this_month", "last_month", "this_quarter", "this_year", "last_30_days", "all_time",
];

function TileSkeleton({ type }: { type: string }) {
  if (type === "hero") {
    return (
      <div className="flex flex-col items-center justify-center gap-2 flex-1 animate-pulse">
        <div className="w-24 h-8 rounded-lg bg-slate-200" />
        <div className="w-16 h-3 rounded bg-slate-100" />
      </div>
    );
  }

  if (type === "table") {
    return (
      <div className="flex flex-col gap-2.5 pt-1 animate-pulse">
        {[100, 88, 76, 64].map((w, i) => (
          <div key={i} className="h-3 rounded bg-slate-100" style={{ width: `${w}%` }} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1 animate-pulse">
      <div className="h-full min-h-[120px] rounded-lg bg-slate-100 flex items-center justify-center">
        {type === "doughnut" ? (
          <div className="w-24 h-24 rounded-full bg-slate-200/70" />
        ) : (
          <div className="flex items-end gap-2 h-3/4">
            {[40, 70, 50, 90, 60, 80].map((h, i) => (
              <div key={i} className="w-3 rounded-t bg-slate-200/70" style={{ height: `${h}%` }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const MIN_TILE_WIDTH = 288;

interface ResizeState {
  anchorRight: number;
  containerLeft: number;
  containerWidth: number;
  minWidth: number;
  frozen: Record<string, number>;
  startFraction: number;
}

function ResizeHandle({
  tile,
  active,
  onActiveChange,
  onResizePreview,
  onResizeEnd,
}: {
  tile: DashboardTile;
  active: boolean;
  onActiveChange: (active: boolean) => void;
  onResizePreview: (widths: Record<string, number>) => void;
  onResizeEnd: (id: string, width: number) => void;
}) {
  const resizeRef = useRef<ResizeState | null>(null);
  const fractionRef = useRef(0);
  const previewRef = useRef<Record<string, number> | null>(null);
  const rafRef = useRef<number | null>(null);

  function buildPreview(state: ResizeState, fraction: number): Record<string, number> {
    return { ...state.frozen, [tile.id]: fraction };
  }

  function schedulePreview(preview: Record<string, number>) {
    const fraction = preview[tile.id] ?? 0;
    if (Math.abs(fraction - fractionRef.current) < 0.002) return;
    fractionRef.current = fraction;
    previewRef.current = preview;
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (previewRef.current) onResizePreview(previewRef.current);
    });
  }

  function startPointer(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

    const container = e.currentTarget.closest("[data-grid-container]") as HTMLElement | null;
    if (!container) return;

    const tiles = Array.from(container.querySelectorAll<HTMLElement>("[data-tile]")).map((el) => ({
      id: el.dataset.tile || "",
      rect: el.getBoundingClientRect(),
    }));

    const info = computeRowInfo(tiles, tile.id);
    const targetRect = tiles.find((t) => t.id === tile.id)?.rect;
    if (!info || !targetRect) return;

    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;

    const frozen: Record<string, number> = {};
    for (const p of info.preceding) {
      frozen[p.id] = (p.rect.right - p.rect.left) / containerWidth;
    }

    const startFraction = (targetRect.right - targetRect.left) / containerWidth;
    resizeRef.current = {
      anchorRight: targetRect.right,
      containerLeft: containerRect.left,
      containerWidth,
      minWidth: MIN_TILE_WIDTH,
      frozen,
      startFraction,
    };
    fractionRef.current = 0;

    // Lock the row immediately so the tile's leading edge is anchored before any movement
    schedulePreview(buildPreview(resizeRef.current, startFraction));

    onActiveChange(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function movePointer(e: React.PointerEvent<HTMLButtonElement>) {
    const state = resizeRef.current;
    if (!state) return;
    const widthPx = computeResizeWidth(
      e.clientX,
      state.anchorRight,
      state.minWidth,
      state.containerLeft,
    );
    schedulePreview(buildPreview(state, widthPx / state.containerWidth));
  }

  function endPointer(e: React.PointerEvent<HTMLButtonElement>) {
    const state = resizeRef.current;
    if (!state) return;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const widthPx = computeResizeWidth(
      e.clientX,
      state.anchorRight,
      state.minWidth,
      state.containerLeft,
    );
    const fraction = widthPx / state.containerWidth;
    resizeRef.current = null;
    previewRef.current = null;
    fractionRef.current = 0;
    onActiveChange(false);
    onResizeEnd(tile.id, fraction);
  }

  return (
    <button
      type="button"
      onPointerDown={startPointer}
      onPointerMove={movePointer}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      className={`absolute bottom-1.5 left-1.5 p-1 rounded-md text-slate-400 cursor-col-resize hover:text-blue-500 hover:bg-blue-50 transition-colors select-none ${
        active ? "bg-blue-50 text-blue-500" : "opacity-60"
      }`}
      style={{ touchAction: "none" }}
      title="שנה רוחב"
      aria-label="שנה רוחב"
    >
      <ArrowLeftRight size={14} />
    </button>
  );
}

export function DashboardTileComponent({
  tile,
  data,
  loading = false,
  customizing,
  onResizePreview,
  onResizeEnd,
  onRemove,
  onChangeType,
  onChangeSource,
  onChangeTimeRange,
  dragHandleProps,
}: TileProps) {
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [resizing, setResizing] = useState(false);
  const WidgetComponent = widgetRegistry[tile.type];
  const isStatic = STATIC_WIDGETS.includes(tile.type);
  const isResizable = RESIZABLE_TYPES.includes(tile.type);
  const sourceDef = tile.dataSource ? DATA_SOURCES.find((s) => s.key === tile.dataSource) : undefined;
  const title = tile.title || sourceDef?.label || widgetMeta[tile.type]?.label || "";
  const isStandaloneTile = STANDALONE_SOURCES.some((s) => s.type === tile.type);
  const activeKey = isStandaloneTile ? tile.type : tile.dataSource;

  function applyTypeChange(vt: WidgetType) {
    if (vt === tile.type) return;
    if (!DISPLAY_TYPES.includes(tile.type) && DEFAULT_SOURCE_BY_TYPE[vt]) {
      onChangeSource(tile.id, DEFAULT_SOURCE_BY_TYPE[vt]);
    }
    onChangeType(tile.id, vt);
  }

  function applySourceChange(sourceKey: string) {
    if (sourceKey === tile.dataSource) return;
    onChangeSource(tile.id, sourceKey);
    const def = DATA_SOURCES.find((s) => s.key === sourceKey);
    const compatible = def?.compatibleTypes ?? DISPLAY_TYPES;
    if (!compatible.includes(tile.type)) {
      const item = WIDGET_ITEMS.find((i) => i.key === sourceKey);
      onChangeType(tile.id, item?.defaultType || compatible[0] || "hero");
    }
  }

  function applyStandaloneChange(standalone: WidgetItem) {
    if (!standalone.type || standalone.type === tile.type) return;
    onChangeSource(tile.id, standalone.dataSource || "");
    onChangeType(tile.id, standalone.type);
  }

  function handleWidgetSelect(item: WidgetItem) {
    if (item.standalone) {
      applyStandaloneChange(item);
    } else {
      applySourceChange(item.key);
    }
  }

  if (!WidgetComponent) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        תצוגה לא נתמכת
      </div>
    );
  }

  return (
    <>
      <div
        data-tile={tile.id}
        className={`relative group bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4 flex flex-col transition-shadow h-full ${
          customizing ? "hover:shadow-md" : ""
        } ${resizing ? "ring-2 ring-blue-300" : ""}`}
        style={{ minHeight: tile.type === "calculator" ? 260 : tile.type === "calendar" ? 200 : 100 }}
        {...(dragHandleProps || {})}
      >
      {(customizing || !isStatic) && (
        <div className="flex items-center gap-2 mb-2">
          {customizing && (
            <GripHorizontal size={14} className="text-slate-400 cursor-grab active:cursor-grabbing shrink-0 opacity-50" />
          )}
          {!isStatic && <h3 className="text-xs font-bold text-slate-500 truncate">{title}</h3>}
          <div className="flex-1" />
          {!isStatic && (
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
                  <MenuLabel>תצוגה</MenuLabel>
                  {(sourceDef?.compatibleTypes ?? DISPLAY_TYPES).map((vt) => {
                    const meta = widgetMeta[vt];
                    const Icon = meta.icon;
                    return (
                      <MenuItem
                        key={vt}
                        active={tile.type === vt}
                        icon={<Icon size={14} />}
                        onClick={() => {
                          applyTypeChange(vt);
                          close();
                        }}
                      >
                        {meta.label}
                      </MenuItem>
                    );
                  })}

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
                    icon={<LayoutGrid size={14} />}
                    onClick={() => {
                      setWidgetOpen(true);
                      close();
                    }}
                  >
                    שנה וידג׳ט
                  </MenuItem>
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
        {loading && !isStatic ? (
          <TileSkeleton type={tile.type} />
        ) : (
          <WidgetComponent data={data} tile={tile} />
        )}
      </div>

      {customizing && isResizable && (
        <ResizeHandle
          tile={tile}
          active={resizing}
          onActiveChange={setResizing}
          onResizePreview={onResizePreview}
          onResizeEnd={onResizeEnd}
        />
      )}
      </div>

      <WidgetPicker
        open={widgetOpen}
        onClose={() => setWidgetOpen(false)}
        activeKey={activeKey}
        onSelect={handleWidgetSelect}
      />
    </>
  );
}
