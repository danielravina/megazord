"use client";

import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  data: { label: string; amount: number; color: string }[];
}

const COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
];

export function ExpensePieChart({ data }: Props) {
  const filtered = data.filter((d) => d.amount > 0);

  if (filtered.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        אין נתונים להצגה
      </div>
    );
  }

  const chartData = {
    labels: filtered.map((d) => d.label),
    datasets: [
      {
        data: filtered.map((d) => d.amount),
        backgroundColor: filtered.map((_, i) => COLORS[i % COLORS.length]),
        borderWidth: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        rtl: true,
        labels: {
          font: { size: 11 },
          padding: 12,
          usePointStyle: true,
        },
      },
    },
  };

  return (
    <div className="h-64">
      <Doughnut data={chartData} options={options} />
    </div>
  );
}
