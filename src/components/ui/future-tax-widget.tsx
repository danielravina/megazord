"use client";

import { Scale, ChevronRight } from "lucide-react";
import { formatCurrencyShort } from "@/components/shared/format-currency";
import type { TaxSettings } from "@/components/finance/finance-types";

function getNextBillingDay(day: number, monthsFromNow = 0): string {
  const today = new Date();
  const target = new Date(today.getFullYear(), today.getMonth() + monthsFromNow, 1);
  const maxDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const safeDay = Math.min(day, maxDay);
  const date = new Date(target.getFullYear(), target.getMonth(), safeDay);
  if (monthsFromNow === 0 && today.getDate() >= safeDay) {
    date.setMonth(date.getMonth() + 1);
  }
  return date.toLocaleDateString("he-IL", { day: "numeric", month: "numeric", year: "2-digit" });
}

interface Payment {
  label: string;
  amount: number;
  due: string;
  color: string;
}

interface Props {
  settings: TaxSettings | null;
  estimatedIncome: number;
}

export function FutureTaxWidget({ settings, estimatedIncome }: Props) {
  const vatRate = settings?.vat_rate ?? 18;
  const incTaxRate = settings?.income_tax_advance ?? 0;
  const blRate = settings?.bituah_leumi ?? 5;

  // Estimate amounts
  const grossWithoutVat = estimatedIncome - (estimatedIncome - estimatedIncome / (1 + vatRate / 100));
  const estimatedVat = estimatedIncome - estimatedIncome / (1 + vatRate / 100);
  const estimatedIncTax = grossWithoutVat * (incTaxRate / 100);
  const estimatedBL = grossWithoutVat * (blRate / 100);

  const payments: Payment[] = [];
  const vatFreq = settings?.vat_frequency || "bimonthly";

  if (estimatedVat > 0) {
    payments.push({
      label: vatFreq === "bimonthly" ? 'מע"מ (דו-חודשי)' : 'מע"מ',
      amount: Math.round(estimatedVat * (vatFreq === "bimonthly" ? 2 : 1)),
      due: getNextBillingDay(settings?.vat_billing_day ?? 15),
      color: "text-blue-600 bg-blue-50",
    });
  }

  if (estimatedIncTax > 0) {
    payments.push({
      label: "מקדמות מס הכנסה",
      amount: Math.round(estimatedIncTax * (vatFreq === "bimonthly" ? 2 : 1)),
      due: getNextBillingDay(settings?.income_tax_billing_day ?? 15),
      color: "text-orange-600 bg-orange-50",
    });
  }

  if (estimatedBL > 0) {
    payments.push({
      label: "ביטוח לאומי",
      amount: Math.round(estimatedBL),
      due: getNextBillingDay(settings?.bituah_leumi_billing_day ?? 15),
      color: "text-purple-600 bg-purple-50",
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Scale size={16} className="text-slate-400" />
        <h4 className="text-sm font-bold text-slate-600">תשלומים צפויים</h4>
      </div>

      {payments.length === 0 ? (
        <p className="text-xs text-slate-400">אין נתוני הכנסה לחישוב</p>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <div key={p.label} className={`${p.color} rounded-lg p-3 flex items-center justify-between`}>
              <div>
                <p className="text-xs font-semibold">{p.label}</p>
                <p className="text-[10px] opacity-70">חיוב: {p.due}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm">{formatCurrencyShort(p.amount)}</span>
                <ChevronRight size={12} className="opacity-40" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
