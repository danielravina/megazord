"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { formatCurrency } from "@/components/shared/format-currency";
import { buildMonthlyReport, escapeHtml } from "@/components/scans/monthly-report-utils";
import type { Income, Expense, Saving, TaxSettings } from "@/components/finance/finance-types";
import { Download, Send, Mail } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  incomes: Income[];
  expenses: Expense[];
  savings: Saving[];
  taxSettings: TaxSettings | null;
  businessName: string;
  vatNumber: string;
  businessAddress: string;
  businessPhone: string;
  accountantEmail: string;
  supabaseUrl: string;
  supabaseKey: string;
}

const MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

const fmtDate = (d: string) => d.split("-").reverse().join("/");

export function MonthlyExport({ open, onClose, incomes, expenses, savings, taxSettings, businessName, vatNumber, businessAddress, businessPhone, accountantEmail, supabaseUrl, supabaseKey }: Props) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [sending, setSending] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);

  const report = buildMonthlyReport(incomes, expenses, savings, taxSettings, month, year);
  const hasActivity = report.incomeTotal > 0 || report.expenseTotal > 0 || report.savingsTotal > 0;

  function buildPdfHtml(): string {
    const row = (label: string, date: string, amount: number) => `
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:12px;color:#1e293b">
        <span>${label} <span style="color:#94a3b8;font-size:10px">${date}</span></span>
        <span style="font-weight:600">${formatCurrency(amount)}</span>
      </div>
    `;
    const sectionTitle = (title: string, total: number) => `
      <div style="display:flex;justify-content:space-between;margin-top:16px;border-bottom:1px solid #e2e8f0;padding-bottom:4px">
        <span style="font-size:14px;font-weight:700;color:#334155">${title}</span>
        <span style="font-size:14px;font-weight:700;color:#334155">${formatCurrency(total)}</span>
      </div>
    `;

    const incomeSection = report.incomeTotal > 0
      ? `
        ${sectionTitle("הכנסות", report.incomeTotal)}
        ${report.incomeItems.map((i) => row(escapeHtml(i.description), fmtDate(i.date), Number(i.amount))).join("")}
      `
      : "";

    const expenseSection = report.expenseTotal > 0
      ? `
        ${sectionTitle("הוצאות", report.expenseTotal)}
        ${report.expenseGroups.map((g) => `
          <div style="margin-top:12px">
            <h4 style="font-size:13px;font-weight:600;color:#475569;margin:0">${escapeHtml(g.label)}</h4>
            ${g.items.map((e) => row(escapeHtml(e.description), fmtDate(e.date), Number(e.amount))).join("")}
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
        ${report.savingsItems.map((s) => row(escapeHtml(s.fund_type), fmtDate(s.date), Number(s.amount))).join("")}
      `
      : "";

    const taxSection = report.tax.totalTax > 0 || report.incomeTotal > 0
      ? `
        ${sectionTitle("מיסים", report.tax.totalTax)}
        ${report.tax.vat > 0 ? row('מע"מ', "", report.tax.vat) : ""}
        ${report.tax.incomeTax > 0 ? row("מקדמת מס הכנסה", "", report.tax.incomeTax) : ""}
        ${report.tax.bituahLeumi > 0 ? row("ביטוח לאומי", "", report.tax.bituahLeumi) : ""}
        ${report.tax.creditValue > 0 ? row("נקודות זיכוי", "", -report.tax.creditValue) : ""}
      `
      : "";

    return `
      <div style="font-family:Arial;direction:rtl;color:#1e293b;padding:8px;background:#fff;max-width:700px;overflow:hidden">
        <div style="text-align:center;margin-bottom:20px">
          <h1 style="font-size:22px;margin:0;color:#1e293b">${escapeHtml(businessName || "עצמאי")}</h1>
          ${vatNumber ? `<p style="margin:4px 0;font-size:12px;color:#64748b">ע.מ: ${escapeHtml(vatNumber)}</p>` : ""}
          ${businessAddress ? `<p style="margin:4px 0;font-size:12px;color:#64748b">${escapeHtml(businessAddress)} ${businessPhone ? `| ${escapeHtml(businessPhone)}` : ""}</p>` : ""}
          <h2 style="font-size:16px;margin-top:12px;color:#1e293b">דוח חודשי - ${MONTHS[month]} ${year}</h2>
        </div>
        ${incomeSection}
        ${expenseSection}
        ${savingsSection}
        ${taxSection}
        <div style="border-top:2px solid #1e293b;padding-top:8px;margin-top:16px;display:flex;justify-content:space-between;font-weight:700;font-size:14px">
          <span>רווח לפני מס</span><span>${formatCurrency(report.netBeforeTax)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding-top:4px;font-weight:700;font-size:14px;color:#0f766e">
          <span>רווח אחרי מס</span><span>${formatCurrency(report.netAfterTax)}</span>
        </div>
      </div>`;
  }

  async function generatePDFBase64(): Promise<string> {
    const html2pdf = (await import("html2pdf.js")).default;
    const el = document.createElement("div");
    el.innerHTML = buildPdfHtml();
    el.style.width = "700px";
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 100));
    try {
      const canvas = await html2pdf()
        .set({
          margin: 10,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(el.firstElementChild as HTMLElement)
        .outputPdf("arraybuffer");
      const bytes = new Uint8Array(canvas);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    } finally {
      document.body.removeChild(el);
    }
  }

  async function handleDownload() {
    const html2pdf = (await import("html2pdf.js")).default;
    const el = document.createElement("div");
    el.innerHTML = buildPdfHtml();
    el.style.width = "700px";
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 100));
    try {
      await html2pdf()
        .set({
          margin: 10,
          filename: `דוח-חודשי-${MONTHS[month]}-${year}.pdf`,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(el.firstElementChild as HTMLElement)
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
            <tr><td style="padding:6px 0">הכנסות</td><td style="text-align:left;font-weight:700">${formatCurrency(report.incomeTotal)}</td></tr>
            <tr><td style="padding:6px 0">הוצאות</td><td style="text-align:left;font-weight:700">${formatCurrency(report.expenseTotal)}</td></tr>
            <tr><td style="padding:6px 0">רווח לפני מס</td><td style="text-align:left;font-weight:700">${formatCurrency(report.netBeforeTax)}</td></tr>
            <tr><td style="padding:6px 0">רווח אחרי מס</td><td style="text-align:left;font-weight:700">${formatCurrency(report.netAfterTax)}</td></tr>
          </table>
          <hr/>
          <p><strong>${escapeHtml(businessName || "עצמאי")}</strong></p>
          ${vatNumber ? `<p>ע.מ: ${escapeHtml(vatNumber)}</p>` : ""}
          ${businessAddress ? `<p>${escapeHtml(businessAddress)}</p>` : ""}
          ${businessPhone ? `<p>טל: ${escapeHtml(businessPhone)}</p>` : ""}
        </div>`;

      const res = await fetch(`${supabaseUrl}/functions/v1/send-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
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
                  יש להזין אימייל רואה חשבון בהעדפות
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
      </div>

      {!hasActivity ? (
        <p className="text-center text-slate-400 py-12">אין פעילות לחודש זה</p>
      ) : (
        <div className="border rounded-xl p-4 bg-white overflow-y-auto max-h-[50vh]">
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <h2 className="text-lg font-bold">{businessName || "עצמאי"}</h2>
            {vatNumber && <p className="text-xs text-slate-500">ע.מ: {vatNumber}</p>}
            {businessAddress && <p className="text-xs text-slate-500">{businessAddress} {businessPhone ? `| ${businessPhone}` : ""}</p>}
          </div>

          {report.incomeTotal > 0 && (
            <div className="mb-3">
              <div className="flex justify-between items-center border-b pb-1 mb-2">
                <h3 className="text-sm font-bold">הכנסות</h3>
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

          {(report.tax.totalTax > 0 || report.incomeTotal > 0) && (
            <div className="mb-3">
              <div className="flex justify-between items-center border-b pb-1 mb-2">
                <h3 className="text-sm font-bold">מיסים</h3>
                <span className="text-sm font-bold text-slate-800">{formatCurrency(report.tax.totalTax)}</span>
              </div>
              {report.tax.vat > 0 && (
                <div className="flex justify-between py-1.5 text-sm"><span>מע״מ</span><span>{formatCurrency(report.tax.vat)}</span></div>
              )}
              {report.tax.incomeTax > 0 && (
                <div className="flex justify-between py-1.5 text-sm"><span>מקדמת מס הכנסה</span><span>{formatCurrency(report.tax.incomeTax)}</span></div>
              )}
              {report.tax.bituahLeumi > 0 && (
                <div className="flex justify-between py-1.5 text-sm"><span>ביטוח לאומי</span><span>{formatCurrency(report.tax.bituahLeumi)}</span></div>
              )}
              {report.tax.creditValue > 0 && (
                <div className="flex justify-between py-1.5 text-sm"><span>נקודות זיכוי</span><span>-{formatCurrency(report.tax.creditValue)}</span></div>
              )}
            </div>
          )}

          <div className="border-t-2 border-slate-800 pt-2 mt-3 space-y-1">
            {sumRow("רווח לפני מס", report.netBeforeTax)}
            {sumRow("רווח אחרי מס", report.netAfterTax, "text-teal-700")}
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
