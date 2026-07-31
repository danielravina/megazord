"use client";

import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import type { DoughnutData } from "@/components/dashboard/dashboard-types";

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  data: unknown;
  tile: { id: string; type: string; span: number; title?: string };
}

export function DoughnutChartWidget({ data, tile }: Props) {
  const d = data as DoughnutData | null;

  if (!d || !d.segments.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[120px] text-slate-400 text-sm">
        {tile.title && <div className="text-xs font-bold text-slate-500 mb-1">{tile.title}</div>}
        אין נתונים להצגה
      </div>
    );
  }

  const chartData = {
    labels: d.labels,
    datasets: [
      {
        data: d.segments.map((s) => s.value),
        backgroundColor: d.segments.map((s) => s.color),
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
          font: { size: 10 },
          padding: 8,
          usePointStyle: true,
        },
      },
    },
  };

  return (
    <div className="flex flex-col h-full">
      {tile.title && <div className="text-xs font-bold text-slate-500 mb-1">{tile.title}</div>}
      <div className="flex-1 min-h-0" style={{ minHeight: 150 }}>
        <Doughnut data={chartData} options={options} />
      </div>
    </div>
  );
}
