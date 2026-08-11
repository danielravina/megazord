import { generateId } from "@/components/shared/generate-id";
import type { DashboardTile } from "@/components/dashboard/dashboard-types";

export function getDefaultLayout(): DashboardTile[] {
  return [
    {
      id: generateId(),
      type: "calendar",
      dataSource: "calendar:today",
      span: 1,
    },
    {
      id: generateId(),
      type: "hero",
      dataSource: "income",
      timeRange: "this_month",
      span: 1,
    },
    {
      id: generateId(),
      type: "hero",
      dataSource: "expenses",
      timeRange: "this_month",
      span: 1,
    },
    {
      id: generateId(),
      type: "hero",
      dataSource: "profit",
      timeRange: "this_month",
      span: 1,
    },
    {
      id: generateId(),
      type: "hero",
      dataSource: "tax",
      timeRange: "this_month",
      span: 1,
    },
    {
      id: generateId(),
      type: "doughnut",
      dataSource: "expenses",
      timeRange: "this_month",
      span: 2,
    },
    {
      id: generateId(),
      type: "doughnut",
      dataSource: "savings",
      timeRange: "all_time",
      span: 2,
    },
    {
      id: generateId(),
      type: "table",
      dataSource: "todos",
      timeRange: "all_time",
      span: 2,
    },
    {
      id: generateId(),
      type: "table",
      dataSource: "documents",
      timeRange: "this_month",
      span: 2,
    },
  ];
}
