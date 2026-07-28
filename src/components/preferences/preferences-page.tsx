"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/layout/auth-provider";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Settings, Save, Building } from "lucide-react";
import type { TaxSettings } from "@/components/finance/finance-types";

const FIELD_NAMES = [
  "owner_name", "business_name", "vat_number", "business_phone", "business_address",
  "accountant_email",
  "vat_rate", "vat_billing_day", "vat_frequency",
  "income_tax_billing_day", "income_tax_advance",
  "bituah_leumi", "bituah_leumi_billing_day", "credit_points",
];

function getInitialValues(settings: TaxSettings | null): Record<string, string> {
  return {
    owner_name: settings?.owner_name || "",
    business_name: settings?.business_name || "",
    vat_number: settings?.vat_number || "",
    business_phone: settings?.business_phone || "",
    business_address: settings?.business_address || "",
    accountant_email: settings?.accountant_email || "",
    vat_rate: String(settings?.vat_rate ?? 17),
    vat_billing_day: String(settings?.vat_billing_day ?? 15),
    vat_frequency: settings?.vat_frequency || "bimonthly",
    income_tax_billing_day: String(settings?.income_tax_billing_day ?? 15),
    income_tax_advance: String(settings?.income_tax_advance ?? 0),
    bituah_leumi: String(settings?.bituah_leumi ?? 5),
    bituah_leumi_billing_day: String(settings?.bituah_leumi_billing_day ?? 15),
    credit_points: String(settings?.credit_points ?? 2.25),
  };
}

export function PreferencesPage() {
  const { supabase, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<TaxSettings | null>(null);
  const [dirty, setDirty] = useState(false);
  const initialValues = useRef<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!user) return;
    loadSettings();
  }, [user]);

  async function loadSettings() {
    setLoading(true);
    const { data } = await supabase
      .from("tax_settings")
      .select("*")
      .eq("user_id", user!.id)
      .maybeSingle();
    setSettings(data || null);
    initialValues.current = getInitialValues(data || null);
    setDirty(false);
    setLoading(false);
  }

  function checkDirty() {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    for (const name of FIELD_NAMES) {
      const current = (fd.get(name) as string) || "";
      const initial = initialValues.current[name] || "";
      if (current !== initial) {
        setDirty(true);
        return;
      }
    }
    setDirty(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);

    const payload: TaxSettings = {
      user_id: user.id,
      vat_rate: parseFloat(fd.get("vat_rate") as string) || 17,
      vat_frequency: fd.get("vat_frequency") as string || "bimonthly",
      vat_billing_day: parseInt(fd.get("vat_billing_day") as string) || 15,
      income_tax_advance: parseFloat(fd.get("income_tax_advance") as string) || 0,
      income_tax_billing_day: parseInt(fd.get("income_tax_billing_day") as string) || 15,
      bituah_leumi: parseFloat(fd.get("bituah_leumi") as string) || 5,
      bituah_leumi_billing_day: parseInt(fd.get("bituah_leumi_billing_day") as string) || 15,
      credit_points: parseFloat(fd.get("credit_points") as string) || 2.25,
      business_name: (fd.get("business_name") as string) || null,
      vat_number: (fd.get("vat_number") as string) || null,
      business_address: (fd.get("business_address") as string) || null,
      business_phone: (fd.get("business_phone") as string) || null,
      accountant_email: (fd.get("accountant_email") as string) || null,
      owner_name: (fd.get("owner_name") as string) || null,
    };

    setSettings(payload);
    const { error } = await supabase.from("tax_settings").upsert(payload);
    if (error) toast("שגיאה בשמירה", "error");
    else {
      toast("ההגדרות נשמרו", "success");
      initialValues.current = getInitialValues(payload);
      setDirty(false);
    }
    setSaving(false);
  }

  if (loading && !settings) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings size={24} className="text-blue-500" />
          <h1 className="text-2xl font-bold text-slate-800">העדפות</h1>
        </div>
        <Button type="submit" form="prefs-form" loading={saving} disabled={!dirty}>
          <Save size={14} /> שמור העדפות
        </Button>
      </div>

      <form ref={formRef} id="prefs-form" onSubmit={handleSave} onChange={checkDirty} className="space-y-8">
        {/* Business Profile */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 border-b pb-2">
            <Building size={20} className="text-blue-500" />
            פרטי העסק
          </h2>
          <div className="space-y-4">
            <Input label="שם בעל העסק" name="owner_name" defaultValue={settings?.owner_name || ""} placeholder='להצגה בדשבורד' />
            <Input label="שם העסק" name="business_name" defaultValue={settings?.business_name || ""} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label='מספר עוסק מורשה / ח.פ' name="vat_number" defaultValue={settings?.vat_number || ""} />
              <Input label="טלפון" name="business_phone" defaultValue={settings?.business_phone || ""} />
            </div>
            <Input label="כתובת" name="business_address" defaultValue={settings?.business_address || ""} />
          </div>
        </Card>

        {/* Accountant */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">
            רואה חשבון
          </h2>
          <Input
            label="אימייל רואה חשבון"
            name="accountant_email"
            type="email"
            defaultValue={settings?.accountant_email || ""}
            placeholder='לייצוא דוחות חודשיים'
          />
          <p className="text-xs text-slate-400 mt-2">
            האימייל ישמש לשליחת דוחות חודשיים לרואה החשבון.
          </p>
        </Card>

        {/* Tax Settings */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">
            הגדרות מיסים
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label='מע"מ (%)' name="vat_rate" type="number" min="0" max="100" step="0.1" defaultValue={settings?.vat_rate ?? 17} />
            <Input label="יום חיוב מע״מ" name="vat_billing_day" type="number" min="1" max="31" defaultValue={settings?.vat_billing_day ?? 15} />
            <Select label="תדירות דיווח מע״מ" name="vat_frequency" options={[{ value: "bimonthly", label: "דו-חודשי" }, { value: "monthly", label: "חודשי" }]} defaultValue={settings?.vat_frequency ?? "bimonthly"} />
            <Input label="יום חיוב מס הכנסה" name="income_tax_billing_day" type="number" min="1" max="31" defaultValue={settings?.income_tax_billing_day ?? 15} />
            <Input label="מקדמות מס הכנסה (%)" name="income_tax_advance" type="number" min="0" max="100" step="0.1" defaultValue={settings?.income_tax_advance ?? 0} />
            <Input label="ביטוח לאומי (%)" name="bituah_leumi" type="number" min="0" max="100" step="0.1" defaultValue={settings?.bituah_leumi ?? 5} />
            <Input label="יום חיוב ביטוח לאומי" name="bituah_leumi_billing_day" type="number" min="1" max="31" defaultValue={settings?.bituah_leumi_billing_day ?? 15} />
            <Input label="נקודות זכות" name="credit_points" type="number" min="0" max="20" step="0.25" defaultValue={settings?.credit_points ?? 2.25} />
          </div>
        </Card>
      </form>
    </div>
  );
}
