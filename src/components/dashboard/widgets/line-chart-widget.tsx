"use client";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import type { BarData } from "@/components/dashboard/dashboard-types";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface Props {
  data: unknown;
  tile: { id: string; type: string; span: number; title?: string };
}

export function LineChartWidget({ data, tile }: Props) {
  const d = data as BarData | null;

  if (!d || !Array.isArray(d.labels) || !Array.isArray(d.datasets) || d.labels.length === 0) {
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
      borderColor: ds.color,
      backgroundColor: ds.color,
      pointRadius: 3,
      pointHoverRadius: 4,
      borderWidth: 2,
      tension: 0.35,
      fill: false,
    })),
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
    scales: {
      x: {
        grid: { display: false },
      },
      y: {
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
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
