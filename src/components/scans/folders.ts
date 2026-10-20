import {
  FileBadge, BookCheck, Stamp, IdCard, Car, Plane, Landmark,
  ShieldCheck, Handshake, Store, CarFront,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface PremadeFolder {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
}

// תיקיות שמירת מסמכים עסקיים קבועות (ה-id זהה לשם — מזוהה לפי שם בעמודת folder)
export const PREMADE_FOLDERS: PremadeFolder[] = [
  { id: "תעודת עוסק", name: "תעודת עוסק", icon: FileBadge, color: "bg-blue-100 text-blue-600" },
  { id: "אישור ניהול ספרים", name: "אישור ניהול ספרים", icon: BookCheck, color: "bg-emerald-100 text-emerald-600" },
  { id: "אישור מס במקור", name: "אישור מס במקור", icon: Stamp, color: "bg-orange-100 text-orange-600" },
  { id: "ת.ז", name: "ת.ז", icon: IdCard, color: "bg-purple-100 text-purple-600" },
  { id: "רישיון נהיגה", name: "רישיון נהיגה", icon: Car, color: "bg-amber-100 text-amber-600" },
  { id: "דרכון", name: "דרכון", icon: Plane, color: "bg-pink-100 text-pink-600" },
  { id: "אישור ניהול חשבון בנק", name: "אישור ניהול חשבון בנק", icon: Landmark, color: "bg-teal-100 text-teal-600" },
  { id: "ביטוחים", name: "ביטוחים", icon: ShieldCheck, color: "bg-sky-100 text-sky-600" },
  { id: "חוזים מול נותני שירות/ספקים", name: "חוזים מול נותני שירות/ספקים", icon: Handshake, color: "bg-indigo-100 text-indigo-600" },
  { id: "רישיונות עסק", name: "רישיונות עסק", icon: Store, color: "bg-rose-100 text-rose-600" },
  { id: "רישיון רכב", name: "רישיון רכב", icon: CarFront, color: "bg-lime-100 text-lime-600" },
];

export interface UserFolder {
  id: string;
  name: string;
}

const USER_FOLDER_PALETTE = [
  "bg-blue-100 text-blue-600",
  "bg-emerald-100 text-emerald-600",
  "bg-orange-100 text-orange-600",
  "bg-purple-100 text-purple-600",
  "bg-amber-100 text-amber-600",
  "bg-pink-100 text-pink-600",
  "bg-slate-100 text-slate-600",
];

export function userFolderColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return USER_FOLDER_PALETTE[hash % USER_FOLDER_PALETTE.length];
}

// User folders are identified by their name inside documents.folder
export function isPremade(folderId: string | null): boolean {
  return PREMADE_FOLDERS.some((f) => f.id === folderId);
}

export function folderDisplayName(folderId: string | null): string {
  if (!folderId) return "ללא";
  return PREMADE_FOLDERS.find((f) => f.id === folderId)?.name || folderId;
}
