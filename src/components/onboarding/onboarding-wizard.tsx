"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/layout/auth-provider";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Building, User, ChevronLeft, ChevronRight,
} from "lucide-react";
import type { TaxSettings } from "@/components/finance/finance-types";

type VatStatus = "morashi" | "patoor" | "zeair";

interface FormValues {
  owner_name: string;
  business_name: string;
  business_email: string;
  vat_status: VatStatus;
  zeair_expense_rate: string;
}

const STEP_TITLES = ["פרטי העסק", "סוג עוסק"] as const;
const STEP_ICONS = [User, Building] as const;

const DEFAULTS: FormValues = {
  owner_name: "",
  business_name: "",
  business_email: "",
  vat_status: "morashi",
  zeair_expense_rate: "",
};

export function OnboardingWizard() {
  const { supabase, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [values, setValues] = useState<FormValues>({ ...DEFAULTS });
  const [step, setStep] = useState(0);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login/");
      return;
    }
    // שמירה כפולה: אשף מסמן onboarding_completed בסופו — אם היה כבר שמור, דלג
    supabase
      .from("tax_settings")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.onboarding_completed) router.replace("/dashboard/");
        else setChecking(false);
      });
  }, [supabase, user, authLoading, router]);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function buildPayload(): Partial<TaxSettings> {
    const numOr = (v: string, fallback: number) => {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : fallback;
    };
    const orNull = (v: string) => v.trim() || null;
    return {
      user_id: user!.id,
      onboarding_completed: true,
      owner_name: orNull(values.owner_name),
      business_name: orNull(values.business_name),
      business_email: orNull(values.business_email),
      vat_status: values.vat_status,
      income_scheme: values.vat_status === "zeair" ? "zeair" : "standard",
      zeair_expense_rate: numOr(values.zeair_expense_rate, 0),
    };
  }

  async function upsert(payload: Partial<TaxSettings>) {
    const { error } = await supabase.from("tax_settings").upsert(payload);
    return error;
  }

  async function finish() {
    setSaving(true);
    const error = await upsert(buildPayload());
    setSaving(false);
    if (error) {
      toast("שגיאה בשמירת ההגדרות", "error");
      return;
    }
    router.replace("/dashboard/");
  }

  async function skipAll() {
    setSaving(true);
    const error = await upsert({ user_id: user!.id, onboarding_completed: true });
    setSaving(false);
    if (error) {
      toast("שגיאה בשמירה", "error");
      return;
    }
    toast("ניתן להזין את ההגדרות בכל רגע דרך דף ההגדרות", "success");
    router.replace("/dashboard/");
  }

  if (authLoading || checking || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const isLastStep = step === STEP_TITLES.length - 1;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">ברוך הבא לעצמאי</h1>
          <p className="text-sm text-slate-500 mt-2">
            כמה שאלות קצרות כדי להתאים את המערכת לעסק שלך
          </p>
        </div>

        {/* Progress */}
        <div className="flex justify-center gap-2 mb-6" aria-hidden>
          {STEP_TITLES.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-8 bg-blue-600" : i < step ? "w-4 bg-blue-300" : "w-4 bg-slate-200"
              }`}
            />
          ))}
        </div>

        <Card className="p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
            {(() => {
              const StepIcon = STEP_ICONS[step];
              return <StepIcon size={20} className="text-blue-500" />;
            })()}
            <h2 className="text-lg font-bold text-slate-800">
              {STEP_TITLES[step]}
              <span className="text-xs font-normal text-slate-400 mr-2">
                שלב {step + 1} מתוך {STEP_TITLES.length}
              </span>
            </h2>
          </div>

          {step === 0 && (
            <div className="space-y-4">
              <Input
                label="השם שלך (להצגה בלוח הבקרה)"
                value={values.owner_name}
                onChange={(e) => set("owner_name", e.target.value)}
                placeholder="לדוגמה: דניאל"
              />
              <Input
                label="שם העסק"
                value={values.business_name}
                onChange={(e) => set("business_name", e.target.value)}
                placeholder="לדוגמה: עצמאי בע״מ"
              />
              <Input
                label="אימייל העסק"
                type="email"
                dir="ltr"
                value={values.business_email}
                onChange={(e) => set("business_email", e.target.value)}
                placeholder="להצגה בראש המסמכים"
              />
              <p className="text-xs text-slate-400">
                השדות רשותיים — ניתן להשלים מאוחר יותר.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <Select
                label="הרשמה במע״מ"
                value={values.vat_status}
                onChange={(e) => set("vat_status", e.target.value as VatStatus)}
                options={[
                  { value: "morashi", label: "עוסק מורשה (גובה מע״מ)" },
                  { value: "patoor", label: "עוסק פטור (ללא מע״מ)" },
                  { value: "zeair", label: "עוסק זעיר (פטור ממע״מ + אחוז הוצאות קבוע)" },
                ]}
              />
              <p className="text-xs text-slate-400 -mt-2">
                משפיע על חישובי המע״מ וההוצאות המוכרות במערכת.
              </p>
              {values.vat_status === "zeair" && (
                <Input
                  label='אחוז הוצאות מוכר (%)'
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={values.zeair_expense_rate}
                  onChange={(e) => set("zeair_expense_rate", e.target.value)}
                  placeholder="לדוגמה 10"
                />
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-5 mt-6">
            {step > 0 ? (
              <Button variant="ghost" size="md" onClick={() => setStep(step - 1)}>
                <ChevronRight size={16} /> חזור
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="md"
                loading={saving}
                onClick={skipAll}
              >
                דלג על הכל
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="md"
                onClick={() => (isLastStep ? skipAll() : setStep(step + 1))}
                disabled={saving}
              >
                דלג
              </Button>
              {isLastStep ? (
                <Button size="md" loading={saving} onClick={finish}>
                  סיים והתחל
                </Button>
              ) : (
                <Button size="md" onClick={() => setStep(step + 1)}>
                  המשך <ChevronLeft size={16} />
                </Button>
              )}
            </div>
          </div>
        </Card>

        <p className="text-xs text-slate-400 text-center mt-4">
          אפשר לדלג על כל שלב ולהשלים מאוחר יותר דרך דף ההגדרות.
        </p>
      </div>
    </div>
  );
}
