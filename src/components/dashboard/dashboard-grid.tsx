"use client";

import { useCallback, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "lucide-react";
import type {
  DashboardTile as DashboardTileType,
  WidgetType,
  TimeRange,
  DashboardRawData,
} from "@/components/dashboard/dashboard-types";
import { DashboardTileComponent } from "@/components/dashboard/dashboard-tile";
import { resolveDataSource } from "@/components/dashboard/data-sources/sources";

const TILE_CLASS = "flex-1 min-w-72 max-md:basis-full!";

interface GridProps {
  tiles: DashboardTileType[];
  rawData: DashboardRawData;
  loading: boolean;
  customizing: boolean;
  onReorder: (tiles: DashboardTileType[]) => void;
  onWidthChange: (id: string, width: number) => void;
  onRemove: (id: string) => void;
  onChangeType: (id: string, type: WidgetType) => void;
  onChangeSource: (id: string, source: string) => void;
  onChangeTimeRange: (id: string, range: TimeRange) => void;
  onShowPicker: () => void;
}

function tileWrapperStyle(tile: DashboardTileType, draftWidth?: number): React.CSSProperties {
  const width = draftWidth ?? tile.width;
  if (width !== undefined) {
    return { flexGrow: 0, flexShrink: 0, flexBasis: `${width * 100}%` };
  }
  return { flexGrow: 1 };
}

function SortableTile({
  tile,
  style,
  children,
}: {
  tile: DashboardTileType;
  style: React.CSSProperties;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: tile.id });

  const mergedStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...style,
  };

  return (
    <div ref={setNodeRef} style={mergedStyle} className={TILE_CLASS} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

export function DashboardGrid({
  tiles,
  rawData,
  loading,
  customizing,
  onReorder,
  onWidthChange,
  onRemove,
  onChangeType,
  onChangeSource,
  onChangeTimeRange,
  onShowPicker,
}: GridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );
  const [draftWidths, setDraftWidths] = useState<Record<string, number>>({});

  const handleResizePreview = useCallback((widths: Record<string, number>) => {
    setDraftWidths(widths);
  }, []);

  const handleResizeEnd = useCallback(
    (id: string, width: number) => {
      setDraftWidths({});
      const current = tiles.find((t) => t.id === id)?.width;
      if (current === undefined || Math.abs(width - current) > 0.001) {
        onWidthChange(id, width);
      }
    },
    [tiles, onWidthChange],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIdx = tiles.findIndex((t) => t.id === String(active.id));
      const newIdx = tiles.findIndex((t) => t.id === String(over.id));

      if (oldIdx === -1 || newIdx === -1) return;

      const reordered = [...tiles];
      const [moved] = reordered.splice(oldIdx, 1);
      reordered.splice(newIdx, 0, moved);
      onReorder(reordered);
    },
    [tiles, onReorder],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={tiles.map((t) => t.id)}
        strategy={rectSortingStrategy}
      >
        <div data-grid-container className="flex flex-wrap gap-4">
          {tiles.map((tile) => {
            const widgetData = tile.dataSource
              ? resolveDataSource(rawData, tile.dataSource, tile.timeRange || "this_month", tile.type)
              : null;

            const content = (
              <DashboardTileComponent
                tile={tile}
                data={widgetData}
                loading={loading}
                customizing={customizing}
                onResizePreview={handleResizePreview}
                onResizeEnd={handleResizeEnd}
                onRemove={onRemove}
                onChangeType={onChangeType}
                onChangeSource={onChangeSource}
                onChangeTimeRange={onChangeTimeRange}
              />
            );

            if (customizing) {
              return (
                <SortableTile key={tile.id} tile={tile} style={tileWrapperStyle(tile, draftWidths[tile.id])}>
                  {content}
                </SortableTile>
              );
            }

            return (
              <div
                key={tile.id}
                className={TILE_CLASS}
                style={tileWrapperStyle(tile, draftWidths[tile.id])}
              >
                {content}
              </div>
            );
          })}

          {customizing && (
            <button
              onClick={onShowPicker}
              className="flex-1 min-w-72 min-h-[100px] rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
            >
              <Plus size={24} className="text-slate-400" />
            </button>
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
}
