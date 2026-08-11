"use client";

import Link from "next/link";
import type { CalendarData, CalendarEvent } from "@/components/dashboard/dashboard-types";

interface Props {
  data: unknown;
  tile: { id: string; type: string; span: number; title?: string };
}

const MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

const WEEKDAYS = ["יום ראשון", "יום שני", "יום שלישי", "יום רביעי", "יום חמישי", "יום שישי", "שבת"];

const toStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const fmt = (s: string) => s.split("-").reverse().join("/");

const dayDiff = (a: string, b: string) =>
  Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);

const UPCOMING_DAYS = 7;
const UPCOMING_LIMIT = 5;

function EventRow({ event, label }: { event: CalendarEvent; label?: string }) {
  return (
    <Link
      href={`/calendar/?event=${event.id}`}
      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
    >
      <span
        className="w-1 h-6 rounded-full shrink-0"
        style={{ backgroundColor: event.color || "#3b82f6" }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-700 truncate">{event.title}</p>
        {event.end_date && event.end_date !== event.date && (
          <p className="text-[10px] text-slate-400 truncate">עד {fmt(event.end_date)}</p>
        )}
      </div>
      {label && <span className="text-[10px] text-slate-400 shrink-0">{label}</span>}
    </Link>
  );
}

export function CalendarWidget({ data }: Props) {
  const now = new Date();
  const todayStr = toStr(now);
  const events = ((data as CalendarData | null)?.events) || [];

  const todayEvents = events
    .filter((e) => {
      const end = e.end_date || e.date;
      return e.date <= todayStr && todayStr <= end;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const upcoming = events
    .filter((e) => {
      const diff = dayDiff(todayStr, e.date);
      return diff > 0 && diff <= UPCOMING_DAYS;
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, UPCOMING_LIMIT);

  const upcomingLeft = events.filter((e) => {
    const diff = dayDiff(todayStr, e.date);
    return diff > 0 && diff <= UPCOMING_DAYS;
  }).length - upcoming.length;

  const dayLabel = (dateStr: string) => {
    const diff = dayDiff(todayStr, dateStr);
    if (diff === 1) return "מחר";
    return WEEKDAYS[parse(dateStr).getDay()];
  };

  return (
    <div className="h-full flex flex-col min-h-[210px]">
      <div className="flex items-start">
        <div className="flex items-start gap-3">
          <div className="text-4xl font-bold text-slate-900 leading-none">{now.getDate()}</div>
          <div className="pt-0.5">
            <div className="text-sm font-bold text-slate-800">{MONTHS[now.getMonth()]}</div>
            <div className="text-xs text-slate-400">{WEEKDAYS[now.getDay()]}</div>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-4 flex-1 min-h-0 overflow-y-auto">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">היום</div>
          {todayEvents.length === 0 ? (
            <p className="text-xs text-slate-400">אין אירועים היום</p>
          ) : (
            <div className="space-y-0.5">
              {todayEvents.map((ev) => (
                <EventRow key={ev.id} event={ev} />
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">קרוב</div>
          {upcoming.length === 0 ? (
            <p className="text-xs text-slate-400">אין אירועים קרובים</p>
          ) : (
            <div className="space-y-0.5">
              {upcoming.map((ev) => (
                <EventRow key={ev.id} event={ev} label={dayLabel(ev.date)} />
              ))}
              {upcomingLeft > 0 && (
                <p className="text-[10px] text-slate-400 px-2 pt-0.5">
                  +{upcomingLeft} אירועים נוספים
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
