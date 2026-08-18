"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/layout/auth-provider";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonButton, SkeletonText } from "@/components/ui/skeleton";
import { generateId } from "@/components/shared/generate-id";
import { isValidEmail } from "@/components/shared/validate-email";
import { Building, Plus, Save, Trash2, Pencil, FileText } from "lucide-react";
import type { Supplier, SupplierFormData } from "./supplier-types";

const emptyForm: SupplierFormData = {
  name: "", email: "", phone: "", vat_number: "", address: "", notes: "",
};

export function SuppliersPage() {
  const { supabase, user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const supplierParam = searchParams.get("supplier");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierFormData>({ ...emptyForm });

  useEffect(() => {
    if (!user) return;
    loadSuppliers();
  }, [user]);

  useEffect(() => {
    if (searchParams.get("new") === "1") openNew();
  }, [searchParams]);

  // Open the supplier's edit view directly when navigating with ?supplier=<id> (e.g. from global search)
  useEffect(() => {
    if (!supplierParam || suppliers.length === 0) return;
    const supplier = suppliers.find((s) => s.id === supplierParam);
    if (supplier) openEdit(supplier);
  }, [supplierParam, suppliers]);

  async function loadSuppliers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("user_id", user!.id)
      .order("name", { ascending: true });
    if (error) { toast("שגיאה בטעינת ספקים", "error"); }
    setSuppliers(data || []);
    setLoading(false);
  }

  function openNew() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  }

  function openEdit(s: Supplier) {
    setEditingId(s.id);
    setForm({
      name: s.name,
      email: s.email || "",
      phone: s.phone || "",
      vat_number: s.vat_number || "",
      address: s.address || "",
      notes: s.notes || "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (form.email.trim() && !isValidEmail(form.email)) {
      toast("כתובת אימייל לא תקינה", "error");
      return;
    }
    setSaving(true);

    const payload = {
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      vat_number: form.vat_number || null,
      address: form.address || null,
      notes: form.notes || null,
    };

    if (editingId) {
      const { error } = await supabase.from("businesses").update(payload).eq("id", editingId);
      if (error) {
        toast("שגיאה בעדכון", "error");
      } else {
        toast("הספק עודכן", "success");
        loadSuppliers();
      }
    } else {
      const newId = generateId();
      const newSupplier: Supplier = { id: newId, user_id: user.id, ...payload, created_at: new Date().toISOString() } as Supplier;
      setSuppliers((prev) => [...prev, newSupplier]);
      const { error } = await supabase.from("businesses").insert({ id: newId, user_id: user.id, ...payload });
      if (error) {
        setSuppliers((prev) => prev.filter((s) => s.id !== newId));
        toast("שגיאה בשמירה", "error");
      } else {
        toast("הספק נוצר", "success");
      }
    }

    setSaving(false);
    setModalOpen(false);
  }

  async function handleDelete(s: Supplier) {
    if (!confirm(`האם למחוק את הספק "${s.name}"?`)) return;

    const { count } = await supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user!.id)
      .eq("business_id", s.id);

    if ((count || 0) > 0) {
      toast("לא ניתן למחוק ספק המשויך למסמכים", "error");
      return;
    }

    setSuppliers((prev) => prev.filter((x) => x.id !== s.id));
    const { error } = await supabase.from("businesses").delete().eq("id", s.id);
    if (error) {
      toast("שגיאה במחיקה", "error");
      loadSuppliers();
    } else {
      toast("הספק נמחק", "success");
    }
  }

  if (loading && suppliers.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Skeleton className="w-6 h-6" />
            <Skeleton className="w-40 h-8" />
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
              <SkeletonText className="w-24" />
              <SkeletonText className="w-20" />
              <SkeletonText className="w-28" />
              <SkeletonText className="w-16" />
              <SkeletonText className="w-20" />
              <div className="flex justify-end gap-3">
                <Skeleton className="w-4 h-4" />
                <Skeleton className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Building size={24} className="text-blue-500" />
          <h1 className="text-2xl font-bold text-slate-800">ניהול ספקים</h1>
          <Badge variant="blue">{suppliers.length}</Badge>
        </div>
        <Button onClick={openNew}><Plus size={14} /> ספק חדש</Button>
      </div>

      {suppliers.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={<Building size={40} className="text-slate-300" />}
            title="אין ספקים עדיין"
            description='ספקים מזוהים אוטומטית מסריקת מסמכים, או לחץ על "ספק חדש" כדי להוסיף ידנית'
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {["שם", "ע.מ", "טלפון", "אימייל", "מסמכים"].map((h) => (
                    <th key={h} className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">{h}</th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{s.vat_number || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{s.phone || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{s.email || "-"}</td>
                    <td className="px-4 py-3 text-sm">
                      <Link
                        href={`/scans/?supplier=${s.id}`}
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                        title="הצג מסמכים של הספק"
                      >
                        <FileText size={14} /> הצג
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(s)} className="text-slate-400 hover:text-blue-600" title="ערוך">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDelete(s)} className="text-slate-400 hover:text-red-500" title="מחק">
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "עריכת ספק" : "הוספת ספק חדש"}
        size="lg"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>ביטול</Button>
            <Button loading={saving} onClick={handleSubmit}><Save size={14} /> {editingId ? "שמור שינויים" : "שמור ספק"}</Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="שם *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="אימייל" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="טלפון" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="מספר עוסק מורשה (ע.מ)" value={form.vat_number} onChange={(e) => setForm({ ...form, vat_number: e.target.value })} />
            <Input label="כתובת" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <Input label="הערות" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </form>
      </Modal>
    </div>
  );
}
