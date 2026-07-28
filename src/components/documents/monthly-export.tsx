"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { formatCurrency } from "@/components/shared/format-currency";
import { Download, Send, FileText } from "lucide-react";

interface Doc {
  id: string;
  title: string;
  date_on_doc: string | null;
  total_amount: number | null;
  folder: string | null;
  doc_type: string;
  date: string;
}

const FOLDERS = [
  { id: "Bank", name: "בנק" },
  { id: "VAT", name: 'מע"מ' },
  { id: "Income Tax", name: "מס הכנסה" },
  { id: "National Insurance", name: "ביטוח לאומי" },
  { id: "Accountant", name: "רואה חשבון" },
  { id: "Suppliers", name: "ספקים" },
  { id: "Employees", name: "עובדים" },
  { id: "Other", name: "אחר" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  docs: Doc[];
  businessName: string;
  vatNumber: string;
  businessAddress: string;
  businessPhone: string;
  accountantEmail: string;
  supabaseUrl: string;
  supabaseKey: string;
}

const MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

export function MonthlyExport({ open, onClose, docs, businessName, vatNumber, businessAddress, businessPhone, accountantEmail, supabaseUrl, supabaseKey }: Props) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [year, setYear] = useState(today.getFullYear());
  const [sending, setSending] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const filteredDocs = docs.filter((d) => {
    const dateStr = d.date_on_doc || d.date.split("T")[0];
    const [y, m] = dateStr.split("-").map(Number);
    return y === year && (m - 1) === month;
  }).sort((a, b) => {
    const da = a.date_on_doc || a.date.split("T")[0];
    const db = b.date_on_doc || b.date.split("T")[0];
    return da.localeCompare(db);
  });

  const grouped = FOLDERS.map((f) => ({
    ...f,
    docs: filteredDocs.filter((d) => d.folder === f.id),
    total: filteredDocs.filter((d) => d.folder === f.id).reduce((s, d) => s + (d.total_amount || 0), 0),
  })).filter((g) => g.docs.length > 0);

  const grandTotal = filteredDocs.reduce((s, d) => s + (d.total_amount || 0), 0);

  async function generatePDFBase64(): Promise<string> {
    if (!previewRef.current) return "";
    const html2pdf = (await import("html2pdf.js")).default;
    const canvas = await html2pdf().set({
      margin: 10,
      filename: `דוח-חודשי-${MONTHS[month]}-${year}.pdf`,
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    }).from(previewRef.current).outputPdf("arraybuffer");

    const bytes = new Uint8Array(canvas);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  async function handleDownload() {
    const base64 = await generatePDFBase64();
    if (!base64) return;
    const link = document.createElement("a");
    link.href = `data:application/pdf;base64,${base64}`;
    link.download = `דוח-חודשי-${MONTHS[month]}-${year}.pdf`;
    link.click();
  }

  async function handleSend() {
    if (!accountantEmail) return;
    setSending(true);
    try {
      const base64 = await generatePDFBase64();
      if (!base64) return;

      const htmlBody = `
        <div dir="rtl" style="font-family: Arial; max-width:600px">
          <h2>דוח חודשי - ${MONTHS[month]} ${year}</h2>
          <p>שלום,</p>
          <p>מצורף דוח חודשי לחודש ${MONTHS[month]} ${year}.</p>
          <hr/>
          <p><strong>${businessName || "עצמאי"}</strong></p>
          ${vatNumber ? `<p>ע.מ: ${vatNumber}</p>` : ""}
          ${businessAddress ? `<p>${businessAddress}</p>` : ""}
          ${businessPhone ? `<p>טל: ${businessPhone}</p>` : ""}
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

  return (
    <Modal open={open} onClose={onClose} title={`דוח חודשי - ${MONTHS[month]} ${year}`} size="full"
      footer={
        <div className="flex gap-2 justify-between w-full overflow-visible">
          <Button variant="ghost" onClick={onClose}>סגור</Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleDownload}><Download size={14} /> הורד PDF</Button>
            <div className="relative group">
              <Button loading={sending} onClick={handleSend} disabled={!accountantEmail}>
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

      {filteredDocs.length === 0 ? (
        <p className="text-center text-slate-400 py-12">אין מסמכים לחודש זה</p>
      ) : (
        <>
          {/* Off-screen preview for PDF generation */}
          <div ref={previewRef} className="absolute opacity-0 pointer-events-none" style={{ fontFamily: "Arial", direction: "rtl", width: "210mm" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <h1 style={{ fontSize: 22, margin: 0 }}>{businessName || "עצמאי"}</h1>
              {vatNumber && <p style={{ margin: "4px 0", color: "#666" }}>ע.מ: {vatNumber}</p>}
              {businessAddress && <p style={{ margin: "4px 0", color: "#666" }}>{businessAddress} {businessPhone ? `| ${businessPhone}` : ""}</p>}
              <h2 style={{ fontSize: 16, marginTop: 12 }}>דוח חודשי - {MONTHS[month]} {year}</h2>
            </div>

            {grouped.map((g) => (
              <div key={g.id} style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, borderBottom: "1px solid #e2e8f0", paddingBottom: 4 }}>{g.name}</h3>
                {g.docs.map((doc) => (
                  <div key={doc.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f1f5f9", fontSize: 12 }}>
                    <span>{doc.title} <span style={{ color: "#94a3b8", fontSize: 10 }}>{doc.date_on_doc?.split("-").reverse().join("/") || "-"}</span></span>
                    <span style={{ fontWeight: 600 }}>{doc.total_amount ? formatCurrency(doc.total_amount) : "-"}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontWeight: 600, fontSize: 12, color: "#475569" }}>
                  <span>סה״כ {g.name}</span><span>{formatCurrency(g.total)}</span>
                </div>
              </div>
            ))}

            <div style={{ borderTop: "2px solid #334155", paddingTop: 8, marginTop: 12, display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 14 }}>
              <span>סה״כ</span><span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          {/* Live preview */}
          <div className="border rounded-xl p-4 bg-white overflow-y-auto" style={{ maxHeight: "calc(50vh - 100px)" }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <h2 className="text-lg font-bold">{businessName || "עצמאי"}</h2>
              {vatNumber && <p className="text-xs text-slate-500">ע.מ: {vatNumber}</p>}
              {businessAddress && <p className="text-xs text-slate-500">{businessAddress} {businessPhone ? `| ${businessPhone}` : ""}</p>}
            </div>

            {grouped.map((g) => (
              <div key={g.id} className="mb-3">
                <h3 className="text-sm font-bold border-b pb-1 mb-2">{g.name}</h3>
                {g.docs.map((doc) => (
                  <div key={doc.id} className="flex justify-between items-center py-1.5 border-b border-slate-50 text-sm">
                    <span className="truncate">{doc.title} <span className="text-xs text-slate-400">{doc.date_on_doc?.split("-").reverse().join("/") || "-"}</span></span>
                    <span className="font-bold ml-2 shrink-0">{doc.total_amount ? formatCurrency(doc.total_amount) : "-"}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs font-semibold text-slate-600 mt-1">
                  <span>סה״כ {g.name}</span><span>{formatCurrency(g.total)}</span>
                </div>
              </div>
            ))}

            <div className="border-t-2 border-slate-800 pt-2 mt-3 flex justify-between font-bold">
              <span>סה״כ</span><span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          {accountantEmail && (
            <p className="text-xs text-slate-400 text-center">ישלח אל: {accountantEmail}</p>
          )}
          {!accountantEmail && (
            <p className="text-xs text-amber-600 text-center">יש להזין אימייל רואה חשבון בהעדפות כדי לשלוח במייל</p>
          )}
        </>
      )}
    </Modal>
  );
}
