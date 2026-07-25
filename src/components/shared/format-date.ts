import { format, parseISO } from "date-fns";
import { he } from "date-fns/locale";

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd/MM/yyyy", { locale: he });
}

export function formatDateLong(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd/MM/yyyy HH:mm", { locale: he });
}

export function formatDateHebrew(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "היום";
  const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  return `יום ${days[d.getDay()]}`;
}

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}
