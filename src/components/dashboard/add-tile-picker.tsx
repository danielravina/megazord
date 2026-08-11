"use client";

import { WidgetPicker } from "@/components/dashboard/widget-picker";
import type { DashboardTile } from "@/components/dashboard/dashboard-types";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (tile: DashboardTile) => void;
}

export function AddTilePicker({ open, onClose, onAdd }: Props) {
  return (
    <WidgetPicker
      open={open}
      onClose={onClose}
      title="מה תרצה לראות?"
      onSelect={(item) => {
        if (item.standalone) {
          onAdd({ id: "", type: item.type as DashboardTile["type"], dataSource: item.dataSource, span: 1 });
        } else {
          onAdd({
            id: "",
            type: item.defaultType,
            dataSource: item.key,
            timeRange: item.defaultTimeRange,
            span: 1,
          });
        }
      }}
    />
  );
}
