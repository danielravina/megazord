import { generateId } from "@/components/shared/generate-id";
import type { DashboardTile } from "@/components/dashboard/dashboard-types";

// פריסת פתיחה: מזג אוויר ושעון בראש (חיים תמיד), אחריהם KPI אחד, וידג׳ט אינטראקטיבי,
// גרף וטבלה. מטרתה להיראות "עשירה" גם כשאין עדיין נתונים עסקיים.
export function getDefaultLayout(): DashboardTile[] {
  return [
    {
      id: generateId(),
      type: "weather",
      dataSource: "weather",
      span: 1,
    },
    {
      id: generateId(),
      type: "clock",
      dataSource: "clock",
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
      type: "doughnut",
      dataSource: "expenses",
      timeRange: "this_month",
      span: 2,
      width: 0.5,
    },
    {
      id: generateId(),
      type: "calendar",
      dataSource: "calendar:today",
      span: 1,
    },
    {
      id: generateId(),
      type: "calculator",
      dataSource: "calculator",
      span: 1,
    },
    {
      id: generateId(),
      type: "table",
      dataSource: "todos",
      timeRange: "all_time",
      span: 2,
      width: 0.5,
    },
  ];
}
