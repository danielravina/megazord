import { generateId } from "@/components/shared/generate-id";
import type { DashboardTile } from "@/components/dashboard/dashboard-types";

export function getDefaultLayout(): DashboardTile[] {
  return [
    {
      id: generateId(),
      type: "hero",
      dataSource: "income:total",
      timeRange: "this_month",
      span: 1,
    },
    {
      id: generateId(),
      type: "hero",
      dataSource: "expenses:total",
      timeRange: "this_month",
      span: 1,
    },
    {
      id: generateId(),
      type: "hero",
      dataSource: "profit:net",
      timeRange: "this_month",
      span: 1,
    },
    {
      id: generateId(),
      type: "hero",
      dataSource: "tax:estimate",
      timeRange: "this_month",
      span: 1,
    },
    {
      id: generateId(),
      type: "doughnut",
      dataSource: "expenses:by_category",
      timeRange: "this_month",
      span: 2,
    },
    {
      id: generateId(),
      type: "doughnut",
      dataSource: "savings:by_fund",
      timeRange: "all_time",
      span: 2,
    },
    {
      id: generateId(),
      type: "table",
      dataSource: "todos:open",
      timeRange: "all_time",
      span: 2,
    },
    {
      id: generateId(),
      type: "table",
      dataSource: "documents:recent",
      timeRange: "this_month",
      span: 2,
    },
  ];
}
