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

  const labels = d && Array.isArray(d.labels) ? d.labels : [];
  const segments = d && Array.isArray(d.segments) ? d.segments : [];

  const isEmpty = segments.length === 0;

  const chartData = {
    labels: isEmpty ? [] : labels,
    datasets: [
      {
        data: isEmpty ? [1] : segments.map((s) => s.value),
        backgroundColor: isEmpty ? ["#e2e8f0"] : segments.map((s) => s.color),
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
      <div className="relative flex-1 min-h-0" style={{ minHeight: 150 }}>
        <Doughnut data={chartData} options={options} />
        {isEmpty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-center leading-snug">
              <div className="text-sm text-slate-400">אין נתונים בטווח הזה</div>
              <div className="text-xs text-slate-400 mt-1">הוסיפו הכנסה ראשונה — סריקה אחת פותחת הכל</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
