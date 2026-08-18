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
import type { Project, ProjectRow } from "@/components/projects/project-types";
import { normalizeProject } from "@/components/projects/project-types";
import {
  FileText, Search, Folder, Trash2, X, Check,
  Building, Shield, User, Truck, Users,
  FileSpreadsheet,
} from "lucide-react";

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

const FOLDERS = [
  { id: "Bank", name: "בנק", icon: Building, color: "bg-blue-100 text-blue-600" },
  { id: "VAT", name: 'מע"מ', icon: FileSpreadsheet, color: "bg-emerald-100 text-emerald-600" },
  { id: "Income Tax", name: "מס הכנסה", icon: FileText, color: "bg-orange-100 text-orange-600" },
  { id: "National Insurance", name: "ביטוח לאומי", icon: Shield, color: "bg-purple-100 text-purple-600" },
  { id: "Accountant", name: "רואה חשבון", icon: User, color: "bg-slate-100 text-slate-600" },
  { id: "Suppliers", name: "ספקים", icon: Truck, color: "bg-amber-100 text-amber-600" },
  { id: "Employees", name: "עובדים", icon: Users, color: "bg-pink-100 text-pink-600" },
  { id: "Other", name: "אחר", icon: Folder, color: "bg-gray-100 text-gray-600" },
] as const;

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

export function ScansPage() {
  const { supabase, user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const documentParam = searchParams.get("document");
  const supplierParam = searchParams.get("supplier");
  const [docs, setDocs] = useState<Document[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [businesses, setBusinesses] = useState<{ id: string; name: string; vat_number: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewId, setViewId] = useState<string | null>(null);
  const [editingView, setEditingView] = useState(false);
  const [showExtracted, setShowExtracted] = useState(false);
  const [viewEdit, setViewEdit] = useState({ title: "", docType: "other", dateOnDoc: "", totalAmount: "", folder: "", isInvestment: false, tags: "", projectId: "", businessId: "", direction: "expense" });
  const [search, setSearch] = useState("");
  const [currentView, setCurrentView] = useState<"list" | "folders">("list");
  const [folderFilter, setFolderFilter] = useState<string | null>(null);

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
    Promise.all([loadDocs(), loadProjects(), loadBusinesses()]).finally(() => setLoading(false));
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

  const filteredDocs = docs.filter((d) => {
    if (supplierParam && d.business_id !== supplierParam) return false;
    if (folderFilter && d.folder !== folderFilter) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return d.title.toLowerCase().includes(q) ||
      (d.extracted_text || "").toLowerCase().includes(q) ||
      d.tags.some((t) => t.toLowerCase().includes(q));
  });

  const viewing = docs.find((d) => d.id === viewId);

  if (loading && docs.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="w-48 h-8" />
          <Skeleton className="w-32 h-9" />
        </div>
        <Skeleton className="w-full h-11 rounded-xl mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white p-3 rounded-2xl shadow-sm border flex gap-4">
              <Skeleton className="w-20 h-24 rounded-xl shrink-0" />
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
                <SkeletonText className="w-2/3" />
                <SkeletonText className="w-1/3" />
                <div className="flex gap-1.5 mt-1">
                  <Skeleton className="h-4 w-16 rounded-md" />
                  <Skeleton className="h-4 w-12 rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FileText size={24} className="text-blue-500" />
          הסריקות שלי
        </h1>
        <div className="flex items-center gap-2">
          <DocumentScanner onScanned={loadDocs} primary />
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => { setCurrentView("list"); setFolderFilter(null); }} className={`px-3 py-1.5 text-xs font-bold rounded-md ${currentView === "list" ? "bg-white shadow-sm text-blue-600" : "text-slate-500"}`}>רשימה</button>
            <button onClick={() => setCurrentView("folders")} className={`px-3 py-1.5 text-xs font-bold rounded-md ${currentView === "folders" ? "bg-white shadow-sm text-blue-600" : "text-slate-500"}`}>תיקיות</button>
          </div>
        </div>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute right-3 top-3 text-slate-400" />
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש מסמכים או תגיות..." dir="rtl"
          className="w-full bg-slate-100 rounded-xl py-2.5 pr-10 pl-4 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      {currentView === "folders" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FOLDERS.map((f) => {
            const count = docs.filter((d) => d.folder === f.id).length;
            const Icon = f.icon;
            return (
              <Card
                key={f.id}
                hover
                className="p-4 flex flex-col items-center justify-center text-center"
                onClick={() => { setFolderFilter(f.id); setCurrentView("list"); }}
              >
                <div className={`${f.color} w-12 h-12 rounded-xl flex items-center justify-center mb-3 text-xl`}>
                  <Icon size={20} />
                </div>
                <h4 className="font-bold text-sm mb-1">{f.name}</h4>
                <span className="text-xs text-slate-400">{count} מסמכים</span>
              </Card>
            );
          })}
        </div>
      ) : (
        <>
          {supplierParam && (
            <button onClick={() => router.push("/scans/")} className="text-blue-600 text-xs font-medium mb-3 flex items-center gap-1">
              <X size={12} /> מסמכי {businesses.find((b) => b.id === supplierParam)?.name || "הספק"} — חזרה לכל הסריקות
            </button>
          )}
          {folderFilter && (
            <button onClick={() => setFolderFilter(null)} className="text-blue-600 text-xs font-medium mb-3 flex items-center gap-1">
              <X size={12} /> חזרה לכל הסריקות
            </button>
          )}

          {filteredDocs.length === 0 ? (
            <Card className="p-12">
              <EmptyState
                icon={<FileText size={40} className="text-blue-300" />}
                title="אין מסמכים עדיין"
                description="סרוק מסמך כדי להוסיף מסמך חדש"
              />
            </Card>
          ) : (
            <div className="space-y-3 mb-24">
              {filteredDocs.map((doc) => (
                <div key={doc.id} onClick={() => setViewId(doc.id)} className="bg-white p-3 rounded-2xl shadow-sm border flex gap-4 cursor-pointer hover:shadow-md transition-shadow">
                  <div className="w-20 h-24 bg-slate-100 rounded-xl overflow-hidden shrink-0 border">
                    {doc.image_url && (/\.pdf$/i.test(doc.image_url) ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-400">
                        <FileText size={22} />
                        <span className="text-[9px]">PDF</span>
                      </div>
                    ) : (
                      <img src={displayUrls[doc.image_url] || doc.image_url} alt="" className="w-full h-full object-cover" />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="font-semibold truncate mb-1">{doc.title}</h3>
                    <p className="text-xs text-slate-400 mb-2">
                      {formatDate(doc.date_on_doc || doc.date.split("T")[0])}
                      {DOC_TYPE_LABEL[doc.doc_type] || doc.doc_type}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {doc.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-medium border border-blue-100">{tag}</span>
                      ))}
                      {doc.tags.length > 2 && <span className="text-[10px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded-md border">+{doc.tags.length - 2}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      <Modal
        open={!!viewId}
        onClose={() => { setViewId(null); setEditingView(false); setShowExtracted(false); }}
        title={viewing?.title || ""}
        size="full"
        footer={
          <div className="flex gap-2 justify-between w-full">
            <Button variant="danger" onClick={() => viewing && deleteDoc(viewing.id)}><Trash2 size={14} /> מחק</Button>
            <div className="flex gap-2">
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
                  <Select label="תיקייה" options={[{ value: "", label: "ללא" }, ...FOLDERS.map((f) => ({ value: f.id, label: f.name }))]} value={viewEdit.folder} onChange={(e) => setViewEdit({ ...viewEdit, folder: e.target.value })} />
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
                    <div><span className="text-[10px] font-bold text-slate-500 uppercase">תיקייה</span><p className="text-sm font-medium">{FOLDERS.find((f) => f.id === viewing.folder)?.name || "ללא"}</p></div>
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
                    <div className="bg-slate-50 p-4 rounded-xl border">
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
              <div className="md:w-1/2 shrink-0 bg-slate-100 border flex items-center justify-center h-64 md:h-full overflow-hidden">
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
