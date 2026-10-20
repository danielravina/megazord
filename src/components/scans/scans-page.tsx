"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/layout/auth-provider";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Modal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/components/shared/format-date";
import { formatCurrency } from "@/components/shared/format-currency";
import { DocumentScanner } from "@/components/scans/document-scanner";
import { PREMADE_FOLDERS, userFolderColor, folderDisplayName } from "@/components/scans/folders";
import type { UserFolder } from "@/components/scans/folders";
import type { Project, ProjectRow } from "@/components/projects/project-types";
import { normalizeProject } from "@/components/projects/project-types";
import {
  FileText, Search, Folder, Trash2, X, Check, Plus, List, LayoutGrid, ChevronLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Document {
  id: string;
  user_id: string;
  title: string;
  image_url: string | null;
  tags: string[];
  extracted_text: string | null;
  doc_type: string;
  date_on_doc: string | null;
  total_amount: number | null;
  project_id: string | null;
  folder: string | null;
  is_investment: boolean;
  direction: string;
  business_id: string | null;
  date: string;
}

const DOC_TYPES = [
  { value: "tax_invoice", label: "חשבונית מס" },
  { value: "transaction_account", label: "חשבונית עסקה (תשלום עתידי)" },
  { value: "tax_invoice_receipt", label: "חשבונית מס/קבלה" },
  { value: "credit_invoice", label: "חשבונית מס זיכוי" },
  { value: "receipt", label: "קבלה" },
  { value: "quotation", label: "הצעת מחיר" },
  { value: "delivery_note", label: "תעודת משלוח" },
  { value: "other", label: "אחר" },
];

const DOC_TYPE_LABEL: Record<string, string> = Object.fromEntries(DOC_TYPES.map((d) => [d.value, d.label]));

const PAYED_SCAN_TYPES = ["tax_invoice", "receipt", "tax_invoice_receipt"];

// מצב התשלום נגזר מסוג המסמך
function scanState(docType: string): "paid" | "future" | "none" {
  if (PAYED_SCAN_TYPES.includes(docType)) return "paid";
  if (docType === "credit_invoice") return "paid";
  if (docType === "transaction_account") return "future";
  return "none";
}

// אריח תיקייה בסטייל Drive: ריבוע עם צורת תיקייה (בליטה + גוף צבעוני)
// לחיצה = בחירה, לחיצה כפולה = פתיחה (כמו ב-Drive)
function FolderTile({
  name, color, icon: Icon, count, selected, onSelect, onOpen, onDelete,
}: {
  name: string;
  color: string;
  icon: LucideIcon;
  count: number;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      onDoubleClick={onOpen}
      className={`group relative rounded-lg border shadow-sm transition-all cursor-default flex flex-col items-center justify-center px-3 py-6 ${selected ? "border-blue-500 bg-blue-50" : "bg-white border-slate-200 hover:shadow-md hover:border-slate-300"}`}
    >
      <div className="relative w-20 h-16 mb-3 shrink-0">
        <div className={`absolute top-0 right-0 w-10 h-4 ${color} rounded-t-lg rounded-bl-[5px]`}></div>
        <div className={`absolute top-[7px] inset-x-0 bottom-0 ${color} rounded-lg flex items-center justify-center`}>
          <Icon size={22} className="opacity-30" />
        </div>
      </div>
      <h4 className="text-sm font-bold text-slate-700 truncate max-w-full mb-1">{name}</h4>
      <span className="text-xs text-slate-400">{count} מסמכים</span>
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="מחיקת תיקייה"
          className="absolute top-1.5 left-1.5 p-1.5 rounded-md text-slate-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

// שורת תיקייה בתצוגת רשימה
function FolderRow({
  name, color, icon: Icon, count, selected, onSelect, onOpen, onDelete,
}: {
  name: string;
  color: string;
  icon: LucideIcon;
  count: number;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      onDoubleClick={onOpen}
      className={`group flex items-center gap-4 px-4 py-4 cursor-default transition-colors ${selected ? "bg-blue-100" : "hover:bg-slate-50"}`}
    >
      <div className="relative w-14 h-11 shrink-0">
        <div className={`absolute top-0 right-0 w-7 h-3 ${color} rounded-t-lg rounded-bl-[3px]`}></div>
        <div className={`absolute top-[5px] inset-x-0 bottom-0 ${color} rounded-lg flex items-center justify-center`}>
          <Icon size={16} className="opacity-30" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{name}</p>
        <p className="text-[11px] text-slate-400">תיקייה · {count} מסמכים</p>
      </div>
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="מחיקת תיקייה"
          className="p-1.5 rounded-md text-slate-300 hover:text-red-600 hover:bg-red-50 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 size={14} />
        </button>
      )}
      <ChevronLeft size={16} className="text-slate-300 shrink-0" />
    </div>
  );
}

// אריח קובץ בתצוגת טאיילים
function FileTile({
  doc, displayUrls, selected, onSelect, onOpen, showFolder,
}: {
  doc: Document;
  displayUrls: Record<string, string>;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  showFolder: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      onDoubleClick={onOpen}
      className="text-right group cursor-default"
    >
      <div className={`relative aspect-square overflow-hidden transition-all p-2.5 rounded-lg border shadow-sm group-hover:shadow-md ${selected ? "border-blue-500 bg-blue-50" : "bg-slate-100 border-slate-200 group-hover:border-slate-300"}`}>
        <div className="w-full h-full rounded-md overflow-hidden bg-white border border-slate-100 shadow-sm">
          {doc.image_url ? (/\.pdf$/i.test(doc.image_url) ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-400">
              <FileText size={30} />
              <span className="text-[10px] font-bold tracking-widest">PDF</span>
            </div>
          ) : (
            <img src={displayUrls[doc.image_url] || doc.image_url} alt="" className="w-full h-full object-cover object-top" />
          )) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-300">
              <FileText size={30} />
            </div>
          )}
        </div>
      </div>
      <h3 className={`text-sm truncate mt-2 ${selected ? "font-semibold text-blue-700" : "font-semibold text-slate-800"}`}>{doc.title}</h3>
      <p className="text-[11px] text-slate-400 truncate">
        {formatDate(doc.date_on_doc || doc.date.split("T")[0])}
        {` · ${DOC_TYPE_LABEL[doc.doc_type] || doc.doc_type}`}
        {showFolder ? ` · ${folderDisplayName(doc.folder)}` : ""}
      </p>
      {doc.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {doc.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-medium border border-blue-100">{tag}</span>
          ))}
          {doc.tags.length > 2 && <span className="text-[10px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded-md border border-slate-200">+{doc.tags.length - 2}</span>}
        </div>
      )}
    </div>
  );
}

// שורת קובץ בתצוגת רשימה
function FileRow({
  doc, displayUrls, selected, onSelect, onOpen, showFolder,
}: {
  doc: Document;
  displayUrls: Record<string, string>;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  showFolder: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      onDoubleClick={onOpen}
      className={`flex items-center gap-3 px-4 py-2.5 cursor-default transition-colors ${selected ? "bg-blue-100" : "hover:bg-slate-50"}`}
    >
      <div className="w-10 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-100 p-1">
        <div className="w-full h-full rounded-md overflow-hidden bg-white border border-slate-100">
          {doc.image_url ? (/\.pdf$/i.test(doc.image_url) ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-0.5 text-slate-400">
              <FileText size={13} />
              <span className="text-[6px] font-bold tracking-widest">PDF</span>
            </div>
          ) : (
            <img src={displayUrls[doc.image_url] || doc.image_url} alt="" className="w-full h-full object-cover object-top" />
          )) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <FileText size={13} />
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-slate-800 truncate">{doc.title}</h3>
        <p className="text-[11px] text-slate-400 truncate">
          {formatDate(doc.date_on_doc || doc.date.split("T")[0])}
          {` · ${DOC_TYPE_LABEL[doc.doc_type] || doc.doc_type}`}
        </p>
      </div>
      {showFolder && doc.folder && (
        <span className="hidden sm:flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg shrink-0 max-w-[140px]">
          <Folder size={11} className="shrink-0" />
          <span className="truncate">{folderDisplayName(doc.folder)}</span>
        </span>
      )}
      <ChevronLeft size={16} className="text-slate-300 shrink-0" />
    </div>
  );
}

export function ScansPage() {
  const { supabase, user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const documentParam = searchParams.get("document");
  const supplierParam = searchParams.get("supplier");
  const [docs, setDocs] = useState<Document[]>([]);
  const [userFolders, setUserFolders] = useState<UserFolder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [businesses, setBusinesses] = useState<{ id: string; name: string; vat_number: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewId, setViewId] = useState<string | null>(null);
  const [editingView, setEditingView] = useState(false);
  const [showExtracted, setShowExtracted] = useState(false);
  const [viewEdit, setViewEdit] = useState({ title: "", docType: "other", dateOnDoc: "", totalAmount: "", folder: "", isInvestment: false, tags: "", projectId: "", businessId: "", direction: "expense" });
  const [search, setSearch] = useState("");
  // תיקייה פעילה (id של תיקייה מובנית או שם של תיקיית משתמש). null = ראשי
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [addFolderOpen, setAddFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  // בחירה בסטייל Drive: לחיצה בוחרת, לחיצה כפולה פותחת. במסכי מגע — לחיצה אחת פותחת
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const touchMode = typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;

  function selectOrOpen(id: string, open: () => void) {
    if (touchMode) {
      open();
      return;
    }
    setSelectedId(id);
  }

  const [displayUrls, setDisplayUrls] = useState<Record<string, string>>({});

  async function getSignedUrl(storagePath: string): Promise<string> {
    if (!storagePath) return "";
    if (displayUrls[storagePath]) return displayUrls[storagePath];
    // Check localStorage cache (24h TTL)
    const key = `img_${storagePath}`;
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const { url, ts } = JSON.parse(cached);
        if (Date.now() - ts < 86400000) {
          setDisplayUrls((prev) => ({ ...prev, [storagePath]: url }));
          return url;
        }
      }
    } catch {}
    const { data } = await supabase.storage.from("documents").createSignedUrl(storagePath, 604800);
    const url = data?.signedUrl || "";
    if (url) {
      setDisplayUrls((prev) => ({ ...prev, [storagePath]: url }));
      localStorage.setItem(key, JSON.stringify({ url, ts: Date.now() }));
    }
    return url;
  }

  useEffect(() => {
    if (!user) return;
    Promise.all([loadDocs(), loadFolders(), loadProjects(), loadBusinesses()]).finally(() => setLoading(false));
  }, [user]);

  // Open the detail view directly when navigating with ?document=<id> (e.g. from global search)
  useEffect(() => {
    if (!documentParam || docs.length === 0) return;
    if (!docs.some((d) => d.id === documentParam)) return;
    const t = setTimeout(() => setViewId(documentParam), 0);
    return () => clearTimeout(t);
  }, [docs, documentParam]);

  // Load signed URLs when viewing a document
  useEffect(() => {
    const path = viewing?.image_url;
    if (path && !path.startsWith("http")) getSignedUrl(path);
  }, [viewId]);

  // Preload signed URLs for all visible doc thumbnails
  useEffect(() => {
    docs.forEach((doc) => {
      if (doc.image_url && !doc.image_url.startsWith("http") && !displayUrls[doc.image_url]) {
        getSignedUrl(doc.image_url);
      }
    });
  }, [docs]);

  async function loadDocs() {
    const { data } = await supabase.from("documents").select("*").eq("user_id", user!.id).order("date_on_doc", { ascending: false, nullsFirst: false }).order("date", { ascending: false });
    setDocs(data || []);
  }

  async function loadFolders() {
    const { data } = await supabase.from("folders").select("id, name").eq("user_id", user!.id).order("created_at");
    setUserFolders(data || []);
  }

  async function loadProjects() {
    const { data } = await supabase.from("projects").select("id, customer_id, customers(name)").eq("user_id", user!.id);
    setProjects(((data || []) as ProjectRow[]).map(normalizeProject));
  }

  async function loadBusinesses() {
    const { data } = await supabase.from("businesses").select("id, name, vat_number").eq("user_id", user!.id);
    setBusinesses(data || []);
  }

  function startEditView() {
    if (!viewing) return;
    setViewEdit({
      title: viewing.title,
      docType: viewing.doc_type,
      dateOnDoc: viewing.date_on_doc || "",
      totalAmount: viewing.total_amount?.toString() || "",
      folder: viewing.folder || "",
      isInvestment: viewing.is_investment,
      tags: viewing.tags.join(", "),
      projectId: viewing.project_id || "",
      businessId: viewing.business_id || "",
      direction: viewing.direction || "expense",
    });
    setEditingView(true);
  }

  async function saveViewEdit() {
    if (!viewing || !user) return;
    const { error } = await supabase.from("documents").update({
      title: viewEdit.title,
      doc_type: viewEdit.docType,
      date_on_doc: viewEdit.dateOnDoc || null,
      total_amount: parseFloat(viewEdit.totalAmount) || null,
      folder: viewEdit.folder || null,
      is_investment: viewEdit.isInvestment,
      tags: viewEdit.tags.split(",").map((t) => t.trim()).filter(Boolean),
      project_id: viewEdit.projectId || null,
      business_id: viewEdit.businessId || null,
      direction: viewEdit.direction,
    }).eq("id", viewing.id);

    if (error) {
      toast("שגיאה בעדכון", "error");
    } else {
      toast("המסמך עודכן", "success");
      setEditingView(false);
      setViewId(null);
      loadDocs();
    }
  }

  async function deleteDoc(id: string) {
    if (!confirm("האם למחוק מסמך זה?")) return;
    setDocs((prev) => prev.filter((d) => d.id !== id));
    setViewId(null);
    await supabase.from("documents").delete().eq("id", id);
  }

  // "סמן כשולם" על מסמך תשלום עתידי = שינוי הסוג לסוג ששולם (קבלה/חשבונית מס).
  // ההכנסה/הוצאה נרשמת מעצם הסוג החדש (evidence-based ledger).
  async function markScanPaid() {
    if (!viewing || !user) return;
    const paidType = viewing.direction === "income" ? "tax_invoice_receipt" : "receipt";
    const { error } = await supabase.from("documents").update({ doc_type: paidType }).eq("id", viewing.id);
    if (error) {
      toast("שגיאה בעדכון", "error");
    } else {
      setDocs((prev) => prev.map((d) => (d.id === viewing.id ? { ...d, doc_type: paidType } : d)));
      toast("המסמך סומן כשולם", "success");
      setViewId(null);
      setEditingView(false);
    }
  }

  async function addFolder() {
    const name = newFolderName.trim();
    if (!user || !name) return;
    const premadeNames = PREMADE_FOLDERS.map((f) => f.name);
    if (premadeNames.includes(name) || userFolders.some((f) => f.name === name)) {
      toast("קיימת כבר תיקייה בשם זה", "error");
      return;
    }
    const { data, error } = await supabase.from("folders").insert({ user_id: user.id, name }).select("id, name").single();
    if (error || !data) {
      toast("שגיאה ביצירת התיקייה", "error");
      return;
    }
    setUserFolders((prev) => [...prev, data]);
    setAddFolderOpen(false);
    setNewFolderName("");
    toast("התיקייה נוצרה", "success");
  }

  async function deleteFolder(folder: UserFolder) {
    if (!confirm(`האם למחוק את התיקייה "${folder.name}"? המסמכים שבה יועברו לראשי.`)) return;
    // המסמכים שבתיקייה — משוחררים כקבצים ללא תיקייה, מוצגים בראשי העמוד
    await supabase.from("documents").update({ folder: null }).eq("user_id", user!.id).eq("folder", folder.name);
    await supabase.from("folders").delete().eq("id", folder.id);
    setUserFolders((prev) => prev.filter((f) => f.id !== folder.id));
    setDocs((prev) => prev.map((d) => (d.folder === folder.name ? { ...d, folder: null } : d)));
    if (activeFolder === folder.name) setActiveFolder(null);
    toast("התיקייה נמחקה", "success");
  }

  const folderOptions = [
    { value: "", label: "ללא" },
    ...PREMADE_FOLDERS.map((f) => ({ value: f.id, label: f.name })),
    ...userFolders.map((f) => ({ value: f.name, label: f.name })),
  ];

  const filteredDocs = docs.filter((d) => {
    if (supplierParam && d.business_id !== supplierParam) return false;
    if (activeFolder && d.folder !== activeFolder) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return d.title.toLowerCase().includes(q) ||
      (d.extracted_text || "").toLowerCase().includes(q) ||
      d.tags.some((t) => t.toLowerCase().includes(q));
  });

  const viewing = docs.find((d) => d.id === viewId);
  const activeFolderName = activeFolder ? folderDisplayName(activeFolder) : null;
  const supplierBusiness = supplierParam ? businesses.find((b) => b.id === supplierParam) : null;
  // כשהחיפוש פעיל בראשי — מסתירים את התיקיות ומציגים תוצאות בלבד
  const showFolders = !activeFolder && !search && !supplierParam;
  // במסך הראשי (ללא חיפוש) לא מוצגת רשימת מסמכים — הכל תיקיות או קבצים בתוך תיקייה
  const showFiles = activeFolder || !!search || supplierParam;
  // הקבצים שנוספו לאחרונה (לפי תאריך הוספה)
  const recentDocs = [...docs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

  if (loading && docs.length === 0) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="w-48 h-8" />
          <Skeleton className="w-32 h-9" />
        </div>
        <Skeleton className="w-full sm:max-w-md h-11 rounded-xl mb-6" />
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square rounded-lg" />
              <SkeletonText className="w-3/4" />
              <SkeletonText className="w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const docCount = (folderId: string) => docs.filter((d) => d.folder === folderId).length;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FileText size={24} className="text-blue-500" />
          {activeFolderName ? (
            <span className="flex items-center gap-2">
              <Folder size={24} className="text-blue-500" />
              {activeFolderName}
            </span>
          ) : (
            "המסמכים העסקיים"
          )}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <DocumentScanner onScanned={() => { loadDocs(); if (activeFolder === null) loadFolders(); }} primary />
          <div className="flex bg-slate-100 p-1 rounded-lg" title="מצב תצוגה">
            <button
              onClick={() => setView("list")}
              title="תצוגת רשימה"
              className={`p-1.5 rounded-md ${view === "list" ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setView("grid")}
              title="תצוגת אריחים"
              className={`p-1.5 rounded-md ${view === "grid" ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ניווט: עמוד ראשי / תיקייה/ספק */}
      {activeFolder && (
        <div className="flex items-center gap-2 mb-4 text-sm">
          <button
            onClick={() => setActiveFolder(null)}
            className="flex items-center gap-1 text-blue-600 font-medium hover:underline"
          >
            <Folder size={14} /> כל התיקיות
          </button>
          <span className="text-slate-300">/</span>
          <span className="font-bold text-slate-700">{activeFolderName}</span>
        </div>
      )}
      {supplierParam && (
        <button onClick={() => router.push("/documents/")} className="text-blue-600 text-xs font-medium mb-3 flex items-center gap-1">
          <X size={12} /> מסמכי {supplierBusiness?.name || "הספק"} — חזרה לכל המסמכים
        </button>
      )}

      <div className="relative mb-4">
        <Search size={16} className="absolute right-3 top-3 text-slate-400" />
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={activeFolder ? `חיפוש בתיקייה ${activeFolderName}...` : "חיפוש מסמכים או תגיות..."} dir="rtl"
          className="w-full bg-slate-100 rounded-xl py-2.5 pr-10 pl-4 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      {/* תיקיות — מוצגות בעמוד הראשי (מוסתרות במסך תיקייה, בחיפוש ובסינון ספק) */}
      {showFolders && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase">תיקיות</h3>
            <Button variant="secondary" size="sm" onClick={() => { setNewFolderName(""); setAddFolderOpen(true); }}>
              <Plus size={14} /> תיקייה חדשה
            </Button>
          </div>
          {view === "grid" ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {userFolders.map((f) => (
                <FolderTile
                  key={f.id}
                  name={f.name}
                  color={userFolderColor(f.name)}
                  icon={Folder}
                  count={docCount(f.name)}
                  selected={selectedId === f.id}
                  onSelect={() => selectOrOpen(f.id, () => setActiveFolder(f.name))}
                  onOpen={() => { setActiveFolder(f.name); setSearch(""); setSelectedId(null); }}
                  onDelete={() => deleteFolder(f)}
                />
              ))}
              {PREMADE_FOLDERS.map((f) => (
                <FolderTile
                  key={f.id}
                  name={f.name}
                  color={f.color}
                  icon={f.icon}
                  count={docCount(f.id)}
                  selected={selectedId === f.id}
                  onSelect={() => selectOrOpen(f.id, () => setActiveFolder(f.id))}
                  onOpen={() => { setActiveFolder(f.id); setSearch(""); setSelectedId(null); }}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-slate-100 bg-white overflow-hidden divide-y divide-slate-100 shadow-sm">
              {userFolders.map((f) => (
                <FolderRow
                  key={f.id}
                  name={f.name}
                  color={userFolderColor(f.name)}
                  icon={Folder}
                  count={docCount(f.name)}
                  selected={selectedId === f.id}
                  onSelect={() => selectOrOpen(f.id, () => setActiveFolder(f.name))}
                  onOpen={() => { setActiveFolder(f.name); setSearch(""); setSelectedId(null); }}
                  onDelete={() => deleteFolder(f)}
                />
              ))}
              {PREMADE_FOLDERS.map((f) => (
                <FolderRow
                  key={f.id}
                  name={f.name}
                  color={f.color}
                  icon={f.icon}
                  count={docCount(f.id)}
                  selected={selectedId === f.id}
                  onSelect={() => selectOrOpen(f.id, () => setActiveFolder(f.id))}
                  onOpen={() => { setActiveFolder(f.id); setSearch(""); setSelectedId(null); }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* קבצים אחרונים בראשי — הנסרקו/נוספו לאחרונה */}
      {showFolders && recentDocs.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">קבצים אחרונים</h3>
          {view === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {recentDocs.map((doc) => (
                <FileTile key={doc.id} doc={doc} displayUrls={displayUrls} showFolder selected={selectedId === doc.id} onSelect={() => selectOrOpen(doc.id, () => setViewId(doc.id))} onOpen={() => { setViewId(doc.id); setSelectedId(doc.id); }} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-slate-100 bg-white overflow-hidden divide-y divide-slate-100 shadow-sm">
              {recentDocs.map((doc) => (
                <FileRow key={doc.id} doc={doc} displayUrls={displayUrls} showFolder selected={selectedId === doc.id} onSelect={() => selectOrOpen(doc.id, () => setViewId(doc.id))} onOpen={() => { setViewId(doc.id); setSelectedId(doc.id); }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* קבצים בתיקייה / בחיפוש / בסינון ספק */}
      {showFiles && (filteredDocs.length === 0 ? (
        <Card className="p-10">
          {activeFolder && !search ? (
            <EmptyState
              icon={<Folder size={36} className="text-blue-300" />}
              title="התיקייה ריקה"
              description="הוסף מסמך לתיקייה דרך מסך עריכת המסמך"
            />
          ) : (
            <EmptyState
              icon={<Search size={32} className="text-blue-300" />}
              title="לא נמצאו מסמכים"
              description="נסה חיפוש אחר"
            />
          )}
        </Card>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-24">
          {filteredDocs.map((doc) => (
            <FileTile key={doc.id} doc={doc} displayUrls={displayUrls} showFolder={!activeFolder} selected={selectedId === doc.id} onSelect={() => selectOrOpen(doc.id, () => setViewId(doc.id))} onOpen={() => { setViewId(doc.id); setSelectedId(doc.id); }} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-100 bg-white overflow-hidden divide-y divide-slate-100 mb-24">
          {filteredDocs.map((doc) => (
            <FileRow key={doc.id} doc={doc} displayUrls={displayUrls} showFolder={!activeFolder} selected={selectedId === doc.id} onSelect={() => selectOrOpen(doc.id, () => setViewId(doc.id))} onOpen={() => { setViewId(doc.id); setSelectedId(doc.id); }} />
          ))}
        </div>
      ))}

      {/* Add Folder Modal */}
      <Modal
        open={addFolderOpen}
        onClose={() => setAddFolderOpen(false)}
        title="תיקייה חדשה"
        size="sm"
        footer={
          <div className="flex gap-2 justify-between w-full">
            <Button variant="ghost" onClick={() => setAddFolderOpen(false)}>ביטול</Button>
            <Button onClick={addFolder} disabled={!newFolderName.trim()}>צור</Button>
          </div>
        }
      >
        <Input
          label="שם התיקייה"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addFolder()}
          placeholder="למשל: חוזים"
          autoFocus
        />
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={!!viewId}
        onClose={() => { setViewId(null); setEditingView(false); setShowExtracted(false); }}
        title={viewing?.title || ""}
        size="full"
        footer={
          <div className="flex flex-wrap gap-2 justify-between w-full">
            <Button variant="danger" onClick={() => viewing && deleteDoc(viewing.id)}><Trash2 size={14} /> מחק</Button>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => { setViewId(null); setEditingView(false); }}>סגור</Button>
              {viewing && viewing.doc_type === "transaction_account" && (
                <Button variant="secondary" onClick={markScanPaid} title="שינוי סוג המסמך לקבלה/חשבונית מס — מסמן שהתשלום התקבל">
                  <Check size={14} /> סמן כשולם
                </Button>
              )}
              {editingView ? (
                <Button onClick={saveViewEdit}>שמור</Button>
              ) : (
                <Button onClick={startEditView}>ערוך</Button>
              )}
            </div>
          </div>
        }
      >
        {viewing && (
          <div className="flex flex-col md:flex-row gap-0 h-full">
            <div className="flex-1 space-y-4 min-w-0 overflow-y-auto p-1">
              {editingView ? (
                <>
                  <Input label="כותרת" value={viewEdit.title} onChange={(e) => setViewEdit({ ...viewEdit, title: e.target.value })} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Select label="סוג מסמך" options={DOC_TYPES} value={viewEdit.docType} onChange={(e) => setViewEdit({ ...viewEdit, docType: e.target.value })} />
                    <Input label="סכום (₪)" type="number" value={viewEdit.totalAmount} onChange={(e) => setViewEdit({ ...viewEdit, totalAmount: e.target.value })} />
                  </div>
                  <Input label="תאריך במסמך" type="date" value={viewEdit.dateOnDoc} onChange={(e) => setViewEdit({ ...viewEdit, dateOnDoc: e.target.value })} />
                  <Select label="ספק" options={[
                    { value: "", label: "ללא ספק" },
                    ...businesses.map((b) => ({ value: b.id, label: b.name })),
                    { value: "new", label: "+ הוסף ספק" },
                  ]} value={viewEdit.businessId} onChange={(e) => setViewEdit({ ...viewEdit, businessId: e.target.value })} />
                  <Select label="תיקייה" options={folderOptions} value={viewEdit.folder} onChange={(e) => setViewEdit({ ...viewEdit, folder: e.target.value })} />
                  <Select label="שיוך לפרויקט" options={[{ value: "", label: "ללא" }, ...projects.map((p) => ({ value: p.id, label: p.customer_name || "ללא שם" }))]} value={viewEdit.projectId} onChange={(e) => setViewEdit({ ...viewEdit, projectId: e.target.value })} />
                  <Select label="הוצאה / הכנסה" options={[
                    { value: "expense", label: "הוצאה" },
                    { value: "income", label: "הכנסה" },
                    { value: "other", label: "אחר" },
                  ]} value={viewEdit.direction} onChange={(e) => setViewEdit({ ...viewEdit, direction: e.target.value })} />
                  <Checkbox label="השקעה בעסק" checked={viewEdit.isInvestment} onChange={(e) => setViewEdit({ ...viewEdit, isInvestment: e.target.checked })} />
                  <Input label="תגיות" value={viewEdit.tags} onChange={(e) => setViewEdit({ ...viewEdit, tags: e.target.value })} />
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl">
                    <div><span className="text-[10px] font-bold text-slate-500 uppercase">סוג</span><p className="text-sm font-medium">{DOC_TYPE_LABEL[viewing.doc_type] || viewing.doc_type}</p></div>
                    <div><span className="text-[10px] font-bold text-slate-500 uppercase">סכום</span><p className="text-sm font-medium">{viewing.total_amount ? formatCurrency(viewing.total_amount) : "-"}</p></div>
                    <div><span className="text-[10px] font-bold text-slate-500 uppercase">תאריך במסמך</span><p className="text-sm font-medium">{viewing.date_on_doc ? viewing.date_on_doc.split("-").reverse().join("/") : "-"}</p></div>
                    <div><span className="text-[10px] font-bold text-slate-500 uppercase">תיקייה</span><p className="text-sm font-medium">{folderDisplayName(viewing.folder)}</p></div>
                    <div><span className="text-[10px] font-bold text-slate-500 uppercase">ספק</span><p className="text-sm font-medium">{businesses.find((b) => b.id === viewing.business_id)?.name || "ללא"}</p></div>
                    <div><span className="text-[10px] font-bold text-slate-500 uppercase">פרויקט</span><p className="text-sm font-medium">{projects.find((p) => p.id === viewing.project_id)?.customer_name || "ללא"}</p></div>
                    <div><span className="text-[10px] font-bold text-slate-500 uppercase">סוג תנועה</span><p className="text-sm font-medium">{viewing.direction === "income" ? "הכנסה" : viewing.direction === "other" ? "אחר" : "הוצאה"}</p></div>
                    <div><span className="text-[10px] font-bold text-slate-500 uppercase">מצב</span><p className="text-sm font-medium">{scanState(viewing.doc_type) === "paid" ? "שולם" : scanState(viewing.doc_type) === "future" ? "תשלום עתידי" : "לא פיננסי"}</p></div>
                    <div className="col-span-2"><span className="text-[10px] font-bold text-slate-500 uppercase">השקעה</span><p className="text-sm font-medium">{viewing.is_investment ? "כן" : "לא"}</p></div>
                  </div>
                  {viewing.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {viewing.tags.map((t) => <Badge key={t} variant="blue">{t}</Badge>)}
                    </div>
                  )}
                  {viewing.extracted_text && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <button
                        onClick={() => setShowExtracted(!showExtracted)}
                        className="w-full flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase"
                      >
                        <span>טקסט שחולץ</span>
                        <span className="text-xs">{showExtracted ? "הסתר" : "הצג"}</span>
                      </button>
                      {showExtracted && (
                        <p className="text-sm text-slate-700 whitespace-pre-wrap max-h-40 overflow-y-auto mt-2">{viewing.extracted_text}</p>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-slate-400">
                    נוסף: {new Date(viewing.date).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </>
              )}
            </div>
            {viewing.image_url && (
              <div className="md:w-1/2 shrink-0 bg-slate-100 border border-slate-200 flex items-center justify-center h-64 md:h-full overflow-hidden">
                {/\.pdf$/i.test(viewing.image_url) ? (
                  <iframe src={displayUrls[viewing.image_url] || viewing.image_url} title="קובץ PDF" className="w-full h-full" />
                ) : (
                  <img src={displayUrls[viewing.image_url] || viewing.image_url} alt="" className="w-full h-full object-contain" />
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
