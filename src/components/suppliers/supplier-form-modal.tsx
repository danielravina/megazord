"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/layout/auth-provider";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { generateId } from "@/components/shared/generate-id";
import { isValidEmail } from "@/components/shared/validate-email";
import { Save } from "lucide-react";
import type { Supplier, SupplierFormData } from "./supplier-types";

const emptyForm: SupplierFormData = {
  name: "", email: "", phone: "", vat_number: "", address: "", notes: "",
};

interface Props {
  open: boolean;
  supplier: Supplier | null;
  onClose: () => void;
  onSaved: () => void;
}

export function SupplierFormModal({ open, supplier, onClose, onSaved }: Props) {
  const { supabase, user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<SupplierFormData>({ ...emptyForm });

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(supplier ? {
      name: supplier.name,
      email: supplier.email || "",
      phone: supplier.phone || "",
      vat_number: supplier.vat_number || "",
      address: supplier.address || "",
      notes: supplier.notes || "",
    } : { ...emptyForm });
  }, [open, supplier]);

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

    if (supplier) {
      const { error } = await supabase.from("businesses").update(payload).eq("id", supplier.id);
      if (error) {
        toast("שגיאה בעדכון", "error");
      } else {
        toast("הספק עודכן", "success");
        setSaving(false);
        onClose();
        onSaved();
        return;
      }
    } else {
      const newId = generateId();
      const { error } = await supabase.from("businesses").insert({ id: newId, user_id: user.id, ...payload });
      if (error) {
        toast("שגיאה בשמירה", "error");
      } else {
        toast("הספק נוצר", "success");
        setSaving(false);
        onClose();
        onSaved();
        return;
      }
    }

    setSaving(false);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={supplier ? "עריכת ספק" : "הוספת ספק חדש"}
      size="lg"
      footer={
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>ביטול</Button>
          <Button loading={saving} onClick={handleSubmit}><Save size={14} /> {supplier ? "שמור שינויים" : "שמור ספק"}</Button>
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
  );
}