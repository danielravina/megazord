"use client";

import { useState, useEffect, useRef } from "react";
import { Moon, Sun, Sunrise, Sunset } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { WidgetComponentProps } from "./widget-registry";

type Phase = "night" | "dawn" | "day" | "dusk";

interface PhaseTheme {
  greeting: string;
  icon: LucideIcon;
  bg: string;
  fg: string;
  sub: string;
  face: string;
  faceRing: string;
  tick: string;
  hand: string;
  bar: string;
  track: string;
  shadow: boolean;
}

const PHASE_THEMES: Record<Phase, PhaseTheme> = {
  night: {
    greeting: "לילה טוב",
    icon: Moon,
    bg: "linear-gradient(165deg, #020617 0%, #172554 55%, #1e3a8a 105%)",
    fg: "#f8fafc",
    sub: "rgba(148,163,184,1)",
    face: "rgba(255,255,255,0.07)",
    faceRing: "rgba(148,163,184,0.4)",
    tick: "rgba(226,232,240,0.5)",
    hand: "#f8fafc",
    bar: "linear-gradient(90deg, #6366f1, #a5b4fc)",
    track: "rgba(255,255,255,0.25)",
    shadow: true,
  },
  dawn: {
    greeting: "בוקר טוב",
    icon: Sunrise,
    bg: "linear-gradient(165deg, #fbbf24 0%, #fb9db5 55%, #8fa8f0 110%)",
    fg: "#451a03",
    sub: "rgba(69,26,3,0.75)",
    face: "rgba(255,255,255,0.45)",
    faceRing: "rgba(69,26,3,0.3)",
    tick: "rgba(69,26,3,0.45)",
    hand: "#451a03",
    bar: "linear-gradient(90deg, #ea580c, #d97706)",
    track: "rgba(69,26,3,0.2)",
    shadow: false,
  },
  day: {
    greeting: "צהריים טובים",
    icon: Sun,
    bg: "linear-gradient(165deg, #0369a1 0%, #3b82f6 45%, #93c5fd 110%)",
    fg: "#ffffff",
    sub: "rgba(255,255,255,0.92)",
    face: "rgba(255,255,255,0.18)",
    faceRing: "rgba(255,255,255,0.5)",
    tick: "rgba(255,255,255,0.6)",
    hand: "#ffffff",
    bar: "linear-gradient(90deg, #38bdf8, #fde047)",
    track: "rgba(255,255,255,0.28)",
    shadow: true,
  },
  dusk: {
    greeting: "ערב טוב",
    icon: Sunset,
    bg: "linear-gradient(165deg, #312e81 0%, #7e22ce 50%, #ea580c 110%)",
    fg: "#fff7ed",
    sub: "rgba(255,247,237,0.85)",
    face: "rgba(255,255,255,0.1)",
    faceRing: "rgba(255,247,237,0.4)",
    tick: "rgba(255,247,237,0.45)",
    hand: "#fff7ed",
    bar: "linear-gradient(90deg, #7c3aed, #ea580c)",
    track: "rgba(255,247,237,0.28)",
    shadow: true,
  },
};

function phaseOf(h: number): Phase {
  if (h < 5) return "night";
  if (h < 11) return "dawn";
  if (h < 16) return "day";
  if (h < 19) return "dusk";
  return "night";
}

const STARS = [
  { l: 6, t: 18, d: 0, s: 2 },
  { l: 14, t: 66, d: 1.2, s: 1.5 },
  { l: 24, t: 34, d: 0.5, s: 2 },
  { l: 34, t: 12, d: 1.8, s: 1.5 },
  { l: 44, t: 74, d: 0.9, s: 2 },
  { l: 52, t: 26, d: 2.1, s: 1.5 },
  { l: 60, t: 58, d: 0.3, s: 2 },
  { l: 68, t: 10, d: 1.5, s: 1.5 },
  { l: 78, t: 46, d: 0.7, s: 2 },
  { l: 86, t: 20, d: 1.9, s: 1.5 },
  { l: 92, t: 64, d: 1.1, s: 2 },
  { l: 40, t: 88, d: 0.4, s: 1.5 },
];

const FACE_CSS = `
@keyframes wTwinkle {
  0%, 100% { opacity: 0.15; transform: scale(0.7); }
  50% { opacity: 1; transform: scale(1); }
}
.wstar {
  position: absolute;
  border-radius: 50%;
  background: #fff;
  animation: wTwinkle 3.2s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .wstar { animation: none; opacity: 0.6; }
}
`;

export function ClockWidget({ customizing }: WidgetComponentProps) {
  const [now, setNow] = useState<Date | null>(null);
  const hourHand = useRef<SVGGElement>(null);
  const minHand = useRef<SVGGElement>(null);
  const secHand = useRef<SVGGElement>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let raf = 0;
    let prevSec = -1;
    const tick = () => {
      const d = new Date();
      const ms = d.getMilliseconds();
      const s = d.getSeconds();
      if (secHand.current) {
        secHand.current.setAttribute("transform", `rotate(${(s + ms / 1000) * 6})`);
      }
      if (s !== prevSec) {
        prevSec = s;
        const m = d.getMinutes();
        const h = d.getHours() % 12;
        if (minHand.current) {
          minHand.current.setAttribute("transform", `rotate(${(m + s / 60) * 6})`);
        }
        if (hourHand.current) {
          hourHand.current.setAttribute("transform", `rotate(${(h + m / 60) * 30})`);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const style = <style dangerouslySetInnerHTML={{ __html: FACE_CSS }} />;

  if (!now) {
    return (
      <div className="flex items-center justify-center h-full min-h-[80px] text-slate-400 text-sm">
        ...
      </div>
    );
  }

  const phase = phaseOf(now.getHours());
  const theme = PHASE_THEMES[phase];
  const PhaseIcon = theme.icon;

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const dateLabel = now.toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const dayProgress = ((now.getHours() * 60 + now.getMinutes()) * 60 + now.getSeconds()) / 86400;

  const ticks = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div
      className={`relative rounded-xl overflow-hidden flex flex-col ${
        customizing
          ? "h-full p-3 sm:p-4"
          : "h-[calc(100%+1.5rem)] sm:h-[calc(100%+2rem)] -m-3 sm:-m-4 p-3 sm:p-4"
      }`}
      style={{ background: theme.bg }}
    >
      {style}
      {phase === "night" &&
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

      <div className="relative z-10 flex items-center gap-3 flex-1 min-h-[64px]">
        <svg viewBox="0 0 100 100" className="w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] shrink-0" aria-hidden>
          <circle cx="50" cy="50" r="46" fill={theme.face} stroke={theme.faceRing} strokeWidth="1.5" />
          {ticks.map((i) => (
            <line
              key={i}
              x1="50"
              y1="7"
              x2="50"
              y2={i % 3 === 0 ? 12 : 10}
              stroke={theme.tick}
              strokeWidth={i % 3 === 0 ? 2 : 1}
              strokeLinecap="round"
              transform={`rotate(${i * 30} 50 50)`}
            />
          ))}
          <g transform="translate(50 50)">
            <g ref={hourHand}>
              <line y1="4" y2="-21" stroke={theme.hand} strokeWidth="3.5" strokeLinecap="round" />
            </g>
            <g ref={minHand}>
              <line y1="4" y2="-33" stroke={theme.hand} strokeWidth="2.25" strokeLinecap="round" />
            </g>
            <g ref={secHand}>
              <line y1="7" y2="-37" stroke="#f43f5e" strokeWidth="1.25" strokeLinecap="round" />
            </g>
            <circle r="2.4" fill="#f43f5e" />
          </g>
        </svg>

        <div className="flex flex-col justify-center gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: theme.sub }}>
            <PhaseIcon size={13} />
            <span className="truncate">{theme.greeting}</span>
            <span className="opacity-60">·</span>
            <span className="truncate opacity-90">{dateLabel}</span>
          </div>
          <div className="flex items-baseline justify-end gap-1.5" dir="ltr">
            <span className="text-4xl font-bold tracking-tight tabular-nums leading-none" style={{ color: theme.fg }}>
              {hh}:{mm}
            </span>
            <span className="text-base font-semibold tabular-nums opacity-60" style={{ color: theme.fg }}>
              {ss}
            </span>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-2" title={`עברו ${Math.round(dayProgress * 100)}% מהיום`}>
        <div className="h-1 w-full rounded-full" style={{ background: theme.track }}>
          <div
            className="h-full rounded-full transition-[width] duration-1000 ease-linear"
            style={{ width: `${dayProgress * 100}%`, background: theme.bar }}
          />
        </div>
      </div>
    </div>
  );
}
