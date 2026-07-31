"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface Props {
  data: unknown;
  tile: { id: string; type: string; span: number; title?: string };
}

export function ClockWidget({ data: _data }: Props) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const t = setInterval(() => {
      setTime(
        new Date().toLocaleTimeString("he-IL", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const today = new Date().toLocaleDateString("he-IL", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[80px] gap-1">
      <Clock size={20} className="text-blue-500" />
      <div className="text-2xl font-bold text-slate-800 tabular-nums">{time || "--:--"}</div>
      <div className="text-[10px] text-slate-400">{today}</div>
    </div>
  );
}
