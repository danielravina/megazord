"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/layout/auth-provider";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonButton, SkeletonText } from "@/components/ui/skeleton";
import { formatCurrency } from "@/components/shared/format-currency";
import { generateId } from "@/components/shared/generate-id";
import {
  Receipt, Plus, Save, Trash2, Pencil, Eye, Send, Download,
  UserPlus, X, ArrowRight,
} from "lucide-react";
import type { Invoice, InvoiceItem, InvoiceFormData, DocumentType, VatStatus } from "./invoice-types";
import { DOC_TYPE_META, docTypesFor } from "./invoice-types";
import type { Customer } from "@/components/customers/customer-types";
import type { TaxSettings } from "@/components/finance/finance-types";
import { nextNumberFor, computeTotals, computeTotalsInclusive, lineVatBreakdown, emptyItem } from "./invoice-utils";
import { embeddedName } from "@/components/projects/project-types";
import { isValidEmail } from "@/components/shared/validate-email";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { buildInvoiceHtml, generateInvoicePdfBase64, generateInvoicePdfBlob } from "./invoice-pdf";

interface ProjectOption {
  id: string;
  customer_id: string | null;
  customer_name?: string | null;
  location?: string | null;
  quote_price: number | null;
  closing_price: number | null;
}

export function DocumentsPage() {
  const { supabase, user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewId = searchParams.get("view");
  const editId = searchParams.get("edit");
  const isNew = searchParams.has("new") || !!searchParams.get("newDocument");
  const newProjectId = searchParams.get("newDocument");

  const [documents, setDocuments] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [taxSettings, setTaxSettings] = useState<TaxSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<InvoiceFormData | null>(null);

  const [newCustOpen, setNewCustOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [vatInclusive, setVatInclusive] = useState(false);

  const [sendConfirm, setSendConfirm] = useState<Invoice | null>(null);
  const [sending, setSending] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | DocumentType>("all");

  const vatStatus: VatStatus = taxSettings?.vat_status ?? "morashi";
  const allowedTypes = docTypesFor(vatStatus);

  async function loadAll() {
    const [invRes, custRes, projRes, taxRes] = await Promise.all([
      supabase.from("invoices").select("*, customers(name)").eq("user_id", user!.id).order("issue_date", { ascending: false }),
      supabase.from("customers").select("*").eq("user_id", user!.id).order("name", { ascending: true }),
      supabase.from("projects").select("id, customer_id, location, quote_price, closing_price, customers(name)").eq("user_id", user!.id).order("start_date", { ascending: false }),
      supabase.from("tax_settings").select("*").eq("user_id", user!.id).maybeSingle(),
    ]);
    if (invRes.error) toast("שגיאה בטעינת המסמכים", "error");
    if (custRes.error) toast("שגיאה בטעינת לקוחות", "error");
    setDocuments((invRes.data || []).map((r) => ({ ...r, customer_name: embeddedName(r.customers) })));
    setCustomers(custRes.data || []);
    setProjects((projRes.data || []).map((p) => ({ id: p.id, customer_id: p.customer_id, location: p.location, quote_price: p.quote_price, closing_price: p.closing_price, customer_name: embeddedName(p.customers) })));
    setTaxSettings((taxRes.data as TaxSettings) || null);
    setLoading(false);
  }

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, [user]);

  // ── Form init for create/edit views ─────────────────────────────
  function defaultType(): DocumentType {
    return vatStatus === "patoor" ? "receipt" : "tax_invoice";
  }

  function initNew(prefill?: { customer_id?: string; project_id?: string; item_description?: string; unit_price?: number; document_type?: DocumentType }) {
    setEditingId(null);
    const isPatoor = vatStatus === "patoor";
    const type = prefill?.document_type ?? defaultType();
    const defaultRate = isPatoor ? 0 : (taxSettings?.vat_rate ?? 18);
    const item = emptyItem();
    if (prefill) {
      item.description = prefill.item_description || "";
      item.unit_price = prefill.unit_price ?? 0;
    }
    setVatInclusive(false);
    setForm({
      customer_id: prefill?.customer_id || "",
      project_id: prefill?.project_id || "",
      invoice_number: nextNumberFor(type, documents, new Date()),
      issue_date: new Date().toISOString().split("T")[0],
      due_date: "",
      vat_rate: defaultRate,
      is_exempt: isPatoor,
      document_type: type,
      items: [item],
      notes: "",
    });
    setNewCustOpen(false);
  }

  function initEdit(doc: Invoice) {
    setEditingId(doc.id);
    setVatInclusive(false);
    setForm({
      customer_id: doc.customer_id,
      project_id: doc.project_id || "",
      invoice_number: doc.invoice_number,
      issue_date: doc.issue_date,
      due_date: doc.due_date || "",
      vat_rate: doc.vat_rate,
      is_exempt: doc.vat_rate === 0,
      document_type: doc.document_type,
      items: doc.items.length ? doc.items : [emptyItem()],
      notes: doc.notes || "",
    });
    setNewCustOpen(false);
  }

  // After data loads, populate the form for the requested view.
  useEffect(() => {
    if (loading || !user) return;
    if (editId) {
      const doc = documents.find((d) => d.id === editId);
      if (doc) initEdit(doc); // eslint-disable-line react-hooks/set-state-in-effect
    } else if (isNew) {
      const project = newProjectId ? projects.find((p) => p.id === newProjectId) : null;
      // Prefill from a transaction-account conversion (?new=1&document_type=...&customer=...)
      const convType = searchParams.get("document_type") as DocumentType | null;
      const convCustomer = searchParams.get("customer");
      const convProject = searchParams.get("project");
      const convDesc = searchParams.get("desc");
      const convPrice = searchParams.get("price");
      const prefill = project
        ? {
            customer_id: project.customer_id || "",
            project_id: project.id,
            item_description: project.location ? `פרויקט ${project.location}` : "פרויקט",
            unit_price: project.closing_price ?? project.quote_price ?? 0,
          }
        : convCustomer
          ? {
              customer_id: convCustomer,
              project_id: convProject || "",
              item_description: convDesc || "",
              unit_price: parseFloat(convPrice || "0"),
              document_type: convType ?? undefined,
            }
          : undefined;
      initNew(prefill); // eslint-disable-line react-hooks/set-state-in-effect
      if (newProjectId) router.replace("/documents/?new=1", { scroll: false });
      else if (convCustomer) router.replace("/documents/?new=1", { scroll: false });
    }
  }, [loading, editId, isNew, newProjectId]);

  async function createQuickCustomer(): Promise<string> {
    if (!newCustName.trim()) return "";
    if (newCustEmail.trim() && !isValidEmail(newCustEmail)) {
      toast("כתובת אימייל לא תקינה", "error");
      return "";
    }
    const id = generateId();
    const { error } = await supabase.from("customers").insert({
      id, user_id: user!.id, name: newCustName.trim(), email: newCustEmail.trim() || null,
    });
    if (error) {
      toast("שגיאה ביצירת הלקוח", "error");
      return "";
    }
    const nc: Customer = { id, user_id: user!.id, name: newCustName.trim(), email: newCustEmail.trim() || null, phone: null, company: null, vat_number: null, address: null, notes: null, created_at: new Date().toISOString() };
    setCustomers((prev) => [...prev, nc]);
    setNewCustName("");
    setNewCustEmail("");
    setNewCustOpen(false);
    toast("הלקוח נוצר", "success");
    return id;
  }

  async function handleCustomerChange(value: string) {
    if (value === "new") {
      setNewCustOpen(true);
      setForm((f) => (f ? { ...f, customer_id: "" } : f));
      return;
    }
    setForm((f) => (f ? { ...f, customer_id: value, project_id: "" } : f));
  }

  function handleTypeChange(type: DocumentType) {
    setForm((f) => {
      if (!f) return f;
      const isPatoor = vatStatus === "patoor";
      const isExempt = isPatoor;
      const rate = isExempt ? 0 : f.vat_rate;
      return {
        ...f,
        document_type: type,
        is_exempt: isExempt,
        vat_rate: rate,
        invoice_number: nextNumberFor(type, documents, new Date()),
      };
    });
  }

  // Create a NEW payment-time document (tax invoice for מורשה / receipt for פטור)
  // based on an existing transaction account (payment demand). The demand stays.
  function openFromTransactionAccount(doc: Invoice) {
    const target: DocumentType = vatStatus === "patoor" ? "receipt" : "tax_invoice";
    const firstItem = (doc.items || [])[0];
    router.push(`/documents/?new=1&document_type=${target}&customer=${doc.customer_id}&project=${doc.project_id || ""}&desc=${encodeURIComponent(firstItem?.description || "")}&price=${firstItem?.unit_price ?? 0}`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !form) return;
    if (!form.customer_id) {
      toast("יש לבחור לקוח", "error");
      return;
    }
    setSaving(true);

    const isExemptInvoice = form.is_exempt;
    const rate = isExemptInvoice ? 0 : form.vat_rate;
    const netItems = vatInclusive && !isExemptInvoice
      ? form.items.map((it) => ({ ...it, unit_price: it.unit_price / (1 + rate / 100) }))
      : form.items;

    const totals = computeTotals(netItems.filter((it) => it.description.trim()), rate);
    const now = new Date().toISOString();
    const payload = {
      customer_id: form.customer_id,
      project_id: form.project_id || null,
      invoice_number: form.invoice_number.trim() || nextNumberFor(form.document_type, documents, new Date()),
      issue_date: form.issue_date,
      due_date: form.due_date || null,
      items: netItems.filter((it) => it.description.trim()),
      amount: Math.round(totals.total * 100) / 100,
      vat_rate: rate,
      document_type: form.document_type,
      notes: form.notes || null,
    };

    if (editingId) {
      const { error } = await supabase.from("invoices").update(payload).eq("id", editingId);
      setSaving(false);
      if (error) {
        toast("שגיאה בעדכון", "error");
      } else {
        toast("המסמך עודכן", "success");
        await loadAll();
        router.push(`/documents/?view=${editingId}`);
      }
    } else {
      const newId = generateId();
      const custName = customers.find((c) => c.id === form.customer_id)?.name || null;
      const { error } = await supabase.from("invoices").insert({ id: newId, user_id: user.id, ...payload });
      setSaving(false);
      if (error) {
        toast("שגיאה בשמירה", "error");
      } else {
        const meta = DOC_TYPE_META[form.document_type];
        toast(
          meta.booksIncome[vatStatus]
            ? `${meta.label} נוצר ורשם הכנסה בספרים`
            : `${meta.label} נוצר`,
          "success",
        );
        await loadAll();
        router.push(`/documents/?view=${newId}`);
      }
    }
  }

  async function handleDelete(doc: Invoice) {
    if (!confirm(`האם למחוק את ${DOC_TYPE_META[doc.document_type].label} ${doc.invoice_number}?`)) return;
    const { error } = await supabase.from("invoices").delete().eq("id", doc.id);
    if (error) {
      toast("שגיאה במחיקה", "error");
    } else {
      toast("המסמך נמחק", "success");
      router.push("/documents/");
    }
  }

  function docLabel(doc: Invoice): string {
    return DOC_TYPE_META[doc.document_type]?.label || DOC_TYPE_META.tax_invoice.label;
  }

  function docFileName(doc: Invoice): string {
    return `${docLabel(doc)}-${doc.invoice_number}.pdf`;
  }

  async function doSend() {
    if (!sendConfirm) return;
    setSending(true);
    try {
      const customer = customers.find((c) => c.id === sendConfirm.customer_id) || null;
      if (!customer?.email) {
        toast("ללקוח אין כתובת אימייל", "error");
        return;
      }
      if (!isValidEmail(customer.email)) {
        toast("כתובת האימייל של הלקוח אינה תקינה", "error");
        return;
      }
      const label = docLabel(sendConfirm);
      const html = buildInvoiceHtml(sendConfirm, customer, taxSettings);
      const base64 = await generateInvoicePdfBase64(html);
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          to: customer.email,
          subject: `${label} ${sendConfirm.invoice_number}`,
          htmlBody: `
            <div dir="rtl" style="font-family:Arial;max-width:600px">
              <h2>${label} ${sendConfirm.invoice_number}</h2>
              <p>שלום ${customer.name},</p>
              <p>מצורף ${label} ${sendConfirm.invoice_number} בסך ${formatCurrency(sendConfirm.amount)}.</p>
              <hr/>
              <p><strong>${taxSettings?.business_name || "עצמאי"}</strong></p>
            </div>`,
          pdfBase64: base64,
          pdfFilename: docFileName(sendConfirm),
        }),
      });
      if (res.ok) {
        toast("המסמך נשלח בהצלחה", "success");
        setSendConfirm(null);
      } else {
        toast("שגיאה בשליחת המסמך", "error");
      }
    } catch {
      toast("שגיאה בשליחת המסמך", "error");
    } finally {
      setSending(false);
    }
  }

  async function handleSendWhatsApp(doc: Invoice) {
    if (typeof navigator === "undefined" || !navigator.share) {
      toast("הדפדפן אינו תומך בשיתוף", "error");
      return;
    }
    setSendingWhatsApp(true);
    try {
      const customer = customers.find((c) => c.id === doc.customer_id) || null;
      const html = buildInvoiceHtml(doc, customer, taxSettings);
      const blob = await generateInvoicePdfBlob(html);
      const file = new File([blob], docFileName(doc), { type: "application/pdf" });

      await navigator.share({
        files: [file],
        title: `${docLabel(doc)} ${doc.invoice_number}`,
      });

      toast("המסמך שותף בהצלחה", "success");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      toast("שגיאה בשיתוף המסמך", "error");
    } finally {
      setSendingWhatsApp(false);
    }
  }

  function updateItem(id: string, patch: Partial<InvoiceItem>) {
    setForm((f) => (f ? { ...f, items: f.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) } : f));
  }

  // ── Loading state ────────────────────────────────────────────────
  if (loading && documents.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Skeleton className="w-6 h-6" />
            <Skeleton className="w-36 h-8" />
            <Skeleton className="w-8 h-5 rounded-full" />
          </div>
          <SkeletonButton className="w-32" />
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 grid grid-cols-6 gap-4 px-4 py-3 border-b">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonText key={i} className="w-full" />
            ))}
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-6 gap-4 px-4 py-4 border-b border-slate-100">
              <SkeletonText className="w-16" />
              <SkeletonText className="w-24" />
              <SkeletonText className="w-20" />
              <SkeletonText className="w-20" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <div className="flex justify-end gap-3">
                <Skeleton className="w-4 h-4" />
                <Skeleton className="w-4 h-4" />
                <Skeleton className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Preview full page (?view=<id>) ───────────────────────────────
  if (viewId) {
    const doc = documents.find((d) => d.id === viewId);
    if (!doc) {
      return (
        <div className="max-w-7xl mx-auto">
          <Card className="p-12">
            <EmptyState
              icon={<Receipt size={40} className="text-slate-300" />}
              title="המסמך לא נמצא"
              description="המסמך נמחק או שאינו זמין"
            />
            <div className="mt-4 text-center">
              <Button onClick={() => router.push("/documents/")}>חזרה למסמכים</Button>
            </div>
          </Card>
        </div>
      );
    }
    const previewCustomer = customers.find((c) => c.id === doc.customer_id) || null;
    const previewHtml = buildInvoiceHtml(doc, previewCustomer, taxSettings, "100%");

    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/documents/")} className="text-slate-400 hover:text-blue-600" title="חזור">
              <ArrowRight size={20} />
            </button>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Receipt size={24} className="text-blue-500" />
              {docLabel(doc)} {doc.invoice_number}
            </h1>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-6 border-t pt-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => router.push(`/documents/?edit=${doc.id}`)}>
              <Pencil size={14} /> ערוך
            </Button>
            <Button variant="secondary" onClick={async () => {
              const html = buildInvoiceHtml(doc, previewCustomer, taxSettings);
              const html2pdf = (await import("html2pdf.js")).default;
              const el = document.createElement("div");
              el.innerHTML = html;
              el.style.width = "700px";
              document.body.appendChild(el);
              await new Promise((r) => setTimeout(r, 100));
              try {
                await html2pdf()
                  .set({
                    margin: 10,
                    image: { type: "jpeg", quality: 0.95 },
                    html2canvas: { scale: 2, useCORS: true },
                    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
                  })
                  .from(el.firstElementChild as HTMLElement)
                  .save(docFileName(doc));
              } finally {
                document.body.removeChild(el);
              }
            }}>
              <Download size={14} /> הורד PDF
            </Button>
            <Button
              disabled={!previewCustomer?.email}
              title={!previewCustomer?.email ? "ללקוח אין כתובת אימייל" : undefined}
              onClick={() => setSendConfirm(doc)}
            >
              <Send size={14} /> שלח במייל
            </Button>
            <Button variant="success" loading={sendingWhatsApp} onClick={() => handleSendWhatsApp(doc)}>
              <WhatsAppIcon size={14} /> שלח בוואטסאפ
            </Button>
            {doc.document_type === "transaction_account" && (
              <Button variant="secondary" onClick={() => openFromTransactionAccount(doc)}>
                <Send size={14} /> {vatStatus === "patoor" ? "הפק קבלה על התשלום" : "הפק חשבונית מס על התשלום"}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="danger" onClick={() => handleDelete(doc)}><Trash2 size={14} /> מחק</Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Create/Edit full page (?new=1 | ?edit=<id>) ──────────────────
  if (isNew || editId) {
    const total = form
      ? vatInclusive && !form.is_exempt
        ? computeTotalsInclusive(form.items, form.vat_rate)
        : computeTotals(form.items, form.is_exempt ? 0 : form.vat_rate)
      : null;
    const meta = form ? DOC_TYPE_META[form.document_type] : null;
    const showVatFields = !!meta && meta.vatMode === "breakdown" && !form?.is_exempt;

    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/documents/")} className="text-slate-400 hover:text-blue-600" title="חזור">
              <ArrowRight size={20} />
            </button>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Receipt size={24} className="text-blue-500" />
              {editingId ? "עריכת מסמך" : "מסמך חדש"}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => router.push("/documents/")}>ביטול</Button>
            <Button loading={saving} onClick={handleSubmit}><Save size={14} /> {editingId ? "שמור שינויים" : "צור מסמך"}</Button>
          </div>
        </div>

        {form ? (
          <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-2xl border border-slate-200 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Select
                  label="לקוח *"
                  options={[
                    { value: "", label: "בחר לקוח..." },
                    ...customers.map((c) => ({ value: c.id, label: c.name })),
                    { value: "new", label: "+ הוסף לקוח" },
                  ]}
                  value={form.customer_id}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  required
                />
                {newCustOpen && (
                  <div className="mt-2 space-y-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <Input label="שם לקוח *" value={newCustName} onChange={(e) => setNewCustName(e.target.value)} />
                    <Input label="אימייל" type="email" value={newCustEmail} onChange={(e) => setNewCustEmail(e.target.value)} />
                    <Button size="sm" type="button" onClick={async () => { const id = await createQuickCustomer(); if (id) setForm((f) => (f ? { ...f, customer_id: id } : f)); }}>
                      <UserPlus size={14} /> צור לקוח
                    </Button>
                  </div>
                )}
              </div>
              <Select
                label="פרויקט"
                options={[
                  { value: "", label: "ללא" },
                  ...projects
                    .filter((p) => !form.customer_id || p.customer_id === form.customer_id)
                    .map((p) => ({ value: p.id, label: `${p.customer_name || "ללא שם"}${p.location ? " - " + p.location : ""}` })),
                ]}
                value={form.project_id}
                onChange={(e) => setForm({ ...form, project_id: e.target.value })}
              />
              <Select
                label="סוג מסמך"
                value={form.document_type}
                onChange={(e) => handleTypeChange(e.target.value as DocumentType)}
                options={allowedTypes.map((t) => ({ value: t, label: DOC_TYPE_META[t].label }))}
              />
              <Input label="מספר מסמך" value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="תאריך" type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} required />
                <Input label="יעד לתשלום" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>

            {showVatFields && (
              <div className="flex items-center gap-4">
                <Checkbox
                  label='עוסק פטור (ללא מע"מ)'
                  checked={form.is_exempt}
                  onChange={(e) => setForm({ ...form, is_exempt: e.target.checked })}
                />
                {!form.is_exempt && (
                  <Checkbox
                    label='מחיר כולל מע"מ'
                    checked={vatInclusive}
                    onChange={(e) => setVatInclusive(e.target.checked)}
                  />
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">פריטים</label>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      {["תיאור", "כמות", vatInclusive && showVatFields ? "מחיר ליחידה (כולל מע״מ)" : "מחיר ליחידה", ...(showVatFields ? ['מע"מ'] : []), "סה\"כ"].map((h) => (
                        <th key={h} className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">{h}</th>
                      ))}
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {form.items.map((it) => {
                      const bd = vatInclusive && !form.is_exempt
                        ? lineVatBreakdown(it, form.vat_rate, true)
                        : lineVatBreakdown(it, form.is_exempt ? 0 : form.vat_rate, false);
                      return (
                        <tr key={it.id}>
                          <td className="px-3 py-2">
                            <Input value={it.description} onChange={(e) => updateItem(it.id, { description: e.target.value })} placeholder="תיאור השירות / המוצר" />
                          </td>
                          <td className="px-3 py-2 w-20">
                            <Input type="number" min="0" placeholder="כמות" value={it.quantity} onChange={(e) => updateItem(it.id, { quantity: parseFloat(e.target.value) || 0 })} />
                          </td>
                          <td className="px-3 py-2 w-28">
                            <Input type="number" min="0" step="0.01" placeholder="מחיר ליחידה" value={it.unit_price} onChange={(e) => updateItem(it.id, { unit_price: parseFloat(e.target.value) || 0 })} />
                          </td>
                          {showVatFields && (
                            <td className="px-3 py-2 text-sm text-slate-600 whitespace-nowrap">{formatCurrency(bd.vat)}</td>
                          )}
                          <td className="px-3 py-2 text-sm font-bold whitespace-nowrap">{formatCurrency(bd.gross)}</td>
                          <td className="px-3 py-2">
                            <button type="button" onClick={() => setForm((f) => (f ? { ...f, items: f.items.filter((x) => x.id !== it.id) } : f))} className="text-slate-400 hover:text-red-500">
                              <X size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Button size="sm" variant="secondary" type="button" className="mt-2" onClick={() => setForm((f) => (f ? { ...f, items: [...f.items, emptyItem()] } : f))}>
                <Plus size={14} /> הוסף שורה
              </Button>
              {total && showVatFields && (
                <div className="flex justify-end mt-3 text-sm">
                  <div className="w-56">
                    <div className="flex justify-between font-bold border-t border-slate-200 pt-1"><span>סה&quot;כ לתשלום</span><span className="text-emerald-600">{formatCurrency(total.total)}</span></div>
                  </div>
                </div>
              )}
              {total && !showVatFields && meta?.vatMode === "single" && (
                <div className="flex justify-end mt-3 text-sm">
                  <div className="w-56">
                    <div className="flex justify-between font-bold border-t border-slate-200 pt-1"><span>סה&quot;כ לתשלום</span><span className="text-emerald-600">{formatCurrency(total.total)}</span></div>
                  </div>
                </div>
              )}
            </div>

            <Input label="הערות" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </form>
        ) : (
          <Card className="p-12">
            <Skeleton className="w-full h-40" />
          </Card>
        )}
      </div>
    );
  }

  // ── List page ────────────────────────────────────────────────────
  const filteredDocs = typeFilter === "all" ? documents : documents.filter((d) => d.document_type === typeFilter);
  const tabOrder: (DocumentType | "all")[] = ["all", ...allowedTypes];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
        <div className="flex items-center gap-3">
          <Receipt size={24} className="text-blue-500" />
          <h1 className="text-2xl font-bold text-slate-800">מסמכים</h1>
          <Badge variant="blue">{documents.length}</Badge>
        </div>
        <Button onClick={() => router.push("/documents/?new=1")}><Plus size={14} /> מסמך חדש</Button>
      </div>

      {/* Type tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {tabOrder.map((t) => {
          const count = t === "all" ? documents.length : documents.filter((d) => d.document_type === t).length;
          const label = t === "all" ? "הכל" : DOC_TYPE_META[t].label;
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors cursor-pointer ${
                typeFilter === t
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
              <span className="text-xs text-slate-400 ml-1.5">({count})</span>
            </button>
          );
        })}
      </div>

      {filteredDocs.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={<Receipt size={40} className="text-slate-300" />}
            title={typeFilter === "all" ? "אין מסמכים עדיין" : `אין ${DOC_TYPE_META[typeFilter as DocumentType]?.label || "מסמכים"} עדיין`}
            description='לחץ על "מסמך חדש" כדי להתחיל'
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {["מס׳", "לקוח", "תאריך", "סכום"].map((h) => (
                    <th key={h} className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">{h}</th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => router.push(`/documents/?view=${doc.id}`)}>
                    <td className="px-4 py-3 text-sm font-bold">{doc.invoice_number}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{doc.customer_name || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{doc.issue_date.split("-").reverse().join("/")}</td>
                    <td className="px-4 py-3 text-sm font-bold text-emerald-600">{formatCurrency(doc.amount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={(e) => { e.stopPropagation(); router.push(`/documents/?view=${doc.id}`); }} className="text-slate-400 hover:text-blue-600" title="תצוגה">
                          <Eye size={16} />
                        </button>
                        {doc.document_type === "transaction_account" && (
                          <button onClick={(e) => { e.stopPropagation(); openFromTransactionAccount(doc); }} className="text-slate-400 hover:text-emerald-600" title={vatStatus === "patoor" ? "הפק קבלה על התשלום" : "הפק חשבונית מס על התשלום"}>
                            <Send size={16} />
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); router.push(`/documents/?edit=${doc.id}`); }} className="text-slate-400 hover:text-blue-600" title="ערוך">
                          <Pencil size={16} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(doc); }} className="text-slate-400 hover:text-red-500" title="מחק">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Send Confirmation Modal (kept as a modal) */}
      <Modal
        open={!!sendConfirm}
        onClose={() => setSendConfirm(null)}
        title="שליחת מסמך במייל"
        size="sm"
        footer={
          <div className="flex gap-2 justify-between w-full">
            <Button variant="ghost" onClick={() => setSendConfirm(null)}>ביטול</Button>
            <Button loading={sending} onClick={doSend}><Send size={14} /> שלח</Button>
          </div>
        }
      >
        {sendConfirm && (() => {
          const customer = customers.find((c) => c.id === sendConfirm.customer_id);
          const label = docLabel(sendConfirm);
          return (
            <div className="space-y-3 text-sm">
              <p>{label} <strong>{sendConfirm.invoice_number}</strong> בסך <strong className="text-emerald-600">{formatCurrency(sendConfirm.amount)}</strong> יישלח אל:</p>
              <div className="bg-slate-50 p-3 rounded-xl">
                <p className="font-medium">{customer?.name || "-"}</p>
                <p className="text-slate-500">{customer?.email || "ללא אימייל"}</p>
              </div>
              <p className="text-xs text-slate-400">
                ההכנסה נרשמת בספרים על פי סוג המסמך ובמועד הוצאתו.
              </p>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
