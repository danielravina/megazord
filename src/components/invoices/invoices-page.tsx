"use client";

import { useState, useEffect } from "react";
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
  CheckCircle2, UserPlus, X,
} from "lucide-react";
import type { Invoice, InvoiceItem, InvoiceFormData } from "./invoice-types";
import type { Customer } from "@/components/customers/customer-types";
import type { TaxSettings } from "@/components/finance/finance-types";
import { nextInvoiceNumber, computeTotals, emptyItem } from "./invoice-utils";
import { embeddedName } from "@/components/projects/project-types";
import { isValidEmail } from "@/components/shared/validate-email";
import { buildInvoiceHtml, generateInvoicePdfBase64 } from "./invoice-pdf";

const STATUS_META: Record<string, { label: string; variant: "gray" | "blue" | "green" }> = {
  draft: { label: "טיוטה", variant: "gray" },
  sent: { label: "נשלחה", variant: "blue" },
  paid: { label: "שולם", variant: "green" },
};

interface ProjectOption {
  id: string;
  customer_id: string | null;
  customer_name?: string | null;
  location?: string | null;
}

export function InvoicesPage() {
  const { supabase, user } = useAuth();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [taxSettings, setTaxSettings] = useState<TaxSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<InvoiceFormData | null>(null);

  const [newCustOpen, setNewCustOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");

  const [preview, setPreview] = useState<Invoice | null>(null);
  const [sendConfirm, setSendConfirm] = useState<Invoice | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadAll();
  }, [user]);

  async function loadAll() {
    const [invRes, custRes, projRes, taxRes] = await Promise.all([
      supabase.from("invoices").select("*, customers(name)").eq("user_id", user!.id).order("issue_date", { ascending: false }),
      supabase.from("customers").select("*").eq("user_id", user!.id).order("name", { ascending: true }),
      supabase.from("projects").select("id, customer_id, location, customers(name)").eq("user_id", user!.id).order("start_date", { ascending: false }),
      supabase.from("tax_settings").select("*").eq("user_id", user!.id).maybeSingle(),
    ]);
    if (invRes.error) toast("שגיאה בטעינת חשבוניות", "error");
    if (custRes.error) toast("שגיאה בטעינת לקוחות", "error");
    setInvoices((invRes.data || []).map((r) => ({ ...r, customer_name: embeddedName(r.customers) })));
    setCustomers(custRes.data || []);
    setProjects((projRes.data || []).map((p) => ({ id: p.id, customer_id: p.customer_id, location: p.location, customer_name: embeddedName(p.customers) })));
    setTaxSettings((taxRes.data as TaxSettings) || null);
    setLoading(false);
  }

  function openNew() {
    setEditingId(null);
    const defaultRate = taxSettings?.vat_rate ?? 18;
    setForm({
      customer_id: "",
      project_id: "",
      invoice_number: nextInvoiceNumber(invoices, new Date()),
      issue_date: new Date().toISOString().split("T")[0],
      due_date: "",
      vat_rate: defaultRate,
      is_exempt: defaultRate === 0,
      items: [emptyItem()],
      notes: "",
    });
    setNewCustOpen(false);
    setModalOpen(true);
  }

  function openEdit(inv: Invoice) {
    setEditingId(inv.id);
    setForm({
      customer_id: inv.customer_id,
      project_id: inv.project_id || "",
      invoice_number: inv.invoice_number,
      issue_date: inv.issue_date,
      due_date: inv.due_date || "",
      vat_rate: inv.vat_rate,
      is_exempt: inv.vat_rate === 0,
      items: inv.items.length ? inv.items : [emptyItem()],
      notes: inv.notes || "",
    });
    setNewCustOpen(false);
    setModalOpen(true);
  }

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !form) return;
    if (!form.customer_id) {
      toast("יש לבחור לקוח", "error");
      return;
    }
    setSaving(true);

    const totals = computeTotals(form.items, form.vat_rate);
    const payload = {
      customer_id: form.customer_id,
      project_id: form.project_id || null,
      invoice_number: form.invoice_number.trim() || nextInvoiceNumber(invoices, new Date()),
      issue_date: form.issue_date,
      due_date: form.due_date || null,
      items: form.items.filter((it) => it.description.trim()),
      amount: Math.round(totals.total * 100) / 100,
      vat_rate: form.is_exempt ? 0 : form.vat_rate,
      notes: form.notes || null,
    };

    if (editingId) {
      const { error } = await supabase.from("invoices").update(payload).eq("id", editingId);
      if (error) {
        toast("שגיאה בעדכון", "error");
      } else {
        toast("החשבונית עודכנה", "success");
        loadAll();
      }
    } else {
      const newId = generateId();
      const custName = customers.find((c) => c.id === form.customer_id)?.name || null;
      const newInv: Invoice = { id: newId, user_id: user.id, customer_name: custName, ...payload, status: "draft", sent_at: null, created_at: new Date().toISOString() } as Invoice;
      setInvoices((prev) => [newInv, ...prev]);
      const { error } = await supabase.from("invoices").insert({ id: newId, user_id: user.id, ...payload });
      if (error) {
        setInvoices((prev) => prev.filter((i) => i.id !== newId));
        toast("שגיאה בשמירה", "error");
      } else {
        toast("החשבונית נוצרה", "success");
      }
    }

    setSaving(false);
    setModalOpen(false);
  }

  async function handleDelete(inv: Invoice) {
    if (!confirm(`האם למחוק את החשבונית ${inv.invoice_number}?`)) return;
    setInvoices((prev) => prev.filter((i) => i.id !== inv.id));
    const { error } = await supabase.from("invoices").delete().eq("id", inv.id);
    if (error) {
      toast("שגיאה במחיקה", "error");
      loadAll();
    } else {
      toast("החשבונית נמחקה", "success");
    }
  }

  async function applySent(inv: Invoice) {
    if (!user) return;
    const customer = customers.find((c) => c.id === inv.customer_id);
    const desc = `חשבונית ${inv.invoice_number}: ${customer?.name || ""}`;
    const date = new Date().toISOString().split("T")[0];
    const incomePayload = { description: desc, amount: inv.amount, date, type: "שוטף", vat_rate: inv.vat_rate };

    if (inv.project_id) {
      const { data: existing } = await supabase
        .from("incomes").select("id").eq("user_id", user.id).eq("project_id", inv.project_id)
        .ilike("description", "הכנסה מפרויקט%").maybeSingle();
      if (existing) {
        await supabase.from("incomes").update({ ...incomePayload, project_id: inv.project_id }).eq("id", existing.id);
      } else {
        await supabase.from("incomes").insert({ id: generateId(), user_id: user.id, project_id: inv.project_id, ...incomePayload });
      }
    } else {
      await supabase.from("incomes").insert({ id: generateId(), user_id: user.id, ...incomePayload });
    }

    const { error } = await supabase.from("invoices").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", inv.id);
    if (error) {
      toast("שגיאה בעדכון סטטוס החשבונית", "error");
    } else {
      setInvoices((prev) => prev.map((i) => (i.id === inv.id ? { ...i, status: "sent", sent_at: new Date().toISOString() } : i)));
    }
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
      const html = buildInvoiceHtml(sendConfirm, customer, taxSettings);
      const base64 = await generateInvoicePdfBase64(html);
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          to: customer.email,
          subject: `חשבונית ${sendConfirm.invoice_number}`,
          htmlBody: `
            <div dir="rtl" style="font-family:Arial;max-width:600px">
              <h2>חשבונית ${sendConfirm.invoice_number}</h2>
              <p>שלום ${customer.name},</p>
              <p>מצורפת חשבונית ${sendConfirm.invoice_number} בסך ${formatCurrency(sendConfirm.amount)}.</p>
              <hr/>
              <p><strong>${taxSettings?.business_name || "עצמאי"}</strong></p>
            </div>`,
          pdfBase64: base64,
          pdfFilename: `חשבונית-${sendConfirm.invoice_number}.pdf`,
        }),
      });
      if (res.ok) {
        await applySent(sendConfirm);
        toast("החשבונית נשלחה בהצלחה", "success");
        setSendConfirm(null);
        setPreview(null);
      } else {
        toast("שגיאה בשליחת החשבונית", "error");
      }
    } catch {
      toast("שגיאה בשליחת החשבונית", "error");
    } finally {
      setSending(false);
    }
  }

  async function markSentWithoutEmail(inv: Invoice) {
    if (!confirm(`לסמן את החשבונית ${inv.invoice_number} כנשלחה? ההכנסה תירשם בספרי ההנהלת חשבונות.`)) return;
    await applySent(inv);
    toast("החשבונית סומנה כנשלחה", "success");
  }

  async function markPaid(inv: Invoice) {
    const { error } = await supabase.from("invoices").update({ status: "paid" }).eq("id", inv.id);
    if (error) {
      toast("שגיאה בעדכון", "error");
    } else {
      setInvoices((prev) => prev.map((i) => (i.id === inv.id ? { ...i, status: "paid" } : i)));
      toast("החשבונית סומנה כשולם", "success");
    }
  }

  async function handleDownload() {
    if (!preview) return;
    const customer = customers.find((c) => c.id === preview.customer_id) || null;
    const html = buildInvoiceHtml(preview, customer, taxSettings);
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
        .save(`חשבונית-${preview.invoice_number}.pdf`);
    } finally {
      document.body.removeChild(el);
    }
  }

  function updateItem(id: string, patch: Partial<InvoiceItem>) {
    setForm((f) => (f ? { ...f, items: f.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) } : f));
  }

  if (loading && invoices.length === 0) {
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

  const previewCustomer = preview ? customers.find((c) => c.id === preview.customer_id) || null : null;
  // Reflect live status (e.g. after marking as sent) in the preview footer
  const livePreview = preview ? invoices.find((i) => i.id === preview.id) || preview : null;
  const previewHtml = preview ? buildInvoiceHtml(preview, previewCustomer, taxSettings) : "";
  const total = form ? computeTotals(form.items, form.is_exempt ? 0 : form.vat_rate) : null;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Receipt size={24} className="text-blue-500" />
          <h1 className="text-2xl font-bold text-slate-800">חשבוניות</h1>
          <Badge variant="blue">{invoices.length}</Badge>
        </div>
        <Button onClick={openNew}><Plus size={14} /> חשבונית חדשה</Button>
      </div>

      {invoices.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={<Receipt size={40} className="text-slate-300" />}
            title="אין חשבוניות עדיין"
            description='לחץ על "חשבונית חדשה" כדי להתחיל'
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {["מספר", "לקוח", "תאריך", "סכום", "סטטוס"].map((h) => (
                    <th key={h} className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">{h}</th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoices.map((inv) => {
                  const meta = STATUS_META[inv.status] || STATUS_META.draft;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-bold">{inv.invoice_number}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{inv.customer_name || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{inv.issue_date.split("-").reverse().join("/")}</td>
                      <td className="px-4 py-3 text-sm font-bold text-emerald-600">{formatCurrency(inv.amount)}</td>
                      <td className="px-4 py-3"><Badge variant={meta.variant}>{meta.label}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setPreview(inv)} className="text-slate-400 hover:text-blue-600" title="תצוגה">
                            <Eye size={16} />
                          </button>
                          {inv.status === "draft" && (
                            <button onClick={() => openEdit(inv)} className="text-slate-400 hover:text-blue-600" title="ערוך">
                              <Pencil size={16} />
                            </button>
                          )}
                          <button onClick={() => handleDelete(inv)} className="text-slate-400 hover:text-red-500" title="מחק">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "עריכת חשבונית" : "חשבונית חדשה"}
        size="full"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>ביטול</Button>
            <Button loading={saving} onClick={handleSubmit}><Save size={14} /> {editingId ? "שמור שינויים" : "צור חשבונית"}</Button>
          </div>
        }
      >
        {form && (
          <form onSubmit={handleSubmit} className="space-y-4">
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
                label="פרויקט (לא חובה)"
                options={[
                  { value: "", label: "ללא" },
                  ...projects
                    .filter((p) => !form.customer_id || p.customer_id === form.customer_id)
                    .map((p) => ({ value: p.id, label: `${p.customer_name || "ללא שם"}${p.location ? " - " + p.location : ""}` })),
                ]}
                value={form.project_id}
                onChange={(e) => setForm({ ...form, project_id: e.target.value })}
              />
              <Input label="מספר חשבונית" value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="תאריך" type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} required />
                <Input label="יעד לתשלום" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Checkbox
                label='עוסק פטור (ללא מע"מ)'
                checked={form.is_exempt}
                onChange={(e) => setForm({ ...form, is_exempt: e.target.checked })}
              />
              {!form.is_exempt && (
                <Input
                  label='שיעור מע"מ (%)'
                  type="number"
                  min="0"
                  max="100"
                  className="w-32"
                  value={form.vat_rate}
                  onChange={(e) => setForm({ ...form, vat_rate: parseFloat(e.target.value) || 0 })}
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">פריטים</label>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      {["תיאור", "כמות", "מחיר ליחידה", 'סה"כ'].map((h) => (
                        <th key={h} className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">{h}</th>
                      ))}
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {form.items.map((it) => (
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
                        <td className="px-3 py-2 text-sm font-bold whitespace-nowrap">{formatCurrency(it.quantity * it.unit_price)}</td>
                        <td className="px-3 py-2">
                          <button type="button" onClick={() => setForm((f) => (f ? { ...f, items: f.items.filter((x) => x.id !== it.id) } : f))} className="text-slate-400 hover:text-red-500">
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button size="sm" variant="secondary" type="button" className="mt-2" onClick={() => setForm((f) => (f ? { ...f, items: [...f.items, emptyItem()] } : f))}>
                <Plus size={14} /> הוסף שורה
              </Button>
              {total && (
                <div className="flex justify-end mt-3 text-sm">
                  <div className="w-56 space-y-1">
                    <div className="flex justify-between text-slate-600"><span>סכום ללא מע&quot;מ</span><span>{formatCurrency(total.subtotal)}</span></div>
                    {!form.is_exempt && (
                      <div className="flex justify-between text-slate-600"><span>מע&quot;מ ({form.vat_rate}%)</span><span>{formatCurrency(total.vat)}</span></div>
                    )}
                    <div className="flex justify-between font-bold border-t border-slate-200 pt-1"><span>סה&quot;כ לתשלום</span><span className="text-emerald-600">{formatCurrency(total.total)}</span></div>
                  </div>
                </div>
              )}
            </div>

            <Input label="הערות" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </form>
        )}
      </Modal>

      {/* Preview Modal */}
      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview ? `חשבונית ${preview.invoice_number}` : ""}
        size="lg"
        footer={
          preview && (
            <div className="flex gap-2 justify-between w-full">
              <Button variant="ghost" onClick={() => setPreview(null)}>סגור</Button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleDownload}><Download size={14} /> הורד PDF</Button>
                {livePreview!.status === "sent" && (
                  <Button variant="secondary" onClick={() => markPaid(preview)}><CheckCircle2 size={14} /> סמן כשולם</Button>
                )}
                {livePreview!.status === "draft" && (
                  <>
                    <Button variant="secondary" onClick={() => markSentWithoutEmail(preview)}>
                      <Send size={14} /> סמן כנשלח
                    </Button>
                    <Button
                      disabled={!previewCustomer?.email}
                      title={!previewCustomer?.email ? "ללקוח אין כתובת אימייל" : undefined}
                      onClick={() => setSendConfirm(preview)}
                    >
                      <Send size={14} /> שלח במייל
                    </Button>
                  </>
                )}
              </div>
            </div>
          )
        }
      >
        {preview && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        )}
      </Modal>

      {/* Send Confirmation Modal */}
      <Modal
        open={!!sendConfirm}
        onClose={() => setSendConfirm(null)}
        title="שליחת חשבונית במייל"
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
          return (
            <div className="space-y-3 text-sm">
              <p>החשבונית <strong>{sendConfirm.invoice_number}</strong> בסך <strong className="text-emerald-600">{formatCurrency(sendConfirm.amount)}</strong> תישלח אל:</p>
              <div className="bg-slate-50 p-3 rounded-xl">
                <p className="font-medium">{customer?.name || "-"}</p>
                <p className="text-slate-500">{customer?.email || "ללא אימייל"}</p>
              </div>
              <p className="text-xs text-slate-400">השליחה תרשום את ההכנסה בספרי ההנהלת חשבונות.</p>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
