"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { formatCurrency } from "@/components/shared/format-currency";
import { escapeHtml } from "@/components/shared/escape-html";
import { resolveBranding } from "@/components/documents/branding";
import { buildMonthlyReport, filterByMonth } from "@/components/scans/monthly-report-utils";
import { outstandingDemands, futurePaymentScans } from "@/components/finance/ledger";
import type { ScanEvidence } from "@/components/finance/ledger";
import type { Income, Expense, Saving, TaxSettings } from "@/components/finance/finance-types";
import type { Invoice, VatStatus } from "@/components/documents/invoice-types";
import { Download, Send, Mail } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  incomes: Income[];
  expenses: Expense[];
  savings: Saving[];
  invoices: Invoice[];
  documents: ScanEvidence[];
  taxSettings: TaxSettings | null;
  supabase: SupabaseClient | null;
}

const MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

const VAT_STATUS_LABELS: Record<VatStatus, string> = {
  morashi: "עוסק מורשה",
  patoor: "עוסק פטור",
  zeair: "עוסק זעיר",
};

const fmtDate = (d: string) => d.split("-").reverse().join("/");

export function MonthlyExport({ open, onClose, incomes, expenses, savings, invoices, documents, taxSettings, supabase }: Props) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [sending, setSending] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [logoDataUri, setLogoDataUri] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !supabase) return;
    let cancelled = false;
    resolveBranding(supabase, taxSettings).then((b) => {
      if (!cancelled) setLogoDataUri(b.logoDataUri || null);
    });
    return () => { cancelled = true; };
  }, [open, supabase, taxSettings]);

  const vatStatus = (taxSettings?.vat_status as VatStatus) || "morashi";
  const exempt = vatStatus !== "morashi";

  const report = buildMonthlyReport(incomes, expenses, savings, taxSettings, month, year);
  const hasActivity = report.incomeTotal > 0 || report.expenseTotal > 0 || report.savingsTotal > 0;

  const businessName = taxSettings?.business_name || "";
  const vatNumber = taxSettings?.vat_number || "";
  const businessAddress = taxSettings?.business_address || "";
  const businessPhone = taxSettings?.business_phone || "";
  const accountantEmail = taxSettings?.accountant_email || "";

  // Open (pending) items, shown for context — not part of the tax figures.
  const openDemands = outstandingDemands(invoices);
  const pendingScanPayments = filterByMonth(futurePaymentScans(documents), month, year);

  // הוצאות מוכרות לצורכי הרווח: עוסק זעיר מנוכה שיעור קבוע מההכנסה
  const deductibleLabel =
    taxSettings?.income_scheme === "zeair"
      ? `הוצאה מוכרת (שיעור ${taxSettings?.zeair_expense_rate ?? 0}% מההכנסה)`
      : "הוצאות והפרות מוכרות";

  function buildPdfHtml(): string {
    const row = (label: string, date: string, amount: number) => `
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:12px;color:#1e293b">
        <span style="text-align:right">${escapeHtml(label)} <span style="color:#94a3b8;font-size:10px">${date}</span></span>
        <span style="font-weight:600;white-space:nowrap">${formatCurrency(amount)}</span>
      </div>
    `;

    const sectionTitle = (title: string, total: number) => `
      <div style="display:flex;justify-content:space-between;margin-top:16px;border-bottom:1px solid #e2e8f0;padding-bottom:4px">
        <span style="font-size:14px;font-weight:700;color:#334155">${escapeHtml(title)}</span>
        <span style="font-size:14px;font-weight:700;color:#334155">${formatCurrency(total)}</span>
      </div>
    `;

    const incomeSection = report.incomeTotal > 0
      ? `
        ${sectionTitle(exempt ? "הכנסות" : 'הכנסות (כולל מע"מ)', report.incomeTotal)}
        ${report.incomeItems.map((i) => row(i.description, fmtDate(i.date), Number(i.amount))).join("")}
      `
      : "";

    const expenseSection = report.expenseTotal > 0
      ? `
        ${sectionTitle("הוצאות", report.expenseTotal)}
        ${report.expenseGroups.map((g) => `
          <div style="margin-top:12px">
            <h4 style="font-size:13px;font-weight:600;color:#475569;margin:0">${escapeHtml(g.label)}</h4>
            ${g.items.map((e) => row(e.description, fmtDate(e.date), Number(e.amount))).join("")}
            <div style="display:flex;justify-content:space-between;padding:4px 0;font-weight:600;font-size:12px;color:#64748b">
              <span>סה״כ ${escapeHtml(g.label)}</span><span>${formatCurrency(g.total)}</span>
            </div>
          </div>
        `).join("")}
      `
      : "";

    const savingsSection = report.savingsTotal > 0
      ? `
        ${sectionTitle("חסכונות והפרשות", report.savingsTotal)}
        ${report.savingsItems.map((s) => row(s.fund_type, fmtDate(s.date), Number(s.amount))).join("")}
      `
      : "";

    const openDocsSection = openDemands.length > 0 || pendingScanPayments.length > 0
      ? `<div style="margin-top:16px;border:1px dashed #cbd5e1;border-radius:8px;padding:8px 12px;background:#f8fafc">
          <h4 style="font-size:12px;font-weight:700;color:#475569;margin:0 0 6px 0">מסמכים פתוחים (לא נכללו בסכומים לעיל)</h4>
          ${openDemands.map((inv) => row(`חשבונית עסקה ${inv.invoice_number}`, fmtDate(inv.issue_date), Number(inv.amount))).join("")}
          ${pendingScanPayments.map((d) => row(`ממתין לתשלום: ${d.title}`, fmtDate(d.date_on_doc || d.date.split("T")[0]), Number(d.total_amount || 0))).join("")}
        </div>`
      : "";

    const taxRows = [
      !exempt && report.tax.vat !== 0 ? row('מע"מ (שנגבה)', "", report.tax.vat) : "",
      report.tax.incomeTax > 0 ? row("מס הכנסה (מוערך)", "", report.tax.incomeTax) : "",
      report.tax.bituahLeumi > 0 ? row("ביטוח לאומי (מוערך)", "", report.tax.bituahLeumi) : "",
      report.tax.creditValue > 0 ? row("נקודות זיכוי", "", -report.tax.creditValue) : "",
      report.tax.taxAdvancesPaid > 0 ? row("מקדמות ששולמו", "", -report.tax.taxAdvancesPaid) : "",
      report.tax.balanceDue !== 0 ? row("מאזן מס לתשלום", "", report.tax.balanceDue) : "",
    ].filter(Boolean).join("");

    const taxSection = taxRows
      ? `
        ${sectionTitle("מיסים", report.tax.totalTax)}
        ${taxRows}
      `
      : "";

    const summaryRow = (label: string, amount: number, bold = false) => `
      <div style="display:flex;justify-content:space-between;padding-top:4px;font-weight:${bold ? 700 : 400};font-size:14px;color:${amount < 0 ? "#b91c1c" : "#1e293b"}">
        <span>${escapeHtml(label)}</span><span style="white-space:nowrap">${formatCurrency(amount)}</span>
      </div>
    `;

    const summarySection = `
      <div style="border-top:2px solid #1e293b;padding-top:8px;margin-top:16px">
        ${summaryRow(deductibleLabel, report.tax.dedExpenses)}
        ${summaryRow("רווח לפני מס", report.tax.netProfit)}
        ${report.tax.totalTax !== 0 ? summaryRow("מיסים", report.tax.totalTax) : ""}
        ${summaryRow("רווח אחרי מס", report.tax.netIncome, true)}
        ${report.tax.taxAdvancesPaid > 0 ? summaryRow("מקדמות ששולמו", -report.tax.taxAdvancesPaid) : ""}
        ${report.tax.balanceDue !== 0 ? summaryRow(report.tax.balanceDue > 0 ? "יתרת מס לתשלום" : "יתרה לזיכוי", report.tax.balanceDue, true) : ""}
      </div>`;

    const logoHtml = logoDataUri
      ? `<img src="${logoDataUri}" style="max-height:64px;max-width:200px;margin:0 auto 8px auto;display:block" />`
      : "";

    return `
      <div style="font-family:Arial;direction:rtl;color:#1e293b;padding:8px;background:#fff;max-width:700px;overflow:hidden">
        <div style="text-align:center;margin-bottom:20px">
          ${logoHtml}
          <h1 style="font-size:22px;margin:0;color:#1e293b">${escapeHtml(businessName || "עצמאי")}</h1>
          <p style="margin:4px 0;font-size:12px;color:#64748b">${VAT_STATUS_LABELS[vatStatus]}${vatNumber ? ` · ע.מ: ${escapeHtml(vatNumber)}` : ""}</p>
          ${businessAddress || businessPhone ? `<p style="margin:4px 0;font-size:12px;color:#64748b">${escapeHtml(businessAddress)}${businessPhone ? ` | ${escapeHtml(businessPhone)}` : ""}</p>` : ""}
          <h2 style="font-size:16px;margin-top:12px;color:#1e293b">דוח חודשי - ${MONTHS[month]} ${year}</h2>
        </div>
        ${incomeSection}
        ${expenseSection}
        ${savingsSection}
        ${openDocsSection}
        ${taxSection}
        ${summarySection}
      </div>`;
  }

  function mountReportEl(): { el: HTMLElement; content: HTMLElement } {
    const el = document.createElement("div");
    el.innerHTML = buildPdfHtml();
    el.style.position = "absolute";
    el.style.left = "-9999px";
    el.style.width = "700px";
    document.body.appendChild(el);
    return { el, content: el.firstElementChild as HTMLElement };
  }

  const HTML2PDF_OPTIONS = {
    margin: 10,
    image: { type: "jpeg" as const, quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
  };

  async function generatePDFBase64(): Promise<string> {
    const html2pdf = (await import("html2pdf.js")).default;
    const { el, content } = mountReportEl();
    await new Promise((r) => setTimeout(r, 100));
    try {
      const buffer = await html2pdf()
        .set(HTML2PDF_OPTIONS)
        .from(content)
        .outputPdf("arraybuffer");
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    } finally {
      document.body.removeChild(el);
    }
  }

  async function handleDownload() {
    const html2pdf = (await import("html2pdf.js")).default;
    const { el, content } = mountReportEl();
    await new Promise((r) => setTimeout(r, 100));
    try {
      await html2pdf()
        .set({ ...HTML2PDF_OPTIONS, filename: `דוח-חודשי-${MONTHS[month]}-${year}.pdf` })
        .from(content)
        .save();
    } finally {
      document.body.removeChild(el);
    }
  }

  function handleSend() {
    if (!accountantEmail) return;
    setConfirmSend(true);
  }

  async function doSend() {
    setConfirmSend(false);
    setSending(true);
    try {
      const base64 = await generatePDFBase64();
      if (!base64) return;

      const htmlBody = `
        <div dir="rtl" style="font-family: Arial; max-width:600px">
          <h2>דוח חודשי - ${MONTHS[month]} ${year}</h2>
          <p>שלום,</p>
          <p>מצורף דוח חודשי לחודש ${MONTHS[month]} ${year}.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:6px 0">הכנסות${exempt ? "" : ' (כולל מע"מ)'}</td><td style="text-align:left;font-weight:700">${formatCurrency(report.incomeTotal)}</td></tr>
            <tr><td style="padding:6px 0">${deductibleLabel}</td><td style="text-align:left;font-weight:700">${formatCurrency(report.tax.dedExpenses)}</td></tr>
            <tr><td style="padding:6px 0">רווח לפני מס</td><td style="text-align:left;font-weight:700">${formatCurrency(report.tax.netProfit)}</td></tr>
            <tr><td style="padding:6px 0">מיסים</td><td style="text-align:left;font-weight:700">${formatCurrency(report.tax.totalTax)}</td></tr>
            <tr><td style="padding:6px 0">רווח אחרי מס</td><td style="text-align:left;font-weight:700">${formatCurrency(report.tax.netIncome)}</td></tr>
            ${report.tax.taxAdvancesPaid > 0 ? `<tr><td style="padding:6px 0">מקדמות ששולמו</td><td style="text-align:left;font-weight:700">${formatCurrency(report.tax.taxAdvancesPaid)}</td></tr>` : ""}
            ${report.tax.balanceDue !== 0 ? `<tr><td style="padding:6px 0">${report.tax.balanceDue > 0 ? "יתרת מס לתשלום" : "יתרה לזיכוי"}</td><td style="text-align:left;font-weight:700">${formatCurrency(report.tax.balanceDue)}</td></tr>` : ""}
          </table>
          ${openDemands.length > 0 ? `<p style="color:#64748b;font-size:13px">חשבוניות עסקה פתוחות: ${openDemands.length} (${formatCurrency(openDemands.reduce((s, i) => s + Number(i.amount), 0))})</p>` : ""}
          <hr/>
          <p><strong>${escapeHtml(businessName || "עצמאי")}</strong></p>
          ${vatNumber ? `<p>ע.מ: ${escapeHtml(vatNumber)}</p>` : ""}
          ${businessAddress ? `<p>${escapeHtml(businessAddress)}</p>` : ""}
          ${businessPhone ? `<p>טל: ${escapeHtml(businessPhone)}</p>` : ""}
        </div>`;

      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          to: accountantEmail,
          subject: `דוח חודשי - ${MONTHS[month]} ${year}`,
          htmlBody,
          pdfBase64: base64,
          pdfFilename: `דוח-חודשי-${MONTHS[month]}-${year}.pdf`,
        }),
      });

      if (res.ok) {
        alert("הדוח נשלח בהצלחה!");
        onClose();
      } else {
        alert("שגיאה בשליחת הדוח");
      }
    } catch {
      alert("שגיאה בשליחת הדוח");
    } finally {
      setSending(false);
    }
  }

  const sumRow = (label: string, amount: number, color?: string) => (
    <div className={`flex justify-between text-sm font-bold ${color || "text-slate-800"}`}>
      <span>{label}</span><span>{formatCurrency(amount)}</span>
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title={`דוח חודשי - ${MONTHS[month]} ${year}`} size="full"
      footer={
        <div className="flex gap-2 justify-between w-full overflow-visible">
          <Button variant="ghost" onClick={onClose}>סגור</Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleDownload} disabled={!hasActivity}><Download size={14} /> הורד PDF</Button>
            <div className="relative group">
              <Button loading={sending} onClick={handleSend} disabled={!accountantEmail || !hasActivity}>
                <Send size={14} /> שלח במייל
              </Button>
              {!accountantEmail && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  יש להזין אימייל רואה חשבון בהגדרות
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                </div>
              )}
            </div>
          </div>
        </div>
      }
    >
      <div className="flex gap-3 mb-4 overflow-x-auto">
        <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="px-3 py-2 border rounded-lg text-sm">
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="px-3 py-2 border rounded-lg text-sm">
          {Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i).map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="text-xs text-slate-400 self-center">{VAT_STATUS_LABELS[vatStatus]}</span>
      </div>

      {!hasActivity ? (
        <p className="text-center text-slate-400 py-12">אין פעילות לחודש זה</p>
      ) : (
        <div className="border rounded-xl p-4 bg-white overflow-y-auto max-h-[60vh]">
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            {logoDataUri && <img src={logoDataUri} alt="" className="max-h-16 mx-auto mb-2" />}
            <h2 className="text-lg font-bold">{businessName || "עצמאי"}</h2>
            <p className="text-xs text-slate-500">{VAT_STATUS_LABELS[vatStatus]}{vatNumber ? ` · ע.מ: ${vatNumber}` : ""}</p>
            {(businessAddress || businessPhone) && (
              <p className="text-xs text-slate-500">{businessAddress}{businessPhone ? ` | ${businessPhone}` : ""}</p>
            )}
          </div>

          {report.incomeTotal > 0 && (
            <div className="mb-3">
              <div className="flex justify-between items-center border-b pb-1 mb-2">
                <h3 className="text-sm font-bold">{exempt ? "הכנסות" : 'הכנסות (כולל מע"מ)'}</h3>
                <span className="text-sm font-bold text-emerald-600">{formatCurrency(report.incomeTotal)}</span>
              </div>
              {report.incomeItems.map((i) => (
                <div key={i.id} className="flex justify-between items-center py-1.5 border-b border-slate-50 text-sm">
                  <span className="truncate">{i.description} <span className="text-xs text-slate-400">{fmtDate(i.date)}</span></span>
                  <span className="font-bold ml-2 shrink-0">{formatCurrency(Number(i.amount))}</span>
                </div>
              ))}
            </div>
          )}

          {report.expenseTotal > 0 && (
            <div className="mb-3">
              <div className="flex justify-between items-center border-b pb-1 mb-2">
                <h3 className="text-sm font-bold">הוצאות</h3>
                <span className="text-sm font-bold text-rose-600">{formatCurrency(report.expenseTotal)}</span>
              </div>
              {report.expenseGroups.map((g) => (
                <div key={g.category} className="mb-3">
                  <h4 className="text-xs font-semibold text-slate-600 mb-1">{g.label}</h4>
                  {g.items.map((e) => (
                    <div key={e.id} className="flex justify-between items-center py-1.5 border-b border-slate-50 text-sm">
                      <span className="truncate">{e.description} <span className="text-xs text-slate-400">{fmtDate(e.date)}</span></span>
                      <span className="font-bold ml-2 shrink-0">{formatCurrency(Number(e.amount))}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs font-semibold text-slate-500 mt-1">
                    <span>סה״כ {g.label}</span><span>{formatCurrency(g.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {report.savingsTotal > 0 && (
            <div className="mb-3">
              <div className="flex justify-between items-center border-b pb-1 mb-2">
                <h3 className="text-sm font-bold">חסכונות והפרשות</h3>
                <span className="text-sm font-bold text-indigo-600">{formatCurrency(report.savingsTotal)}</span>
              </div>
              {report.savingsItems.map((s) => (
                <div key={s.id} className="flex justify-between items-center py-1.5 border-b border-slate-50 text-sm">
                  <span className="truncate">{s.fund_type} <span className="text-xs text-slate-400">{fmtDate(s.date)}</span></span>
                  <span className="font-bold ml-2 shrink-0">{formatCurrency(Number(s.amount))}</span>
                </div>
              ))}
            </div>
          )}

          {(openDemands.length > 0 || pendingScanPayments.length > 0) && (
            <div className="mb-3 border border-dashed border-slate-300 rounded-lg p-3 bg-slate-50">
              <h3 className="text-xs font-bold text-slate-600 mb-2">מסמכים פתוחים (לא נכללים בסכומים לעיל)</h3>
              {openDemands.map((inv) => (
                <div key={inv.id} className="flex justify-between items-center py-1 text-sm text-slate-600">
                  <span>חשבונית עסקה {inv.invoice_number} <span className="text-xs text-slate-400">{fmtDate(inv.issue_date)}</span></span>
                  <span className="shrink-0">{formatCurrency(Number(inv.amount))}</span>
                </div>
              ))}
              {pendingScanPayments.map((d) => (
                <div key={d.id} className="flex justify-between items-center py-1 text-sm text-slate-600">
                  <span>ממתין לתשלום: {d.title} <span className="text-xs text-slate-400">{fmtDate(d.date_on_doc || d.date.split("T")[0])}</span></span>
                  <span className="shrink-0">{formatCurrency(Number(d.total_amount || 0))}</span>
                </div>
              ))}
            </div>
          )}

          {(() => {
            const taxRows: { label: string; value: number }[] = [];
            if (!exempt && report.tax.vat !== 0) taxRows.push({ label: "מע״מ (שנגבה)", value: report.tax.vat });
            if (report.tax.incomeTax > 0) taxRows.push({ label: "מס הכנסה (מוערך)", value: report.tax.incomeTax });
            if (report.tax.bituahLeumi > 0) taxRows.push({ label: "ביטוח לאומי (מוערך)", value: report.tax.bituahLeumi });
            if (report.tax.creditValue > 0) taxRows.push({ label: "נקודות זיכוי", value: -report.tax.creditValue });
            if (report.tax.taxAdvancesPaid > 0) taxRows.push({ label: "מקדמות ששולמו", value: -report.tax.taxAdvancesPaid });
            if (report.tax.balanceDue !== 0) taxRows.push({ label: "מאזן מס לתשלום", value: report.tax.balanceDue });
            if (taxRows.length === 0) return null;
            return (
              <div className="mb-3">
                <div className="flex justify-between items-center border-b pb-1 mb-2">
                  <h3 className="text-sm font-bold">מיסים</h3>
                  <span className="text-sm font-bold text-slate-800">{formatCurrency(report.tax.totalTax)}</span>
                </div>
                {taxRows.map((r) => (
                  <div key={r.label} className={`flex justify-between py-1.5 text-sm ${r.value < 0 ? "text-rose-600" : ""}`}>
                    <span>{r.label}</span><span>{formatCurrency(r.value)}</span>
                  </div>
                ))}
              </div>
            );
          })()}

          <div className="border-t-2 border-slate-800 pt-2 mt-3 space-y-1">
            {sumRow(deductibleLabel, report.tax.dedExpenses)}
            {sumRow("רווח לפני מס", report.tax.netProfit)}
            {report.tax.totalTax !== 0 && sumRow("מיסים", report.tax.totalTax)}
            {sumRow("רווח אחרי מס", report.tax.netIncome, "text-teal-700")}
            {report.tax.taxAdvancesPaid > 0 && sumRow("מקדמות ששולמו", -report.tax.taxAdvancesPaid)}
            {report.tax.balanceDue !== 0 && sumRow(report.tax.balanceDue > 0 ? "יתרת מס לתשלום" : "יתרה לזיכוי", report.tax.balanceDue, "text-teal-700")}
          </div>
        </div>
      )}

      <Modal open={confirmSend} onClose={() => setConfirmSend(false)} title="שליחת דוח" size="sm"
        footer={
          <div className="flex gap-2 justify-between w-full">
            <Button variant="ghost" onClick={() => setConfirmSend(false)}>ביטול</Button>
            <Button loading={sending} onClick={doSend}><Send size={14} /> שלח</Button>
          </div>
        }
      >
        <div className="flex items-center gap-3 p-2">
          <Mail size={24} className="text-blue-500 shrink-0" />
          <div>
            <p className="text-sm text-slate-700">הדוח החודשי ישלח אל:</p>
            <p className="text-sm font-bold text-slate-800">{accountantEmail}</p>
          </div>
        </div>
      </Modal>
    </Modal>
  );
}
