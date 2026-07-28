"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/layout/auth-provider";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Modal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { generateId } from "@/components/shared/generate-id";
import { formatDate } from "@/components/shared/format-date";
import { formatCurrency } from "@/components/shared/format-currency";
import { MonthlyExport } from "./monthly-export";
import {
  FileText, Camera, Search, Folder, Trash2, X,
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
  is_paid: boolean;
  business_id: string | null;
  date: string;
}

interface Project {
  id: string;
  customer_name: string;
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
  { value: "Invoice", label: "חשבונית מס" },
  { value: "Delivery Note", label: "תעודת משלוח" },
  { value: "Proforma Invoice", label: "חשבונית פרופורמה" },
  { value: "Other", label: "אחר" },
];

export function DocumentsPage() {
  const { supabase, user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [businesses, setBusinesses] = useState<{ id: string; name: string; vat_number: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [bizDetails, setBizDetails] = useState({ business_name: "", vat_number: "", business_address: "", business_phone: "", accountant_email: "" });
  const [editingView, setEditingView] = useState(false);
  const [showExtracted, setShowExtracted] = useState(false);
  const [viewEdit, setViewEdit] = useState({ title: "", docType: "Other", dateOnDoc: "", totalAmount: "", folder: "", isInvestment: false, tags: "", projectId: "", businessId: "", direction: "expense" });
  const [search, setSearch] = useState("");
  const [currentView, setCurrentView] = useState<"list" | "folders">("list");
  const [folderFilter, setFolderFilter] = useState<string | null>(null);

  // Confirmation screen state
  const [confirmOpen, setConfirmOpen] = useState(false);
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
  const [tempDoc, setTempDoc] = useState<{
    imageUrl: string;
    title: string;
    tags: string[];
    extractedText: string;
    docType: string;
    dateOnDoc: string;
    totalAmount: string;
    folder: string;
    isInvestment: boolean;
    direction: string;
    projectId: string;
    newProjectName: string;
    businessId: string;
    businessVat: string;
    newBusinessName: string;
  }>({
    imageUrl: "", title: "", tags: [], extractedText: "", docType: "Other",
    dateOnDoc: "", totalAmount: "", folder: "", isInvestment: false,
    direction: "expense", projectId: "", newProjectName: "",
    businessId: "", businessVat: "", newBusinessName: "",
  });

  useEffect(() => {
    if (!user) return;
    Promise.all([loadDocs(), loadProjects(), loadBusinesses(), loadBizDetails()]).finally(() => setLoading(false));
  }, [user]);

  // Load signed URLs when viewing or confirming a document
  useEffect(() => {
    const path = viewing?.image_url || (confirmOpen ? tempDoc.imageUrl : null);
    if (path && !path.startsWith("http")) getSignedUrl(path);
  }, [viewId, confirmOpen]);

  // Preload signed URLs for all visible doc thumbnails
  useEffect(() => {
    docs.forEach((doc) => {
      if (doc.image_url && !doc.image_url.startsWith("http") && !displayUrls[doc.image_url]) {
        getSignedUrl(doc.image_url);
      }
    });
  }, [docs]);

  async function loadDocs() {
    const { data } = await supabase.from("documents").select("*").eq("user_id", user!.id).order("date", { ascending: false });
    setDocs(data || []);
  }

  async function loadProjects() {
    const { data } = await supabase.from("projects").select("id, customer_name").eq("user_id", user!.id);
    setProjects(data || []);
  }

  async function loadBusinesses() {
    const { data } = await supabase.from("businesses").select("id, name, vat_number").eq("user_id", user!.id);
    setBusinesses(data || []);
  }

  async function loadBizDetails() {
    const { data } = await supabase.from("tax_settings").select("business_name, vat_number, business_address, business_phone, accountant_email").eq("user_id", user!.id).maybeSingle();
    if (data) setBizDetails(data);
  }

  async function handleCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setProcessing(true);

    try {
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
      if (uploadError) {
        toast("שגיאה בהעלאת התמונה", "error");
        setProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      const { data: signedData } = await supabase.storage.from("documents").createSignedUrl(path, 604800);
      const signedUrl = signedData?.signedUrl || "";

      // OCR: call Supabase Edge Function
      let ocr = await tryOCR(signedUrl);
      if (!ocr) {
        ocr = { title: file.name.replace(/\.[^.]+$/, ""), tags: ["כללי"], extractedText: "", docType: "Other", dateOnDoc: "", totalAmount: null, folderSuggestion: "", isInvestment: false };
      }

      // Immediately save business if VAT detected and not already exists
      let bizId = "";
      const bizName = ocr.businessName || "";
      const bizVat = ocr.businessVat || "";
      if (bizVat) {
        const { data: existing } = await supabase.from("businesses")
          .select("id").eq("user_id", user.id).eq("vat_number", bizVat).maybeSingle();
        if (existing) {
          bizId = existing.id;
        } else {
          const newBizId = generateId();
          const { error: bizError } = await supabase.from("businesses").insert({
            id: newBizId, user_id: user.id, name: bizName || "עסק",
            vat_number: bizVat,
            address: ocr.businessAddress || null,
            phone: ocr.businessPhone || null,
          });
          if (!bizError) {
            bizId = newBizId;
            await loadBusinesses();
          }
        }
      }

      setTempDoc({
        imageUrl: path, title: ocr.title || file.name, tags: ocr.tags || ["כללי"],
        extractedText: ocr.extractedText || "", docType: ocr.docType || "Other",
        dateOnDoc: ocr.dateOnDoc || "", totalAmount: ocr.totalAmount?.toString() || "",
        folder: ocr.folderSuggestion || "", isInvestment: ocr.isInvestment || false,
        direction: "expense", projectId: "", newProjectName: "",
        businessId: bizId, businessVat: bizVat, newBusinessName: "",
      });
      setConfirmOpen(true);
    } catch {
      toast("שגיאה בהעלאת התמונה", "error");
    } finally {
      setProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function tryOCR(imageUrl: string) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ocr-document`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ imageUrl }),
      });
      if (res.ok) return await res.json();
    } catch {}
    return null;
  }

  async function saveDocument() {
    if (!user) return;
    let finalProjectId = tempDoc.projectId;

    if (tempDoc.projectId === "new" && tempDoc.newProjectName.trim()) {
      const newId = generateId();
      const { error: projError } = await supabase.from("projects").insert({ id: newId, user_id: user.id, customer_name: tempDoc.newProjectName.trim() });
      if (projError) {
        toast("שגיאה ביצירת הפרויקט", "error");
        return;
      }
      finalProjectId = newId;
      loadProjects();
    }

    // Auto-link or create business from OCR data or manual entry
    let finalBusinessId = tempDoc.businessId;
    if (tempDoc.businessId === "new" && tempDoc.newBusinessName.trim()) {
      const newBizId = generateId();
      const { error: bizError } = await supabase.from("businesses").insert({
        id: newBizId, user_id: user.id, name: tempDoc.newBusinessName.trim(), vat_number: tempDoc.businessVat || null,
      });
      if (!bizError) {
        finalBusinessId = newBizId;
        loadBusinesses();
      }
    } else if (!finalBusinessId && tempDoc.businessVat) {
      // Check if business with this VAT already exists
      const { data: existing } = await supabase.from("businesses")
        .select("id").eq("user_id", user.id).eq("vat_number", tempDoc.businessVat).maybeSingle();
      if (existing) {
        finalBusinessId = existing.id;
      } else {
        // Create new business
        const bizName = tempDoc.title || "עסק חדש";
        const newBizId = generateId();
        const { error: bizError } = await supabase.from("businesses").insert({
          id: newBizId, user_id: user.id, name: bizName, vat_number: tempDoc.businessVat,
        });
        if (!bizError) {
          finalBusinessId = newBizId;
          loadBusinesses();
        }
      }
    }

    const doc: Document = {
      id: generateId(), user_id: user.id, title: tempDoc.title || "מסמך ללא שם",
      image_url: tempDoc.imageUrl, tags: tempDoc.tags,
      extracted_text: tempDoc.extractedText, doc_type: tempDoc.docType,
      date_on_doc: tempDoc.dateOnDoc || null,
      total_amount: parseFloat(tempDoc.totalAmount) || null,
      project_id: finalProjectId || null,
      folder: tempDoc.folder || null,
      is_investment: tempDoc.isInvestment,
      direction: tempDoc.direction,
      is_paid: tempDoc.docType !== "Delivery Note",
      business_id: finalBusinessId || null,
      date: new Date().toISOString(),
    };

    setDocs((prev) => [doc, ...prev]);
    setConfirmOpen(false);

    const { error: insertError } = await supabase.from("documents").insert({
      id: doc.id, user_id: user.id, title: doc.title, image_url: doc.image_url,
      tags: doc.tags, extracted_text: doc.extracted_text, doc_type: doc.doc_type,
      date_on_doc: doc.date_on_doc, total_amount: doc.total_amount,
      project_id: doc.project_id, folder: doc.folder, is_investment: doc.is_investment,
      direction: doc.direction, is_paid: doc.is_paid, business_id: doc.business_id,
    });

    if (insertError) {
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      toast("שגיאה בשמירת המסמך", "error");
      return;
    }

    // Sync to finance
    if ((doc.total_amount ?? 0) > 0) {
      if (doc.direction === "income") {
        const { error: incError } = await supabase.from("incomes").insert({
          id: generateId(), user_id: user.id,
          date: doc.date_on_doc || new Date().toISOString().split("T")[0],
          amount: doc.total_amount, type: "שוטף",
          description: `הכנסה ממסמך: ${doc.title}`,
        });
        if (incError) toast("המסמך נשמר אך לא נוצרה הכנסה אוטומטית", "info");
      } else if (doc.direction !== "other" && doc.is_paid && doc.doc_type !== "Proforma Invoice") {
        const { error: expError } = await supabase.from("expenses").insert({
          id: generateId(), user_id: user.id,
          date: doc.date_on_doc || new Date().toISOString().split("T")[0],
          amount: doc.total_amount, is_paid: true,
          category: doc.folder || "כללי",
          description: `הוצאה ממסמך: ${doc.title}`,
        });
        if (expError) toast("המסמך נשמר אך לא נוצרה הוצאה אוטומטית", "info");
      }
      // Update project expenses
      if (finalProjectId) {
        const { data: proj, error: projFetchError } = await supabase.from("projects").select("expenses").eq("id", finalProjectId).single();
        if (!projFetchError && proj) {
          const { error: projUpdateError } = await supabase.from("projects").update({ expenses: (proj.expenses || 0) + (doc.total_amount ?? 0) }).eq("id", finalProjectId);
          if (projUpdateError) {
            toast("המסמך נשמר אך הוצאות הפרויקט לא עודכנו", "info");
          }
        }
      }
    }

    toast("המסמך נשמר", "success");
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

  const filteredDocs = docs.filter((d) => {
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
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (processing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Spinner size="lg" />
        <p className="text-slate-500">מנתח מסמך...</p>
        <p className="text-xs text-slate-400">הבינה המלאכותית קוראת את הטקסט ומזהה את סוג המסמך</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FileText size={24} className="text-blue-500" />
          המסמכים שלי
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setShowExport(true)}>
            <FileText size={14} />
            ייצוא חודשי
          </Button>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Camera size={14} />
            סרוק מסמך
          </Button>
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
          {folderFilter && (
            <button onClick={() => setFolderFilter(null)} className="text-blue-600 text-xs font-medium mb-3 flex items-center gap-1">
              <X size={12} /> חזרה לכל המסמכים
            </button>
          )}

          {filteredDocs.length === 0 ? (
            <Card className="p-12">
              <EmptyState
                icon={<FileText size={40} className="text-blue-300" />}
                title="אין מסמכים עדיין"
                description="לחץ על כפתור המצלמה למטה כדי לסרוק מסמך"
              />
            </Card>
          ) : (
            <div className="space-y-3 mb-24">
              {filteredDocs.map((doc) => (
                <div key={doc.id} onClick={() => setViewId(doc.id)} className="bg-white p-3 rounded-2xl shadow-sm border flex gap-4 cursor-pointer hover:shadow-md transition-shadow">
                  <div className="w-20 h-24 bg-slate-100 rounded-xl overflow-hidden shrink-0 border">
                    {doc.image_url && <img src={displayUrls[doc.image_url] || doc.image_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="font-semibold truncate mb-1">{doc.title}</h3>
                    <p className="text-xs text-slate-400 mb-2">
                      {formatDate(doc.date_on_doc || doc.date.split("T")[0])}
                      {doc.doc_type !== "Other" && <span className="mx-1">•</span>}{doc.doc_type}
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

      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCapture} />

      <MonthlyExport
        open={showExport}
        onClose={() => setShowExport(false)}
        docs={docs}
        businessName={bizDetails.business_name}
        vatNumber={bizDetails.vat_number}
        businessAddress={bizDetails.business_address}
        businessPhone={bizDetails.business_phone}
        accountantEmail={bizDetails.accountant_email}
        supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL || ""}
        supabaseKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}
      />

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
                  <Select label="שיוך לפרויקט" options={[{ value: "", label: "ללא" }, ...projects.map((p) => ({ value: p.id, label: p.customer_name }))]} value={viewEdit.projectId} onChange={(e) => setViewEdit({ ...viewEdit, projectId: e.target.value })} />
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
                    <div><span className="text-[10px] font-bold text-slate-500 uppercase">סוג</span><p className="text-sm font-medium">{viewing.doc_type}</p></div>
                    <div><span className="text-[10px] font-bold text-slate-500 uppercase">סכום</span><p className="text-sm font-medium">{viewing.total_amount ? formatCurrency(viewing.total_amount) : "-"}</p></div>
                    <div><span className="text-[10px] font-bold text-slate-500 uppercase">תאריך במסמך</span><p className="text-sm font-medium">{viewing.date_on_doc ? viewing.date_on_doc.split("-").reverse().join("/") : "-"}</p></div>
                    <div><span className="text-[10px] font-bold text-slate-500 uppercase">תיקייה</span><p className="text-sm font-medium">{FOLDERS.find((f) => f.id === viewing.folder)?.name || "ללא"}</p></div>
                    <div><span className="text-[10px] font-bold text-slate-500 uppercase">ספק</span><p className="text-sm font-medium">{businesses.find((b) => b.id === viewing.business_id)?.name || "ללא"}</p></div>
                    <div><span className="text-[10px] font-bold text-slate-500 uppercase">פרויקט</span><p className="text-sm font-medium">{projects.find((p) => p.id === viewing.project_id)?.customer_name || "ללא"}</p></div>
                    <div><span className="text-[10px] font-bold text-slate-500 uppercase">סוג תנועה</span><p className="text-sm font-medium">{viewing.direction === "income" ? "הכנסה" : viewing.direction === "other" ? "אחר" : "הוצאה"}</p></div>
                    <div><span className="text-[10px] font-bold text-slate-500 uppercase">סטטוס</span><p className="text-sm font-medium">{viewing.is_paid ? "שולם" : "ממתין"}</p></div>
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
              <div className="md:w-1/2 shrink-0 bg-slate-100 border flex items-center justify-center h-64 md:h-full">
                <img src={displayUrls[viewing.image_url] || viewing.image_url} alt="" className="w-full h-full object-contain" />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="פרטי מסמך"
        size="full"
        footer={
          <div className="flex gap-2 justify-between w-full">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>ביטול</Button>
            <Button onClick={saveDocument}>שמור</Button>
          </div>
        }
      >
        <div className="flex flex-col md:flex-row gap-0 h-full">
          <div className="flex-1 space-y-4 min-w-0 overflow-y-auto p-1">
            <Select label="שיוך לפרויקט" options={[
              { value: "", label: "ללא פרויקט" },
              ...projects.map((p) => ({ value: p.id, label: p.customer_name })),
            ]} value={tempDoc.projectId} onChange={(e) => setTempDoc({ ...tempDoc, projectId: e.target.value })} />
            <Select label="ספק" options={[
              { value: "", label: "ללא ספק" },
              ...businesses.map((b) => ({ value: b.id, label: b.name })),
              { value: "new", label: "+ הוסף ספק" },
            ]} value={tempDoc.businessId} onChange={(e) => setTempDoc({ ...tempDoc, businessId: e.target.value })} />
            {tempDoc.businessId === "new" && (
              <Input label="שם הספק" value={tempDoc.newBusinessName} onChange={(e) => setTempDoc({ ...tempDoc, newBusinessName: e.target.value })} />
            )}
            <Input label="כותרת המסמך" value={tempDoc.title} onChange={(e) => setTempDoc({ ...tempDoc, title: e.target.value })} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select label="סוג מסמך" options={DOC_TYPES} value={tempDoc.docType} onChange={(e) => setTempDoc({ ...tempDoc, docType: e.target.value })} />
              <Input label="סכום (₪)" type="number" step="0.01" value={tempDoc.totalAmount} onChange={(e) => setTempDoc({ ...tempDoc, totalAmount: e.target.value })} />
            </div>
            <Input label="תאריך במסמך" type="date" value={tempDoc.dateOnDoc} onChange={(e) => setTempDoc({ ...tempDoc, dateOnDoc: e.target.value })} />
            <Select label="תיקייה" options={[
            { value: "", label: "ללא תיקייה" },
            ...FOLDERS.map((f) => ({ value: f.id, label: f.name })),
          ]} value={tempDoc.folder} onChange={(e) => setTempDoc({ ...tempDoc, folder: e.target.value })} />
          <Select label="הוצאה / הכנסה" options={[
            { value: "expense", label: "הוצאה" },
            { value: "income", label: "הכנסה" },
            { value: "other", label: "אחר" },
          ]} value={tempDoc.direction} onChange={(e) => setTempDoc({ ...tempDoc, direction: e.target.value })} />
            <Checkbox label="השקעה בעסק (רכוש קבוע)" checked={tempDoc.isInvestment} onChange={(e) => setTempDoc({ ...tempDoc, isInvestment: e.target.checked })} />
            <Input label="תגיות (מופרדות בפסיק)" value={tempDoc.tags.join(", ")} onChange={(e) => setTempDoc({ ...tempDoc, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">טקסט שחולץ</label>
              <textarea rows={4} className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm" value={tempDoc.extractedText} onChange={(e) => setTempDoc({ ...tempDoc, extractedText: e.target.value })} readOnly />
            </div>
          </div>
          {tempDoc.imageUrl && (
            <div className="md:w-1/2 shrink-0 bg-slate-900 flex items-center justify-center h-64 md:h-full">
              <img src={displayUrls[tempDoc.imageUrl] || tempDoc.imageUrl} alt="" className="w-full h-full object-contain" />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
