"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
import { Users, Plus, Save, Trash2, Pencil } from "lucide-react";
import type { Customer, CustomerFormData } from "./customer-types";

const emptyForm: CustomerFormData = {
  name: "", email: "", phone: "", company: "", vat_number: "", address: "", notes: "",
};

export function CustomersPage() {
  const { supabase, user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerFormData>({ ...emptyForm });

  useEffect(() => {
    if (!user) return;
    loadCustomers();
  }, [user]);

  useEffect(() => {
    if (searchParams.get("new") === "1") openNew();
  }, [searchParams]);

  async function loadCustomers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("user_id", user!.id)
      .order("name", { ascending: true });
    if (error) { toast("שגיאה בטעינת לקוחות", "error"); }
    setCustomers(data || []);
    setLoading(false);
  }

  function openNew() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  }

  function openEdit(c: Customer) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      email: c.email || "",
      phone: c.phone || "",
      company: c.company || "",
      vat_number: c.vat_number || "",
      address: c.address || "",
      notes: c.notes || "",
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
      company: form.company || null,
      vat_number: form.vat_number || null,
      address: form.address || null,
      notes: form.notes || null,
    };

    if (editingId) {
      const { error } = await supabase.from("customers").update(payload).eq("id", editingId);
      if (error) {
        toast("שגיאה בעדכון", "error");
      } else {
        toast("הלקוח עודכן", "success");
        loadCustomers();
      }
    } else {
      const newId = generateId();
      const newCustomer: Customer = { id: newId, user_id: user.id, ...payload, created_at: new Date().toISOString() } as Customer;
      setCustomers((prev) => [...prev, newCustomer]);
      const { error } = await supabase.from("customers").insert({ id: newId, user_id: user.id, ...payload });
      if (error) {
        setCustomers((prev) => prev.filter((c) => c.id !== newId));
        toast("שגיאה בשמירה", "error");
      } else {
        toast("הלקוח נוצר", "success");
      }
    }

    setSaving(false);
    setModalOpen(false);
  }

  async function handleDelete(c: Customer) {
    if (!confirm(`האם למחוק את הלקוח "${c.name}"?`)) return;

    const [invCount, projCount] = await Promise.all([
      supabase.from("invoices").select("id", { count: "exact", head: true }).eq("user_id", user!.id).eq("customer_id", c.id),
      supabase.from("projects").select("id", { count: "exact", head: true }).eq("user_id", user!.id).eq("customer_id", c.id),
    ]);

    if ((invCount.count || 0) > 0 || (projCount.count || 0) > 0) {
      toast("לא ניתן למחוק לקוח המשויך לחשבוניות או פרויקטים", "error");
      return;
    }

    setCustomers((prev) => prev.filter((x) => x.id !== c.id));
    const { error } = await supabase.from("customers").delete().eq("id", c.id);
    if (error) {
      toast("שגיאה במחיקה", "error");
      loadCustomers();
    } else {
      toast("הלקוח נמחק", "success");
    }
  }

  if (loading && customers.length === 0) {
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
          <Users size={24} className="text-blue-500" />
          <h1 className="text-2xl font-bold text-slate-800">ניהול לקוחות</h1>
          <Badge variant="blue">{customers.length}</Badge>
        </div>
        <Button onClick={openNew}><Plus size={14} /> לקוח חדש</Button>
      </div>

      {customers.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={<Users size={40} className="text-slate-300" />}
            title="אין לקוחות עדיין"
            description='לחץ על "לקוח חדש" כדי להתחיל'
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {["שם", "טלפון", "אימייל", "ע.מ", "חברה"].map((h) => (
                    <th key={h} className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">{h}</th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{c.phone || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{c.email || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{c.vat_number || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{c.company || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(c)} className="text-slate-400 hover:text-blue-600" title="ערוך">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDelete(c)} className="text-slate-400 hover:text-red-500" title="מחק">
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
        title={editingId ? "עריכת לקוח" : "הוספת לקוח חדש"}
        size="lg"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>ביטול</Button>
            <Button loading={saving} onClick={handleSubmit}><Save size={14} /> {editingId ? "שמור שינויים" : "שמור לקוח"}</Button>
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
            <Input label="חברה / עסק" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            <Input label="מספר עוסק מורשה (ע.מ)" value={form.vat_number} onChange={(e) => setForm({ ...form, vat_number: e.target.value })} />
          </div>
          <Input label="כתובת" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Input label="הערות" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </form>
      </Modal>
    </div>
  );
}
