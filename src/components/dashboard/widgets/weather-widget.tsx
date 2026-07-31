"use client";

import { useState, useEffect } from "react";
import { CloudSun } from "lucide-react";

interface Props {
  data: unknown;
  tile: { id: string; type: string; span: number; title?: string };
}

export function WeatherWidget({ data: _data }: Props) {
  const [weather, setWeather] = useState<{ temp: number; condition?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current_weather=true`,
          );
          const data = await res.json();
          if (data?.current_weather) {
            const code = data.current_weather.weathercode;
            const conditions: Record<number, string> = {
              0: "בהיר", 1: "מעונן חלקית", 2: "מעונן", 3: "מעונן",
              45: "ערפל", 48: "ערפל", 51: "טפטוף", 61: "גשם", 80: "גשם",
            };
            setWeather({
              temp: Math.round(data.current_weather.temperature),
              condition: conditions[code] || "",
            });
          }
        } catch { /* ignore */ }
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[80px] text-slate-400 text-sm">
        ...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[80px] gap-0.5">
      <CloudSun size={20} className="text-sky-500" />
      {weather ? (
        <>
          <div className="text-2xl font-bold text-slate-800">{weather.temp}°C</div>
          {weather.condition && (
            <div className="text-[10px] text-slate-400">{weather.condition}</div>
          )}
        </>
      ) : (
        <div className="text-xs text-slate-400">אין נתונים</div>
      )}
      <div className="text-[10px] text-slate-400">המיקום שלי</div>
    </div>
  );
}
