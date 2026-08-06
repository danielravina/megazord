"use client";

import { useCallback } from "react";
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

function spanClass(span: number) {
  return span === 4
    ? "sm:col-span-2 md:col-span-3 lg:col-span-4"
    : span === 3
      ? "sm:col-span-2 md:col-span-3 lg:col-span-3"
      : span === 2
        ? "sm:col-span-2 md:col-span-2 lg:col-span-2"
        : "col-span-1";
}

interface GridProps {
  tiles: DashboardTileType[];
  rawData: DashboardRawData;
  loading: boolean;
  customizing: boolean;
  onReorder: (tiles: DashboardTileType[]) => void;
  onSpanChange: (id: string, span: number) => void;
  onRemove: (id: string) => void;
  onChangeType: (id: string, type: WidgetType) => void;
  onChangeSource: (id: string, source: string) => void;
  onChangeTimeRange: (id: string, range: TimeRange) => void;
  onShowPicker: () => void;
}

function SortableTile({
  tile,
  children,
}: {
  tile: DashboardTileType;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: tile.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={spanClass(tile.span)} {...attributes} {...listeners}>
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
  onSpanChange,
  onRemove,
  onChangeType,
  onChangeSource,
  onChangeTimeRange,
  onShowPicker,
}: GridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-auto">
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
                onSpanChange={onSpanChange}
                onRemove={onRemove}
                onChangeType={onChangeType}
                onChangeSource={onChangeSource}
                onChangeTimeRange={onChangeTimeRange}
              />
            );

            if (customizing) {
              return (
                <SortableTile key={tile.id} tile={tile}>
                  {content}
                </SortableTile>
              );
            }

            return <div key={tile.id} className={spanClass(tile.span)}>{content}</div>;
          })}

          {customizing && (
            <button
              onClick={onShowPicker}
              className="col-span-1 min-h-[100px] rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
            >
              <Plus size={24} className="text-slate-400" />
            </button>
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
}
