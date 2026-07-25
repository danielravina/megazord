"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { CloudSun, Droplets, Wind, RefreshCw, AlertTriangle } from "lucide-react";

interface WeatherData {
  temp: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  desc: string;
  icon: string;
  forecasts: { day: string; max: number; min: number; code: number; icon: string; desc: string }[];
}

const WMO_CODES: Record<number, { label: string; icon: string }> = {
  0: { label: "בהיר", icon: "☀️" },
  1: { label: "בהיר ברובו", icon: "🌤️" },
  2: { label: "מעונן חלקי", icon: "⛅" },
  3: { label: "מעונן", icon: "☁️" },
  45: { label: "ערפל", icon: "🌫️" },
  48: { label: "ערפל קופא", icon: "🌫️" },
  51: { label: "טפטוף קל", icon: "🌦️" },
  53: { label: "טפטוף מתון", icon: "🌦️" },
  55: { label: "טפטוף כבד", icon: "🌧️" },
  61: { label: "גשם קל", icon: "🌧️" },
  63: { label: "גשם מתון", icon: "🌧️" },
  65: { label: "גשם כבד", icon: "🌧️" },
  71: { label: "שלג קל", icon: "🌨️" },
  73: { label: "שלג מתון", icon: "🌨️" },
  75: { label: "שלג כבד", icon: "🌨️" },
  80: { label: "ממטרים", icon: "🌦️" },
  95: { label: "סופת רעמים", icon: "⛈️" },
};

function getWeather(code: number) {
  return WMO_CODES[code] || { label: "לא ידוע", icon: "❓" };
}

function getDayName(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "היום";
  const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  return `יום ${days[d.getDay()]}`;
}

export function WeatherPage() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchWeather(lat?: number, lon?: number) {
    setLoading(true);
    setError("");
    try {
      let latitude = lat;
      let longitude = lon;
      if (!latitude || !longitude) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!("geolocation" in navigator)) reject(new Error("no geo"));
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      }
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`,
      );
      const json = await res.json();
      const cur = json.current;
      const curW = getWeather(cur.weather_code);
      const forecasts = json.daily.time.slice(0, 5).map((t: string, i: number) => {
        const w = getWeather(json.daily.weather_code[i]);
        return {
          day: getDayName(t), max: Math.round(json.daily.temperature_2m_max[i]),
          min: Math.round(json.daily.temperature_2m_min[i]),
          code: json.daily.weather_code[i], icon: w.icon, desc: w.label,
        };
      });
      setData({
        temp: Math.round(cur.temperature_2m), humidity: cur.relative_humidity_2m,
        windSpeed: cur.wind_speed_10m, weatherCode: cur.weather_code,
        desc: curW.label, icon: curW.icon, forecasts,
      });
    } catch {
      setError("לא הצלחנו לקבל את המיקום או נתוני מזג האוויר");
    } finally {
      setLoading(false);
    }
  }

  const loadedRef = useRef(false);

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      fetchWeather();
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CloudSun size={22} className="text-blue-500" /> מזג אוויר
          </h1>
          <Button variant="ghost" onClick={() => fetchWeather()}><RefreshCw size={16} /></Button>
        </div>

        {error ? (
          <div className="flex flex-col items-center py-8 text-center">
            <AlertTriangle size={36} className="text-red-400 mb-3" />
            <p className="text-slate-500 text-sm mb-4">{error}</p>
            <Button onClick={() => fetchWeather()}>נסה שוב</Button>
          </div>
        ) : data ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="text-6xl mb-3">{data.icon}</div>
              <div className="text-6xl font-light tracking-tighter">{data.temp}°</div>
              <p className="text-xl font-semibold text-blue-600 mt-2">{data.desc}</p>
              <div className="grid grid-cols-2 gap-3 w-full mt-4">
                <div className="bg-blue-50 rounded-2xl p-3 flex items-center gap-3">
                  <Droplets size={18} className="text-blue-500" />
                  <div>
                    <p className="text-xs text-slate-500">לחות</p>
                    <p className="text-sm font-bold">{data.humidity}%</p>
                  </div>
                </div>
                <div className="bg-teal-50 rounded-2xl p-3 flex items-center gap-3">
                  <Wind size={18} className="text-teal-500" />
                  <div>
                    <p className="text-xs text-slate-500">רוח</p>
                    <p className="text-sm font-bold">{data.windSpeed.toFixed(1)} קמ״ש</p>
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-blue-50" />

            <div>
              <h3 className="text-sm font-semibold text-slate-500 mb-4">תחזית לשבוע הקרוב</h3>
              <div className="space-y-1">
                {data.forecasts.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50">
                    <span className="w-20 text-sm font-medium text-slate-500">{f.day}</span>
                    <span className="text-xl">{f.icon}</span>
                    <div className="flex items-center gap-3 text-sm font-medium">
                      <span>{f.max}°</span>
                      <div className="w-12 h-1 bg-slate-100 rounded-full" />
                      <span className="text-slate-400">{f.min}°</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
