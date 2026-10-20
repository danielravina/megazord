"use client";

import { useState, useEffect, useId } from "react";
import { ArrowDown, ArrowUp, CloudSun, Droplets, MapPin, Wind } from "lucide-react";
import type { WidgetComponentProps } from "./widget-registry";

type Scene =
  | "clear-day"
  | "clear-night"
  | "sunset"
  | "partly-day"
  | "partly-night"
  | "cloudy"
  | "fog"
  | "rain"
  | "snow"
  | "thunder";

interface SceneDef {
  bg: string;
  fg: string;
  sub: string;
  chipBg: string;
  chipColor: string;
  shadow: boolean;
}

const SCENES: Record<Scene, SceneDef> = {
  "clear-day": {
    bg: "linear-gradient(170deg, #1d4ed8 0%, #3b82f6 48%, #60a5fa 108%)",
    fg: "#ffffff",
    sub: "rgba(255,255,255,0.9)",
    chipBg: "rgba(2,6,23,0.35)",
    chipColor: "#ffffff",
    shadow: true,
  },
  "clear-night": {
    bg: "linear-gradient(170deg, #020617 0%, #172554 60%, #1e3a8a 105%)",
    fg: "#e2e8f0",
    sub: "rgba(148,163,184,1)",
    chipBg: "rgba(2,6,23,0.3)",
    chipColor: "#f1f5f9",
    shadow: false,
  },
  sunset: {
    bg: "linear-gradient(170deg, #2e1065 0%, #7c3aed 50%, #ea580c 108%)",
    fg: "#fff7ed",
    sub: "rgba(255,247,237,0.85)",
    chipBg: "rgba(2,6,23,0.32)",
    chipColor: "#ffffff",
    shadow: true,
  },
  "partly-day": {
    bg: "linear-gradient(170deg, #1e3a8a 0%, #2563eb 48%, #3b82f6 108%)",
    fg: "#ffffff",
    sub: "rgba(255,255,255,0.9)",
    chipBg: "rgba(2,6,23,0.35)",
    chipColor: "#ffffff",
    shadow: true,
  },
  "partly-night": {
    bg: "linear-gradient(170deg, #0b1120 0%, #1e293b 60%, #334155 110%)",
    fg: "#e2e8f0",
    sub: "rgba(148,163,184,1)",
    chipBg: "rgba(2,6,23,0.3)",
    chipColor: "#f1f5f9",
    shadow: false,
  },
  cloudy: {
    bg: "linear-gradient(170deg, #3f4f63 0%, #556579 55%, #64748b 112%)",
    fg: "#ffffff",
    sub: "rgba(255,255,255,0.9)",
    chipBg: "rgba(2,6,23,0.35)",
    chipColor: "#ffffff",
    shadow: true,
  },
  fog: {
    bg: "linear-gradient(170deg, #8794a3 0%, #a5b1bd 55%, #b9c3cd 112%)",
    fg: "#111827",
    sub: "rgba(17,24,39,0.7)",
    chipBg: "rgba(255,255,255,0.6)",
    chipColor: "#111827",
    shadow: false,
  },
  rain: {
    bg: "linear-gradient(170deg, #1e293b 0%, #3f4b5f 55%, #56637a 114%)",
    fg: "#ffffff",
    sub: "rgba(255,255,255,0.88)",
    chipBg: "rgba(2,6,23,0.35)",
    chipColor: "#ffffff",
    shadow: true,
  },
  snow: {
    bg: "linear-gradient(170deg, #4c7099 0%, #6c91b8 55%, #8fb0d2 110%)",
    fg: "#ffffff",
    sub: "rgba(240,247,255,0.95)",
    chipBg: "rgba(2,6,23,0.35)",
    chipColor: "#ffffff",
    shadow: true,
  },
  thunder: {
    bg: "linear-gradient(170deg, #0f172a 0%, #1f2937 55%, #3a4453 114%)",
    fg: "#ffffff",
    sub: "rgba(255,255,255,0.88)",
    chipBg: "rgba(2,6,23,0.35)",
    chipColor: "#ffffff",
    shadow: true,
  },
};

const CONDITION_LABELS: Record<number, string> = {
  0: "שמש ובהירה",
  1: "בהיר ברובו",
  2: "מעונן חלקית",
  3: "מעונן",
  45: "ערפל",
  48: "ערפל מקפיא",
  51: "טפטוף קל",
  53: "טפטוף",
  55: "טפטוף כבד",
  56: "טפטוף קפוא",
  57: "טפטוף קפוא כבד",
  61: "גשם קל",
  63: "גשם",
  65: "גשם כבד",
  66: "גשם קפוא קל",
  67: "גשם קפוא כבד",
  71: "שלג קל",
  73: "שלג",
  75: "שלג כבד",
  77: "גרגירי שלג",
  80: "ממטרים בודדים",
  81: "ממטרים",
  82: "ממטרים חזקים",
  85: "ממטרי שלג",
  86: "ממטרי שלג כבדים",
  95: "סופת רעמים",
  96: "סופת רעמים עם ברד קל",
  99: "סופת רעמים עם ברד כבד",
};

interface CloudSpec {
  top: string;
  opacity: number;
  fill: string;
  scale: number;
  dur: number;
  delay: number;
}

function cloudsFor(scene: Scene): CloudSpec[] {
  const white = "rgba(255,255,255,0.92)";
  const dim = "rgba(255,255,255,0.55)";
  const grey = "rgba(148,163,184,0.9)";
  const dark = "rgba(71,85,105,0.95)";
  switch (scene) {
    case "partly-day":
      return [
        { top: "10%", opacity: 0.9, fill: white, scale: 1, dur: 34, delay: -6 },
        { top: "34%", opacity: 0.6, fill: dim, scale: 0.7, dur: 48, delay: -28 },
      ];
    case "partly-night":
      return [
        { top: "12%", opacity: 0.45, fill: grey, scale: 0.8, dur: 40, delay: -12 },
        { top: "40%", opacity: 0.3, fill: dim, scale: 0.55, dur: 54, delay: -36 },
      ];
    case "cloudy":
      return [
        { top: "8%", opacity: 0.95, fill: dim, scale: 1.15, dur: 30, delay: -4 },
        { top: "30%", opacity: 0.85, fill: grey, scale: 0.9, dur: 42, delay: -20 },
        { top: "56%", opacity: 0.55, fill: dim, scale: 0.7, dur: 52, delay: -34 },
      ];
    case "rain":
      return [
        { top: "4%", opacity: 0.95, fill: dark, scale: 1.1, dur: 36, delay: -10 },
        { top: "22%", opacity: 0.7, fill: grey, scale: 0.85, dur: 46, delay: -28 },
      ];
    case "thunder":
      return [
        { top: "6%", opacity: 1, fill: dark, scale: 1.2, dur: 32, delay: -8 },
        { top: "26%", opacity: 0.75, fill: dark, scale: 0.8, dur: 44, delay: -22 },
      ];
    case "snow":
      return [
        { top: "8%", opacity: 0.9, fill: white, scale: 1, dur: 38, delay: -9 },
        { top: "34%", opacity: 0.65, fill: dim, scale: 0.7, dur: 50, delay: -30 },
      ];
    default:
      return [];
  }
}

function sceneFor(code: number, isDay: boolean, hour: number): Scene {
  if (code >= 95) return "thunder";
  if (code >= 71 || code === 85 || code === 86) return "snow";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if (code === 45 || code === 48) return "fog";
  if (code === 3) return "cloudy";
  if (code === 1 || code === 2) return isDay ? "partly-day" : "partly-night";
  if (!isDay) return "clear-night";
  if (hour >= 17 && hour < 20) return "sunset";
  return "clear-day";
}

const STARS = [
  { l: 5, t: 14, d: 0, s: 2 },
  { l: 13, t: 48, d: 1.1, s: 1.5 },
  { l: 22, t: 70, d: 0.4, s: 2 },
  { l: 31, t: 26, d: 1.7, s: 1.5 },
  { l: 41, t: 8, d: 0.8, s: 2 },
  { l: 50, t: 54, d: 2, s: 1.5 },
  { l: 58, t: 20, d: 0.2, s: 2 },
  { l: 66, t: 66, d: 1.4, s: 1.5 },
  { l: 74, t: 10, d: 0.6, s: 2 },
  { l: 83, t: 38, d: 1.9, s: 1.5 },
  { l: 91, t: 60, d: 1, s: 2 },
  { l: 96, t: 16, d: 0.35, s: 1.5 },
];

const SCENE_CSS = `
@keyframes wDrift {
  from { left: -26%; }
  to { left: 104%; }
}
@keyframes wSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes wPulse {
  0%, 100% { opacity: 0.75; }
  50% { opacity: 1; }
}
@keyframes wTwinkle {
  0%, 100% { opacity: 0.15; transform: scale(0.7); }
  50% { opacity: 1; transform: scale(1); }
}
@keyframes wFall {
  to { background-position-y: 14px; }
}
@keyframes wSnow {
  to { background-position-y: 42px; }
}
@keyframes wFlash {
  0%, 90%, 100% { opacity: 0; }
  92% { opacity: 0.5; }
  94% { opacity: 0; }
  96% { opacity: 0.3; }
  98% { opacity: 0; }
}
@keyframes wFog {
  0%, 100% { transform: translateX(-6%); }
  50% { transform: translateX(6%); }
}
.wstar {
  position: absolute;
  border-radius: 50%;
  background: #fff;
  animation: wTwinkle 3.4s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .wstar, .wcloud, .wray, .wglow, .wflash {
    animation: none !important;
  }
}
`;

function CloudShape({ fill }: { fill: string }) {
  return (
    <svg width="92" height="42" viewBox="0 0 92 42" aria-hidden>
      <g fill={fill}>
        <circle cx="24" cy="28" r="12" />
        <circle cx="45" cy="20" r="16" />
        <circle cx="68" cy="27" r="12" />
        <rect x="14" y="26" width="64" height="12" rx="6" />
      </g>
    </svg>
  );
}

function SunDeco({ low, warm }: { low?: boolean; warm?: boolean }) {
  const gradId = useId();
  return (
    <div
      className="sunwrap absolute"
      style={{ top: low ? "50%" : "7%", insetInlineEnd: "6%" }}
      aria-hidden
    >
      <div
        className="wglow"
        style={{
          position: "absolute",
          inset: "-30px",
          borderRadius: "50%",
          background: warm
            ? "radial-gradient(circle, rgba(251,191,36,0.5) 0%, rgba(251,146,60,0.28) 42%, rgba(251,146,60,0) 72%)"
            : "radial-gradient(circle, rgba(253,224,71,0.5) 0%, rgba(253,224,71,0.26) 42%, rgba(253,224,71,0) 72%)",
          animation: "wPulse 4s ease-in-out infinite",
        }}
      />
      <svg width="76" height="76" viewBox="0 0 120 120" style={{ position: "relative" }}>
        <defs>
          <radialGradient id={gradId} cx="50%" cy="42%" r="65%">
            <stop offset="0%" stopColor={warm ? "#fff7de" : "#fffbeb"} />
            <stop offset="55%" stopColor={warm ? "#fbbf24" : "#fcd34d"} />
            <stop offset="100%" stopColor={warm ? "#f97316" : "#f59e0b"} />
          </radialGradient>
        </defs>
        <g
          style={{
            transformOrigin: "60px 60px",
            animation: "wSpin 40s linear infinite",
            opacity: low ? 0.8 : 1,
          }}
        >
          {Array.from({ length: 12 }, (_, i) => {
            const long = i % 2 === 0;
            const outer = long ? 52 : 42;
            const inner = long ? 34 : 30;
            return (
              <line
                key={i}
                x1="60"
                y1={60 - outer}
                x2="60"
                y2={60 - inner}
                stroke={warm ? "rgba(253,186,116,0.9)" : "rgba(253,224,71,0.85)"}
                strokeWidth={long ? 4 : 3}
                strokeLinecap="round"
                transform={`rotate(${i * 30} 60 60)`}
              />
            );
          })}
        </g>
        <circle cx="60" cy="60" r="24" fill={`url(#${gradId})`} />
        <circle cx="60" cy="60" r="24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

function MoonDeco({ dim }: { dim?: boolean }) {
  const maskId = useId();
  return (
    <div
      className="absolute"
      style={{ top: dim ? "20%" : "12%", insetInlineEnd: "10%", filter: `drop-shadow(0 0 ${dim ? 6 : 12}px rgba(226,232,240,${dim ? 0.35 : 0.6}))`, opacity: dim ? 0.7 : 1 }}
      aria-hidden
    >
      <svg width="38" height="38" viewBox="0 0 40 40">
        <defs>
          <mask id={maskId}>
            <rect width="40" height="40" fill="#fff" />
            <circle cx="27" cy="12" r="14" fill="#000" />
          </mask>
        </defs>
        <circle cx="20" cy="20" r="14" fill="#e2e8f0" mask={`url(#${maskId})`} />
        <circle cx="14" cy="18" r="1.6" fill="#cbd5e1" mask={`url(#${maskId})`} />
        <circle cx="18" cy="24" r="1.2" fill="#cbd5e1" mask={`url(#${maskId})`} />
      </svg>
    </div>
  );
}

function FogBands() {
  return (
    <>
      {[38, 62].map((t, i) => (
        <div
          key={i}
          className="absolute w-full"
          style={{
            top: `${t}%`,
            animation: `wFog ${9 + i * 3}s ease-in-out infinite`,
            animationDelay: `${-i * 4}s`,
          }}
          aria-hidden
        >
          <div
            style={{
              height: 26,
              borderRadius: 999,
              margin: "0 20%",
              background: "rgba(255,255,255,0.4)",
              filter: "blur(9px)",
            }}
          />
        </div>
      ))}
    </>
  );
}

function RainLayer({ fast, strong }: { fast?: boolean; strong?: boolean }) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        inset: "-25% -30%",
        transform: "rotate(10deg)",
        backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0) 0%, ${strong ? "rgba(255,255,255,0.5)" : "rgba(226,232,240,0.32)"} 60%, rgba(255,255,255,0) 100%)`,
        backgroundSize: fast ? "3px 14px" : "2px 14px",
        opacity: strong ? 0.95 : 0.6,
        animation: `wFall ${fast ? 0.55 : 0.8}s linear infinite`,
      }}
      aria-hidden
    />
  );
}

function SnowLayer({ offset }: { offset?: boolean }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.85) 1.3px, transparent 2px)",
        backgroundSize: offset ? "24px 42px" : "17px 21px",
        backgroundPosition: offset ? "8px 4px" : "2px 2px",
        animation: `wSnow ${offset ? 8 : 5.5}s linear infinite`,
        opacity: offset ? 0.5 : 0.8,
      }}
      aria-hidden
    />
  );
}

function LightningFlash() {
  return (
    <div
      className="wflash absolute inset-0 pointer-events-none"
      style={{ background: "rgba(255,255,255,0.55)", animation: "wFlash 7s linear infinite" }}
      aria-hidden
    />
  );
}

function SceneLayer({ scene }: { scene: Scene }) {
  const clouds = cloudsFor(scene);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      {(scene === "clear-day" || scene === "sunset" || scene === "partly-day") && (
        <SunDeco low={scene === "sunset"} warm={scene === "sunset"} />
      )}
      {(scene === "clear-night" || scene === "partly-night") && <MoonDeco dim={scene === "partly-night"} />}
      {(scene === "clear-night" || scene === "partly-night") &&
        STARS.map((st, i) => (
          <span
            key={i}
            className="wstar"
            style={{
              left: `${st.l}%`,
              top: `${st.t}%`,
              width: st.s,
              height: st.s,
              animationDelay: `${st.d}s`,
            }}
          />
        ))}

      {clouds.map((c, i) => (
        <div
          key={i}
          className="wcloud absolute"
          style={{
            top: c.top,
            left: "-26%",
            opacity: c.opacity,
            transform: `scale(${c.scale})`,
            transformOrigin: "top",
            animation: `wDrift ${c.dur}s linear infinite`,
            animationDelay: `${c.delay}s`,
          }}
        >
          <CloudShape fill={c.fill} />
        </div>
      ))}

      {(scene === "rain" || scene === "thunder") && (
        <>
          <RainLayer strong />
          <RainLayer fast />
          {scene === "thunder" && <LightningFlash />}
        </>
      )}
      {scene === "snow" && (
        <>
          <SnowLayer />
          <SnowLayer offset />
        </>
      )}
      {scene === "fog" && <FogBands />}
    </div>
  );
}

interface WeatherInfo {
  temp: number;
  feels: number;
  isDay: boolean;
  code: number;
  wind: number;
  humidity: number;
  max: number;
  min: number;
  localHour: number;
}

export function WeatherWidget({ customizing }: WidgetComponentProps) {
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [place, setPlace] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!("geolocation" in navigator)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFailed(true);
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=he`,
        )
          .then((r) => (r.ok ? r.json() : null))
          .then((g) => {
            if (cancelled || !g) return;
            const name = g.city || g.locality || g.principalSubdivision || g.countryName;
            if (name) setPlace(name);
          })
          .catch(() => {});
        try {
          const params = new URLSearchParams({
            latitude: String(lat),
            longitude: String(lon),
            current: "temperature_2m,apparent_temperature,relative_humidity_2m,is_day,weather_code,wind_speed_10m",
            daily: "temperature_2m_max,temperature_2m_min",
            timezone: "auto",
          });
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
          const data = await res.json();
          if (cancelled) return;
          const c = data?.current;
          const d = data?.daily;
          if (c) {
            const t: string = c.time || "";
            const localHour = t.includes("T") ? Number(t.split("T")[1].split(":")[0]) : 12;
            setWeather({
              temp: Math.round(c.temperature_2m),
              feels: Math.round(c.apparent_temperature),
              isDay: Boolean(c.is_day),
              code: Number(c.weather_code ?? 0),
              wind: Math.round(c.wind_speed_10m ?? 0),
              humidity: Math.round(c.relative_humidity_2m ?? 0),
              max: Math.round(d?.temperature_2m_max?.[0] ?? c.temperature_2m),
              min: Math.round(d?.temperature_2m_min?.[0] ?? c.temperature_2m),
              localHour: Number.isFinite(localHour) ? localHour : 12,
            });
          } else {
            setFailed(true);
          }
        } catch {
          if (!cancelled) setFailed(true);
        } finally {
          if (!cancelled) setLoading(false);
        }
      },
      () => {
        if (!cancelled) {
          setFailed(true);
          setLoading(false);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const wrapClass = customizing
    ? "rounded-xl overflow-hidden h-full flex flex-col p-3 sm:p-4 relative"
    : "rounded-xl overflow-hidden h-[calc(100%+1.5rem)] sm:h-[calc(100%+2rem)] flex flex-col -m-3 sm:-m-4 p-3 sm:p-4 relative";

  if (loading) {
    return (
      <div
        className={`${wrapClass} items-center justify-center`}
        style={{ background: "linear-gradient(170deg, #e2e8f0 0%, #f1f5f9 60%, #e0f2fe 100%)" }}
      >
        <CloudSun size={22} className="text-slate-300 animate-pulse" />
      </div>
    );
  }

  if (!weather || failed) {
    return (
      <div className="flex items-center justify-center h-full min-h-[80px] text-slate-400 text-sm">
        אין נתונים
      </div>
    );
  }

  const scene = sceneFor(weather.code, weather.isDay, weather.localHour);
  const def = SCENES[scene];
  const condition = CONDITION_LABELS[weather.code] || "מזג אוויר";
  const textShadow = def.shadow ? "0 1px 4px rgba(0,0,0,0.25)" : "0 1px 2px rgba(255,255,255,0.35)";

  return (
    <div
      className={wrapClass}
      style={{ background: def.bg }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCENE_CSS }} />
      <SceneLayer scene={scene} />

      <div className="relative z-10 flex flex-col h-full justify-between min-h-[64px]">
        <div
          className="flex items-center gap-1 text-[11px] font-semibold"
          style={{ color: def.sub, textShadow }}
        >
          <MapPin size={10} />
          <span>{place || "המיקום שלי"}</span>
        </div>

        <div className="flex flex-col gap-0.5">
          <div className="flex items-end justify-between gap-2">
            <div
              dir="ltr"
              className="text-[2.6rem] font-bold leading-none tabular-nums"
              style={{ color: def.fg, textShadow }}
            >
              {weather.temp}°
            </div>
            <div
              dir="ltr"
              className="flex items-center gap-0.5 text-xs font-bold tabular-nums"
              style={{ color: def.fg, textShadow }}
            >
              <ArrowUp size={11} />
              {weather.max}°
              <ArrowDown size={11} className="opacity-60" />
              {weather.min}°
            </div>
          </div>
          <div
            className="text-sm font-bold"
            style={{ color: def.fg, textShadow }}
          >
            {condition}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: def.chipBg, color: def.chipColor }}
          >
            מרגיש כמו {weather.feels}°
          </span>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: def.chipBg, color: def.chipColor }}
          >
            <Wind size={10} />
            {weather.wind} קמ״ש
          </span>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: def.chipBg, color: def.chipColor }}
          >
            <Droplets size={10} />
            {weather.humidity}%
          </span>
        </div>
      </div>
    </div>
  );
}
