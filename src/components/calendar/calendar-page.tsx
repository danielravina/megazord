"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/layout/auth-provider";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { generateId } from "@/components/shared/generate-id";
import { formatCurrency } from "@/components/shared/format-currency";
import type { Project, ProjectRow } from "@/components/projects/project-types";
import { normalizeProject } from "@/components/projects/project-types";
import {
  Calendar as CalendarIcon, CalendarDays, ChevronRight, ChevronLeft, Plus, FolderKanban, MapPin,
} from "lucide-react";

interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  date: string;
  end_date: string | null;
  color: string | null;
  is_project: boolean;
  project_id: string | null;
}

const MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

function formatDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const fmt = (d: string) => d.split("-").reverse().join("/");

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return formatDateStr(dt);
}

function daysBetween(from: string, to: string): number {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  return Math.round((new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()) / 86400000);
}

// Multi-day events render as a continuous band over the cell borders: the
// first/last day get rounded corners + a gap on the outer side, middle days
// bleed edge-to-edge (5px = 4px cell padding + 1px border)
function spanningPillClasses(isStart: boolean, isEnd: boolean): string {
  if (isStart && isEnd) return "rounded-lg mx-1";
  if (isStart) return "rounded-r-lg mr-1 -ml-[5px]";
  if (isEnd) return "rounded-l-lg ml-1 -mr-[5px]";
  return "rounded-none -ml-[5px] -mr-[5px]";
}

export function CalendarPage() {
  const { supabase, user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const uid = user.id;
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [evRes, projRes] = await Promise.all([
        supabase.from("events").select("*").eq("user_id", uid),
        supabase.from("projects").select("*, customers(name)").eq("user_id", uid),
      ]);
      if (cancelled) return;
      if (evRes.error) toast("שגיאה בטעינת אירועים", "error");
      setEvents(evRes.data || []);
      setProjects(((projRes.data || []) as ProjectRow[]).map(normalizeProject));
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [user, supabase, toast]);

  function openAddModal(dateStr: string) {
    setEventDate(dateStr);
    setEventEndDate(null);
    setEditingEvent(null);
    setEventTitle("");
    setModalOpen(true);
  }

  function openEditModal(event: CalendarEvent) {
    setEventDate(event.date);
    setEventEndDate(event.end_date);
    setEditingEvent(event);
    setEventTitle(event.title);
    setModalOpen(true);
  }

  // Changing the start date shifts the end date by the same amount (keeps the span)
  function onStartDateChange(value: string) {
    if (eventEndDate && eventDate) {
      setEventEndDate(addDays(eventEndDate, daysBetween(eventDate, value)));
    }
    setEventDate(value);
  }

  async function handleSave() {
    if (!eventTitle.trim() || !eventDate || !user) return;
    setSaving(true);

    try {
      if (editingEvent) {
        const prevEvents = events;
        const updated = { ...editingEvent, title: eventTitle, date: eventDate, end_date: eventEndDate };
        setEvents((prev) => prev.map((e) => (e.id === editingEvent.id ? updated : e)));
        const updatePayload: { title: string; date: string; end_date: string | null } = {
          title: eventTitle,
          date: eventDate,
          end_date: eventEndDate,
        };
        const { error } = await supabase.from("events").update(updatePayload).eq("id", editingEvent.id);
        if (error) {
          setEvents(prevEvents);
          toast("שגיאה בעדכון האירוע", "error");
          setSaving(false);
          return;
        }
      } else {
        const newEvent: CalendarEvent = {
          id: generateId(), user_id: user.id, title: eventTitle,
          date: eventDate, color: null, is_project: false,
          end_date: null, project_id: null,
        };
        setEvents((prev) => [...prev, newEvent]);
        const { error } = await supabase.from("events").insert({
          id: newEvent.id, user_id: user.id, title: eventTitle,
          date: eventDate, is_project: false,
        });
        if (error) {
          setEvents((prev) => prev.filter((e) => e.id !== newEvent.id));
          toast("שגיאה בשמירת האירוע", "error");
          setSaving(false);
          return;
        }
      }

      setSaving(false);
      setModalOpen(false);
    } catch {
      toast("שגיאה בשמירת האירוע", "error");
      setSaving(false);
    }
  }

  async function deleteEvent(id: string) {
    if (!confirm("האם למחוק אירוע זה?")) return;
    const removed = events.find((e) => e.id === id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      if (removed) setEvents((prev) => [...prev, removed]);
      toast("שגיאה במחיקת האירוע", "error");
    }
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startingDay = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const todayStr = formatDateStr(new Date());

  const cells: { day: number; dateStr: string; isOtherMonth: boolean }[] = [];
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startingDay - 1; i >= 0; i--) {
    cells.push({ day: prevMonthLastDay - i, dateStr: formatDateStr(new Date(year, month - 1, prevMonthLastDay - i)), isOtherMonth: true });
  }
  for (let i = 1; i <= totalDays; i++) {
    cells.push({ day: i, dateStr: formatDateStr(new Date(year, month, i)), isOtherMonth: false });
  }
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push({ day: i, dateStr: formatDateStr(new Date(year, month + 1, i)), isOtherMonth: true });
  }

  const daysOfWeek = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

  if (loading && events.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="w-48 h-8" />
          <div className="flex gap-2">
            <Skeleton className="w-20 h-9" />
            <Skeleton className="w-20 h-9" />
            <Skeleton className="w-20 h-9" />
          </div>
        </div>
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 gap-2 bg-slate-50 px-4 py-3 border-b">
            {Array.from({ length: 7 }).map((_, i) => (
              <SkeletonText key={i} className="w-full" />
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: 42 }).map((_, i) => (
              <div key={i} className="p-2 border-b border-l min-h-[90px]">
                <SkeletonText className="w-5 mb-2" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <CalendarIcon size={24} className="text-blue-500" />
          {MONTHS[month]} {year}
        </h1>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setCurrentDate(new Date())}>היום</Button>
          <Button variant="ghost" onClick={() => setCurrentDate(new Date(year, month - 1))}>
            <ChevronRight size={16} />
          </Button>
          <Button variant="ghost" onClick={() => setCurrentDate(new Date(year, month + 1))}>
            <ChevronLeft size={16} />
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 bg-slate-50 text-center py-3 text-[10px] sm:text-sm font-semibold text-slate-600 border-b">
          {daysOfWeek.map((d) => <div key={d}>{d}</div>)}
        </div>
        {/* Calendar grid with spanning events */}
        <div className="overflow-x-auto">
          <div className="grid grid-cols-7" style={{ gridAutoRows: "minmax(60px, auto)" }}>
            {cells.map((cell, i) => {
              const isToday = cell.dateStr === todayStr;
              // Events are shown on every day they cover: single-day events only on
              // their date, multi-day events (end_date set) across the whole span.
              // Spanning events render first so their band is never cut off.
              const cellEvents = events
                .filter((e) => {
                  if (e.end_date) return cell.dateStr >= e.date && cell.dateStr <= e.end_date;
                  return e.date === cell.dateStr;
                })
                .sort((a, b) => {
                  if (!!a.end_date !== !!b.end_date) return a.end_date ? -1 : 1;
                  return 0;
                });

              return (
                <div
                  key={i}
                  onClick={() => openAddModal(cell.dateStr)}
                  className={`p-1 border-b border-l cursor-pointer transition-colors hover:bg-slate-50 relative ${
                    cell.isOtherMonth ? "bg-slate-50/50 text-slate-400" : ""
                  } ${isToday ? "bg-blue-50/50" : ""}`}
                >
                  <div className={`text-xs font-semibold mb-1 px-1 ${isToday ? "text-blue-600" : ""}`}>
                    {cell.day}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {cellEvents.slice(0, 3).map((ev) => {
                      const isSpanning = !!ev.end_date;
                      const isStart = isSpanning && ev.date === cell.dateStr;
                      const isEnd = isSpanning && ev.end_date === cell.dateStr;
                      const isHovered = hoveredId === ev.id;
                      // The title renders only on the first day of a multi-day band;
                      // continuation days show the colored bar only.
                      const showsTitle = !isSpanning || isStart;
                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => { e.stopPropagation(); openEditModal(ev); }}
                          onMouseEnter={() => setHoveredId(ev.id)}
                          onMouseLeave={() => setHoveredId((h) => (h === ev.id ? null : h))}
                          className={`text-[10px] px-1.5 py-0.5 truncate text-white cursor-pointer flex items-center gap-1 ${
                            isSpanning ? `relative z-10 ${spanningPillClasses(isStart, isEnd)}` : "rounded"
                          } ${isHovered ? "brightness-110" : ""}`}
                          style={{ backgroundColor: ev.color || "#3b82f6" }}
                          title={showsTitle ? ev.title : undefined}
                        >
                          {ev.is_project && showsTitle && <span className="opacity-60 text-[8px]">P</span>}
                          {showsTitle ? ev.title : "\u00A0"}
                        </div>
                      );
                    })}
                    {cellEvents.length > 3 && (
                      <div className="text-[10px] text-slate-400 px-1">+{cellEvents.length - 3}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        footer={
          <div className="flex gap-2 justify-between w-full">
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>ביטול</Button>
              <Button loading={saving} onClick={handleSave}>
                <Plus size={14} /> {editingEvent ? "עדכן" : "שמור"}
              </Button>
            </div>
            {editingEvent && !editingEvent.is_project && (
              <Button variant="danger" onClick={() => { deleteEvent(editingEvent.id); setModalOpen(false); }}>
                מחק
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-6">
          <input
            type="text"
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            placeholder="הזן כותרת..."
            className="w-full text-2xl font-bold text-slate-900 placeholder:text-slate-400 outline-none border-none bg-transparent"
          />

          <div className="border-t border-slate-200" />

          <div className="space-y-4">
            {/* Date range */}
            <div className="flex items-center gap-3">
              <div className="w-7 shrink-0 flex justify-center text-slate-400">
                <CalendarDays size={20} />
              </div>
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {eventEndDate && (
                  <>
                    <span className="text-slate-400 shrink-0">–</span>
                    <input
                      type="date"
                      value={eventEndDate}
                      onChange={(e) => setEventEndDate(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Color / type */}
            <div className="flex items-center gap-3">
              <div className="w-7 shrink-0 flex justify-center">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: editingEvent?.color || "#3b82f6" }}
                />
              </div>
              <span className="text-sm text-slate-600">
                {editingEvent?.is_project ? "אירוע פרויקט" : "אירוע אישי"}
              </span>
            </div>

            {/* Project info */}
            {editingEvent?.project_id && (() => {
              const p = projects.find((x) => x.id === editingEvent.project_id);
              if (!p) return null;
              return (
                <div className="flex items-start gap-3">
                  <div className="w-7 shrink-0 flex justify-center text-slate-400 pt-1">
                    <FolderKanban size={20} />
                  </div>
                  <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-bold text-slate-800">
                      {p.customer_name || "פרויקט"}
                    </p>
                    {p.location && (
                      <p className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                        <MapPin size={12} />
                        {p.location}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-600">
                      {p.start_date && <span>מתחיל: {fmt(p.start_date)}</span>}
                      {p.duration && <span>משך: {p.duration} ימים</span>}
                      {p.closing_price != null && (
                        <span className="font-semibold text-emerald-700">
                          סגירה: {formatCurrency(p.closing_price)}
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/projects/detail/?project=${editingEvent.project_id}`}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      <FolderKanban size={13} />
                      פתח פרויקט
                    </Link>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </Modal>
    </div>
  );
}
