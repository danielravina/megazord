"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/layout/auth-provider";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { generateId } from "@/components/shared/generate-id";
import {
  Calendar as CalendarIcon, ChevronRight, ChevronLeft, Plus,
} from "lucide-react";

interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  date: string;
  color: string | null;
  is_project: boolean;
}

const MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

function formatDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function CalendarPage() {
  const { supabase, user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const uid = user.id;
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", uid);
      if (cancelled) return;
      if (error) toast("שגיאה בטעינת אירועים", "error");
      setEvents(data || []);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [user, supabase, toast]);

  function openAddModal(dateStr: string) {
    setSelectedDate(dateStr);
    setEditingEvent(null);
    setEventTitle("");
    setModalOpen(true);
  }

  function openEditModal(event: CalendarEvent) {
    setSelectedDate(event.date);
    setEditingEvent(event);
    setEventTitle(event.title);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!eventTitle.trim() || !user) return;
    setSaving(true);

    if (editingEvent) {
      setEvents((prev) => prev.map((e) => (e.id === editingEvent.id ? { ...e, title: eventTitle } : e)));
      await supabase.from("events").update({ title: eventTitle }).eq("id", editingEvent.id);
    } else {
      const newEvent: CalendarEvent = {
        id: generateId(), user_id: user.id, title: eventTitle,
        date: selectedDate, color: null, is_project: false,
      };
      setEvents((prev) => [...prev, newEvent]);
      await supabase.from("events").insert({
        id: newEvent.id, user_id: user.id, title: eventTitle,
        date: selectedDate, is_project: false,
      });
    }

    setSaving(false);
    setModalOpen(false);
  }

  async function deleteEvent(id: string) {
    if (!confirm("האם למחוק אירוע זה?")) return;
    setEvents((prev) => prev.filter((e) => e.id !== id));
    await supabase.from("events").delete().eq("id", id);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
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
        <div className="grid grid-cols-7 bg-slate-50 text-center py-3 text-sm font-semibold text-slate-600 border-b">
          {daysOfWeek.map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7" style={{ gridAutoRows: "minmax(100px, auto)" }}>
          {cells.map((cell, i) => {
            const isToday = cell.dateStr === todayStr;
            const cellEvents = events.filter((e) => e.date === cell.dateStr);
            return (
              <div
                key={i}
                onClick={() => openAddModal(cell.dateStr)}
                className={`p-1 border-b border-l cursor-pointer transition-colors hover:bg-slate-50 ${
                  cell.isOtherMonth ? "bg-slate-50/50 text-slate-400" : ""
                } ${isToday ? "bg-blue-50/50" : ""}`}
              >
                <div className={`text-xs font-semibold mb-1 px-1 ${isToday ? "text-blue-600" : ""}`}>
                  {cell.day}
                </div>
                <div className="flex flex-col gap-0.5">
                  {cellEvents.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      onClick={(e) => { e.stopPropagation(); openEditModal(ev); }}
                      className="text-[10px] px-1.5 py-0.5 rounded truncate text-white cursor-pointer hover:opacity-80 flex items-center gap-1"
                      style={{ backgroundColor: ev.color || "#3b82f6" }}
                    >
                      {ev.is_project && <span className="opacity-60 text-[8px]">P</span>}
                      {ev.title}
                    </div>
                  ))}
                  {cellEvents.length > 3 && (
                    <div className="text-[10px] text-slate-400 px-1">+{cellEvents.length - 3}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingEvent ? "ערוך אירוע" : "הוסף אירוע"}
        footer={
          <div className="flex gap-2">
            {editingEvent && !editingEvent.is_project && (
              <Button variant="danger" onClick={() => { deleteEvent(editingEvent.id); setModalOpen(false); }}>
                מחק
              </Button>
            )}
            <Button variant="ghost" onClick={() => setModalOpen(false)}>ביטול</Button>
            <Button loading={saving} onClick={handleSave}>
              <Plus size={14} /> {editingEvent ? "עדכן" : "שמור"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="text-sm text-slate-600 bg-slate-50 p-2 rounded border">
            {selectedDate.split("-").reverse().join("/")}
          </div>
          <Input
            label="כותרת האירוע"
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            disabled={editingEvent?.is_project}
            placeholder={editingEvent?.is_project ? "לא ניתן לערוך אירוע פרויקט" : "הזן כותרת..."}
            required
          />
        </div>
      </Modal>
    </div>
  );
}
