"use client";

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import type { BarData } from "@/components/dashboard/dashboard-types";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface Props {
  data: unknown;
  tile: { id: string; type: string; span: number; title?: string };
}

export function BarChartWidget({ data, tile }: Props) {
  const d = data as BarData | null;

  if (!d || !d.labels.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[120px] text-slate-400 text-sm">
        {tile.title && <div className="text-xs font-bold text-slate-500 mb-1">{tile.title}</div>}
        אין נתונים להצגה
      </div>
    );
  }

  const chartData = {
    labels: d.labels,
    datasets: d.datasets.map((ds) => ({
      label: ds.label,
      data: ds.data,
      backgroundColor: ds.color,
      borderRadius: 4,
      borderWidth: 0,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y" as const,
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
    scales: {
      x: {
        ticks: {
          callback: (value: string | number) => {
            const v = Number(value);
            if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
            return v;
          },
        },
      },
    },
  };

  return (
    <div className="flex flex-col h-full">
      {tile.title && <div className="text-xs font-bold text-slate-500 mb-1">{tile.title}</div>}
      <div className="flex-1 min-h-0" style={{ minHeight: 150 }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
