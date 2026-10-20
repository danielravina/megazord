import {
  Building, FileSpreadsheet, FileText, Shield, User, Truck, Users, Folder,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface PremadeFolder {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
}

export const PREMADE_FOLDERS: PremadeFolder[] = [
  { id: "Bank", name: "בנק", icon: Building, color: "bg-blue-100 text-blue-600" },
  { id: "VAT", name: 'מע"מ', icon: FileSpreadsheet, color: "bg-emerald-100 text-emerald-600" },
  { id: "Income Tax", name: "מס הכנסה", icon: FileText, color: "bg-orange-100 text-orange-600" },
  { id: "National Insurance", name: "ביטוח לאומי", icon: Shield, color: "bg-purple-100 text-purple-600" },
  { id: "Accountant", name: "רואה חשבון", icon: User, color: "bg-slate-100 text-slate-600" },
  { id: "Suppliers", name: "ספקים", icon: Truck, color: "bg-amber-100 text-amber-600" },
  { id: "Employees", name: "עובדים", icon: Users, color: "bg-pink-100 text-pink-600" },
  { id: "Other", name: "אחר", icon: Folder, color: "bg-gray-100 text-gray-600" },
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
