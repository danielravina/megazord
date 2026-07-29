"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/layout/auth-provider";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { formatCurrency } from "@/components/shared/format-currency";
import {
  FolderKanban, Trash2, Save, ArrowRight,
  FileText, Plus, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import type { Project, ProjectFormData } from "./project-types";

interface LinkedDoc {
  id: string;
  title: string;
  doc_type: string;
  date_on_doc: string | null;
  total_amount: number | null;
  image_url: string | null;
  folder: string | null;
  tags: string[];
  extracted_text: string | null;
  is_investment: boolean;
  is_paid: boolean;
  business_id: string | null;
  business_name: string | null;
  date: string;
}

export function ProjectDetailPage() {
  const { supabase, user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [docs, setDocs] = useState<LinkedDoc[]>([]);
  const [displayUrls, setDisplayUrls] = useState<Record<string, string>>({});
  const [viewDoc, setViewDoc] = useState<LinkedDoc | null>(null);
  const [form, setForm] = useState<ProjectFormData>({
    customer_name: "", location: "", quote_price: null, expenses: null,
    color: "#3b82f6", start_date: "", start_time: "", duration: "",
    closing_price: null, search_words: "",
  });

  useEffect(() => {
    if (!user || !projectId) return;
    Promise.all([loadProject(), loadDocs()]).finally(() => setLoading(false));
  }, [user, projectId]);

  // Load signed URLs for document images
  useEffect(() => {
    docs.forEach(async (doc) => {
      if (doc.image_url && !doc.image_url.startsWith("http") && !displayUrls[doc.image_url]) {
        const key = `img_${doc.image_url}`;
        let url = "";
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.ts < 86400000) url = parsed.url;
          }
        } catch {}
        if (!url) {
          const { data } = await supabase.storage.from("documents").createSignedUrl(doc.image_url, 604800);
          url = data?.signedUrl || "";
          if (url) localStorage.setItem(key, JSON.stringify({ url, ts: Date.now() }));
        }
        if (url) {
          setDisplayUrls((prev) => ({ ...prev, [doc.image_url!]: url }));
        }
      }
    });
  }, [docs]);

  async function loadProject() {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", user!.id)
      .single();

    if (error || !data) {
      toast("הפרויקט לא נמצא", "error");
      router.replace("/projects/");
      return;
    }

    const p = data as Project;
    setForm({
      customer_name: p.customer_name,
      location: p.location || "",
      quote_price: p.quote_price,
      expenses: p.expenses,
      color: p.color,
      start_date: p.start_date || "",
      start_time: p.start_time || "",
      duration: p.duration || "",
      closing_price: p.closing_price,
      search_words: p.search_words || "",
    });
  }

  async function loadDocs() {
    const [docsRes, bizRes] = await Promise.all([
      supabase.from("documents").select("*").eq("project_id", projectId).eq("user_id", user!.id).order("date_on_doc", { ascending: false }),
      supabase.from("businesses").select("id, name").eq("user_id", user!.id),
    ]);
    const businesses = bizRes.data || [];
    const bizMap = new Map(businesses.map((b: any) => [b.id, b.name]));
    const docs = (docsRes.data || []) as LinkedDoc[];
    docs.forEach((d) => { d.business_name = d.business_id ? bizMap.get(d.business_id) || null : null; });
    setDocs(docs);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !projectId) return;
    setSaving(true);

    const projectData = {
      customer_name: form.customer_name,
      location: form.location || null,
      quote_price: form.quote_price,
      expenses: form.expenses ?? 0,
      color: form.color,
      start_date: form.start_date || null,
      start_time: form.start_time || null,
      duration: form.duration || null,
      closing_price: form.closing_price,
      search_words: form.search_words || null,
    };

    const { error } = await supabase.from("projects").update(projectData).eq("id", projectId);
    if (error) {
      toast("שגיאה בעדכון", "error");
    } else {
      toast("הפרויקט עודכן", "success");

      if (form.start_date) {
        await supabase.from("events").delete().eq("project_id", projectId);

        const days = Math.max(1, parseInt(form.duration || "1") || 1);
        const [y, m, d] = form.start_date.split("-").map(Number);
        const startDate = new Date(y, m - 1, d);
        const endDate = new Date(y, m - 1, d + days - 1);

        const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
        const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;

        await supabase.from("events").insert({
          id: crypto.randomUUID(),
          user_id: user.id,
          title: `${form.customer_name}${form.location ? " - " + form.location : ""}`,
          date: startStr,
          end_date: days > 1 ? endStr : null,
          color: form.color,
          is_project: true,
          project_id: projectId,
        });
      }
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!projectId) return;
    if (!confirm(`האם למחוק את הפרויקט "${form.customer_name}"?`)) return;

    const { error } = await supabase.from("projects").delete().eq("id", projectId);
    if (error) {
      toast("שגיאה במחיקה", "error");
    } else {
      await supabase.from("events").delete().eq("project_id", projectId);
      toast("הפרויקט נמחק", "success");
      router.replace("/projects/");
    }
  }

  async function markAsPaid(doc: LinkedDoc) {
    if (!user) return;
    // Create expense entry
    const { error: expError } = await supabase.from("expenses").insert({
      id: crypto.randomUUID(),
      user_id: user.id,
      date: doc.date_on_doc || new Date().toISOString().split("T")[0],
      amount: doc.total_amount || 0,
      is_paid: true,
      category: doc.folder || "כללי",
      description: `הוצאה ממסמך: ${doc.title}`,
    });
    if (expError) {
      toast("שגיאה ביצירת ההוצאה", "error");
      return;
    }
    // Update project expenses
    if (projectId) {
      const { data: proj } = await supabase.from("projects").select("expenses").eq("id", projectId).single();
      if (proj) {
        await supabase.from("projects").update({ expenses: (proj.expenses || 0) + (doc.total_amount || 0) }).eq("id", projectId);
      }
    }
    // Mark doc as paid
    await supabase.from("documents").update({ is_paid: true }).eq("id", doc.id);
    setDocs((prev) => prev.map((d) => d.id === doc.id ? { ...d, is_paid: true } : d));
    toast("המסמך סומן כשולם", "success");
  }

  async function unlinkDoc(docId: string) {
    const { error } = await supabase.from("documents").update({ project_id: null }).eq("id", docId);
    if (error) {
      toast("שגיאה בהסרת המסמך", "error");
    } else {
      setDocs((prev) => prev.filter((d) => d.id !== docId));
      toast("המסמך הוסר מהפרויקט", "success");
    }
  }

  const totalDocExpenses = docs
    .filter((d) => d.total_amount)
    .reduce((s, d) => s + (d.total_amount || 0), 0);

  if (!projectId) {
    router.replace("/projects/");
    return null;
  }

  if (loading && !projectId) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/projects/" className="text-slate-400 hover:text-slate-600">
          <ArrowRight size={20} />
        </Link>
        <FolderKanban size={24} className="text-blue-500" />
        <h1 className="text-2xl font-bold text-slate-800">עריכת פרויקט</h1>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="שם לקוח *" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
          <Input label="מיקום" value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="מחיר הצעה (₪)" type="number" min="0" value={form.quote_price ?? ""} onChange={(e) => { const v = e.target.value; setForm({ ...form, quote_price: v === "" ? null : parseFloat(v) }); }} />
            <Input label="הוצאות צפויות (₪)" type="number" min="0" value={form.expenses ?? ""} onChange={(e) => { const v = e.target.value; setForm({ ...form, expenses: v === "" ? null : parseFloat(v) }); }} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">צבע זיהוי</label>
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-16 h-10 border rounded-md cursor-pointer" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="תאריך התחלה" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
            <Input label="שעת התחלה" type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="משך עבודה (ימים)" type="number" min="1" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
            <Input label="מחיר סגירה (₪)" type="number" min="0" value={form.closing_price ?? ""} onChange={(e) => { const v = e.target.value; setForm({ ...form, closing_price: v === "" ? null : parseFloat(v) }); }} />
          </div>
          <Input label="מילות חיפוש / תגיות" placeholder="פסיק בין מילה למילה" value={form.search_words} onChange={(e) => setForm({ ...form, search_words: e.target.value })} />

          <div className="flex gap-2 justify-between pt-4 border-t">
            <Button loading={saving} type="submit"><Save size={14} /> שמור שינויים</Button>
            <Button variant="danger" type="button" onClick={handleDelete}><Trash2 size={14} /> מחק</Button>
          </div>
        </form>
      </Card>

      {/* Linked Documents */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4 border-b pb-2">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileText size={20} className="text-blue-500" />
            מסמכים משויכים
            <Badge variant="blue">{docs.length}</Badge>
          </h2>
          <Link
            href={`/documents/`}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Plus size={14} />
            סרוק מסמך
          </Link>
        </div>

        {docs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">
            אין מסמכים משויכים לפרויקט זה. סרקו מסמך ובחרו את הפרויקט בשיוך.
          </p>
        ) : (
          <>
            {docs.some(d => !d.is_paid) && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-amber-600 mb-2">ממתין לתשלום</h3>
                <div className="space-y-2">
                  {docs.filter(d => !d.is_paid).map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <div className="min-w-0 cursor-pointer" onClick={() => setViewDoc(doc)}>
                        <p className="text-sm font-medium truncate">{doc.title}</p>
                        <p className="text-xs text-amber-600">{doc.date_on_doc?.split("-").reverse().join("/") || "-"}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {doc.total_amount ? (
                          <span className="text-sm font-bold text-amber-600">{formatCurrency(doc.total_amount)}</span>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                        <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); markAsPaid(doc); }}>
                          שולם
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {docs.some(d => d.is_paid) && (
              <div>
                {docs.some(d => !d.is_paid) && (
                  <h3 className="text-xs font-semibold text-slate-500 mb-2">שולם</h3>
                )}
                <div className="space-y-2">
                  {docs.filter(d => d.is_paid).map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                      onClick={() => setViewDoc(doc)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-12 bg-slate-200 rounded-lg shrink-0 flex items-center justify-center overflow-hidden">
                          {doc.image_url ? (
                            <img src={displayUrls[doc.image_url] || doc.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <FileText size={16} className="text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{doc.title}</p>
                          <p className="text-xs text-slate-400">
                            {doc.date_on_doc?.split("-").reverse().join("/") || "-"}
                            {doc.doc_type !== "Other" && <span className="mx-1">•</span>}
                            {doc.doc_type}
                            {doc.business_name && <span className="mx-1">•</span>}
                            {doc.business_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {doc.total_amount ? (
                          <span className="text-sm font-bold text-rose-500">{formatCurrency(doc.total_amount)}</span>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); unlinkDoc(doc.id); }}
                          className="text-xs text-slate-400 hover:text-red-500"
                        >
                          הסר
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {totalDocExpenses > 0 && (
              <div className="flex justify-between items-center mt-4 pt-3 border-t text-sm">
                <span className="font-medium text-slate-600">סה״כ הוצאות מתועדות</span>
                <span className="font-bold text-rose-500">{formatCurrency(totalDocExpenses)}</span>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Document Detail Modal */}
      <Modal
        open={!!viewDoc}
        onClose={() => setViewDoc(null)}
        title={viewDoc?.title || ""}
        size="lg"
        footer={
          <div className="flex gap-2 justify-between w-full">
            <Button variant="ghost" onClick={() => setViewDoc(null)}>סגור</Button>
            <Button variant="danger" size="sm" onClick={() => { if (viewDoc) { unlinkDoc(viewDoc.id); setViewDoc(null); } }}>
              הסר מהפרויקט
            </Button>
          </div>
        }
      >
        {viewDoc && (
          <div className="space-y-4 text-sm">
            {viewDoc.image_url && (
              <div className="rounded-xl overflow-hidden bg-slate-100 border flex justify-center">
                <img src={displayUrls[viewDoc.image_url] || viewDoc.image_url} alt="" className="max-h-64 object-contain" />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl">
              <div><span className="text-[10px] font-bold text-slate-500 uppercase">סוג</span><p>{viewDoc.doc_type}</p></div>
              <div><span className="text-[10px] font-bold text-slate-500 uppercase">סכום</span><p>{viewDoc.total_amount ? formatCurrency(viewDoc.total_amount) : "-"}</p></div>
              <div><span className="text-[10px] font-bold text-slate-500 uppercase">תאריך במסמך</span><p>{viewDoc.date_on_doc ? viewDoc.date_on_doc.split("-").reverse().join("/") : "-"}</p></div>
              <div><span className="text-[10px] font-bold text-slate-500 uppercase">השקעה</span><p>{viewDoc.is_investment ? "כן" : "לא"}</p></div>
            </div>
            {viewDoc.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {viewDoc.tags.map((t) => <Badge key={t} variant="blue">{t}</Badge>)}
              </div>
            )}
            {viewDoc.extracted_text && (
              <div className="bg-slate-50 p-4 rounded-xl border">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">טקסט שחולץ</p>
                <p className="whitespace-pre-wrap max-h-40 overflow-y-auto">{viewDoc.extracted_text}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
