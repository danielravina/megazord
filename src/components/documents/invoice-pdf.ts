import type { Invoice } from "./invoice-types";
import { DOC_TYPE_META, PAYMENT_METHOD_LABELS } from "./invoice-types";
import type { Customer } from "@/components/customers/customer-types";
import type { TaxSettings } from "@/components/finance/finance-types";
import { escapeHtml } from "@/components/shared/escape-html";
import { formatCurrency } from "@/components/shared/format-currency";
import { computeLineTotals, effectiveLineVatRate, lineVatBreakdown } from "./invoice-utils";

const fmtDate = (d?: string | null) => (d ? d.split("-").reverse().join("/") : "-");

const EXEMPT_CLAUSE = 'עוסק פטור — חשבונית זו אינה כוללת מע"מ';

// Document branding images, resolved by the caller as data URIs so they
// render reliably inside html2canvas (no CORS / expiry issues).
export interface InvoiceBranding {
  coverDataUri?: string | null;
  logoDataUri?: string | null;
}

function paymentMethodLabel(method: string, methodOther?: string | null): string {
  const base = PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS] || method;
  if (method === "other" && methodOther) return `${base}: ${methodOther}`;
  return base;
}

// Receipt payments table: one row per payment (method / date / bank / branch /
// account / amount) with the total of all rows below the table.
function paymentsTableHtml(invoice: Invoice): string {
  const payments = invoice.payments || [];
  const rows = payments
    .map((p) => {
      return `
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:6px 8px;font-size:12px;text-align:right;">${escapeHtml(paymentMethodLabel(p.method, p.method_other))}</td>
          <td style="padding:6px 8px;font-size:12px;text-align:center;">${fmtDate(p.date)}</td>
          <td style="padding:6px 8px;font-size:12px;text-align:right;">${escapeHtml(p.bank_name || "—")}</td>
          <td style="padding:6px 8px;font-size:12px;text-align:center;">${escapeHtml(p.bank_branch || "—")}</td>
          <td style="padding:6px 8px;font-size:12px;text-align:left;">${escapeHtml(p.bank_account || "—")}</td>
          <td style="padding:6px 8px;font-size:12px;text-align:left;">${formatCurrency(Number(p.amount) || 0)}</td>
        </tr>`;
    })
    .join("");
  const paidTotal = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  return `
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f8fafc;font-size:11px;color:#475569;">
          <th style="padding:6px 8px;text-align:right;">אמצעי תשלום</th>
          <th style="padding:6px 8px;text-align:center;">תאריך</th>
          <th style="padding:6px 8px;text-align:right;">בנק</th>
          <th style="padding:6px 8px;text-align:center;">סניף</th>
          <th style="padding:6px 8px;text-align:left;">מס' חשבון</th>
          <th style="padding:6px 8px;text-align:left;">סכום</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="6" style="padding:6px 8px;text-align:center;color:#94a3b8;font-size:12px;">—</td></tr>`}
      </tbody>
      <tfoot>
        <tr style="border-top:2px solid #1e293b;">
          <td colspan="5" style="padding:8px;text-align:left;font-size:13px;font-weight:700;">סה"כ שולם</td>
          <td style="padding:8px;text-align:left;font-size:13px;font-weight:700;">${formatCurrency(paidTotal)}</td>
        </tr>
      </tfoot>
    </table>`;
}

// Framed section with a title bar (used for the חשבונית מס / קבלה parts)
function sectionCard(title: string, number: string | null, body: string): string {
  return `
    <div style="margin-top:16px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
      <div style="display:flex;justify-content:space-between;align-items:center;background:#f1f5f9;padding:8px 12px;">
        <span style="font-weight:700;font-size:13px;color:#1e293b;">${escapeHtml(title)}</span>
        ${number ? `<span style="font-size:12px;color:#64748b;">מס' ${escapeHtml(number)}</span>` : ""}
      </div>
      <div style="padding:12px;">${body}</div>
    </div>`;
}

// Pure HTML string with inline styles (no Tailwind / oklch colors) for PDF capture
export function buildInvoiceHtml(
  invoice: Invoice,
  customer: Customer | null,
  settings: TaxSettings | null,
  maxWidth = "700px",
  branding?: InvoiceBranding,
): string {
  const items = invoice.items || [];
  const isExempt = invoice.vat_rate === 0;
  const meta = DOC_TYPE_META[invoice.document_type];
  const title = meta?.label || DOC_TYPE_META.tax_invoice.label;
  const isCredit = invoice.document_type === "credit_invoice";
  const isInformational = invoice.document_type === "quotation" || invoice.document_type === "delivery_note";
  const isReceipt = invoice.document_type === "receipt";
  const isCombined = invoice.document_type === "tax_invoice_receipt";
  const breakdownMode = meta?.vatMode === "breakdown";
  // VAT columns / standalone VAT line appear only for breakdown documents that charge VAT
  const vatBreakdown = breakdownMode && !isExempt;
  const sign = isCredit ? -1 : 1;

  const cover = branding?.coverDataUri
    ? `<img src="${branding.coverDataUri}" alt="" style="width:100%;height:130px;object-fit:cover;display:block;border-radius:8px;margin-bottom:16px;" />`
    : "";
  const logo = branding?.logoDataUri
    ? `<img src="${branding.logoDataUri}" alt="לוגו" style="max-height:60px;max-width:140px;object-fit:contain;" />`
    : "";

  const rows = items
    .map((it) => {
      const lineRate = effectiveLineVatRate(it, invoice.vat_rate);
      const bd = lineVatBreakdown(it, lineRate);
      const isExemptLine = (lineRate || 0) === 0;
      const rateCell = vatBreakdown
        ? `<td style="padding:8px;text-align:left;font-size:12px;">${isExemptLine ? "0%" : `${lineRate}%`}</td>`
        : "";
      const vatCell = vatBreakdown
        ? `<td style="padding:8px;text-align:left;font-size:12px;${isExemptLine ? "color:#94a3b8;" : ""}">${isExemptLine ? "—" : formatCurrency(isCredit ? -bd.vat : bd.vat)}</td>`
        : "";
      const grossCell = vatBreakdown
        ? formatCurrency(isCredit ? -bd.gross : bd.gross)
        : formatCurrency(isCredit ? -bd.net : bd.net);
      return `
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:8px;text-align:right;font-size:12px;">${escapeHtml(it.description)}</td>
          <td style="padding:8px;text-align:center;font-size:12px;">${it.quantity}</td>
          <td style="padding:8px;text-align:left;font-size:12px;">${formatCurrency(it.unit_price)}</td>
          ${rateCell}
          ${vatCell}
          <td style="padding:8px;text-align:left;font-size:12px;font-weight:600;">${grossCell}</td>
        </tr>`;
    })
    .join("");

  const itemCols = vatBreakdown ? 6 : 4;
  const itemsTable = `
    <table style="width:100%;margin-top:16px;border-collapse:collapse;">
      <thead>
        <tr style="background:#f1f5f9;font-size:11px;color:#475569;">
          <th style="padding:8px;text-align:right;">תיאור</th>
          <th style="padding:8px;text-align:center;">כמות</th>
          <th style="padding:8px;text-align:left;">מחיר ליחידה</th>
          ${vatBreakdown ? `<th style="padding:8px;text-align:left;">שיעור מע"מ</th>` : ""}
          ${vatBreakdown ? `<th style="padding:8px;text-align:left;">מע"מ</th>` : ""}
          <th style="padding:8px;text-align:left;">סה"כ</th>
        </tr>
      </thead>
      <tbody>
        ${items.length ? rows : `<tr><td colspan="${itemCols}" style="padding:8px;text-align:center;color:#94a3b8;font-size:12px;">אין פריטים</td></tr>`}
      </tbody>
    </table>`;

  // ── Totals block ────────────────────────────────────────────────
  const grossSum = items.reduce((s, it) => s + lineVatBreakdown(it, effectiveLineVatRate(it, invoice.vat_rate)).gross, 0);
  const lineTotals = computeLineTotals(items, invoice.vat_rate);
  const totalLabel = isCredit ? 'סה"כ זיכוי' : isInformational ? (invoice.document_type === "quotation" ? 'סה"כ להצעה' : 'סה"כ פריטים') : 'סה"כ לתשלום';

  let totalBlock: string;
  if (isInformational) {
    // Quotation / delivery note: no "payable now" — informational total only.
    totalBlock = `
      <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700;padding:8px 0;border-top:2px solid #1e293b;">
        <span>${totalLabel}</span>
        <span>${formatCurrency(sign * grossSum)}</span>
      </div>
    `;
  } else if (vatBreakdown) {
    // VAT-charging documents: VAT on its own line before the total.
    totalBlock = `
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#475569;padding:3px 0;">
        <span>סה"כ לפני מע"מ</span>
        <span>${formatCurrency(sign * lineTotals.subtotal)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#475569;padding:3px 0;">
        <span>מע"מ (${invoice.vat_rate}%)</span>
        <span>${formatCurrency(sign * lineTotals.vat)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700;padding:8px 0;border-top:2px solid #1e293b;">
        <span>${totalLabel}</span>
        <span>${formatCurrency(sign * lineTotals.total)}</span>
      </div>
    `;
  } else {
    // Receipt / exempt documents: single total, no VAT lines.
    totalBlock = `
      <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700;padding:8px 0;border-top:2px solid #1e293b;">
        <span>${totalLabel}</span>
        <span>${formatCurrency(sign * grossSum)}</span>
      </div>
      ${isExempt && breakdownMode ? `<p style="font-size:11px;color:#64748b;margin:6px 0;line-height:1.5;">${EXEMPT_CLAUSE}</p>` : ""}
    `;
  }
  const totalsWrapper = `
    <div style="margin-top:16px;display:flex;justify-content:flex-end;">
      <div style="width:260px;">
        ${totalBlock}
      </div>
    </div>`;

  const customerBlock = `
    <div style="margin-top:16px;padding:12px;background:#f8fafc;border-radius:8px;">
      <p style="font-size:11px;font-weight:700;color:#64748b;margin:0 0 4px;">${invoice.document_type === "quotation" ? "ההצעה מיועדת ל:" : "הוגש ל:"}</p>
      <p style="font-size:14px;font-weight:600;margin:0;">${customer ? escapeHtml(customer.name) : "-"}</p>
      ${customer?.company ? `<p style="font-size:12px;margin:2px 0;">${escapeHtml(customer.company)}</p>` : ""}
      ${customer?.vat_number ? `<p style="font-size:12px;margin:2px 0;">ע.מ: ${escapeHtml(customer.vat_number)}</p>` : ""}
      ${customer?.address ? `<p style="font-size:12px;margin:2px 0;">${escapeHtml(customer.address)}</p>` : ""}
    </div>`;

  const transactionNotice = invoice.document_type === "transaction_account"
    ? `<p style="font-size:12px;color:#64748b;margin:10px 0 0;line-height:1.6;">זוהי דרישת תשלום עבור העסקה שבוצעה. אין חובת דיווח לרשויות המס בגין מסמך זה — עם קבלת התשלום תונפק חשבונית המס הסופית.</p>`
    : "";

  // ── Document body per type ──────────────────────────────────────
  let body: string;
  if (isCombined) {
    // Two framed sections, same unified number on both.
    body = `
      ${customerBlock}
      ${sectionCard("חשבונית מס", invoice.invoice_number, itemsTable + totalsWrapper)}
      ${sectionCard("קבלה", invoice.invoice_number, paymentsTableHtml(invoice))}`;
  } else if (isReceipt) {
    body = `
      ${customerBlock}
      ${itemsTable}
      ${totalsWrapper}
      <div style="margin-top:16px;">${paymentsTableHtml(invoice)}</div>`;
  } else {
    body = `
      ${customerBlock}
      ${itemsTable}
      ${totalsWrapper}`;
  }

  return `
  <div dir="rtl" style="font-family:Arial,'Heebo',sans-serif;color:#1e293b;padding:24px;background:#fff;max-width:${maxWidth};overflow:hidden;">
    ${cover}
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;border-bottom:2px solid #1e293b;padding-bottom:12px;">
      <div>
        <h1 style="font-size:22px;margin:0;font-weight:700;">${escapeHtml(settings?.business_name || "עצמאי")}</h1>
        ${settings?.vat_number ? `<p style="font-size:12px;margin:4px 0;">ע.מ: ${escapeHtml(settings.vat_number)}</p>` : ""}
        ${settings?.business_address ? `<p style="font-size:12px;margin:2px 0;">${escapeHtml(settings.business_address)}</p>` : ""}
        ${settings?.business_phone ? `<p style="font-size:12px;margin:2px 0;">טל: ${escapeHtml(settings.business_phone)}</p>` : ""}
        ${settings?.business_email ? `<p style="font-size:12px;margin:2px 0;">אימייל: ${escapeHtml(settings.business_email)}</p>` : ""}
      </div>
      <div style="text-align:center;">
        <h2 style="font-size:18px;margin:0;font-weight:700;">${escapeHtml(title)}</h2>
        <p style="font-size:13px;margin:6px 0 2px;">מספר: ${escapeHtml(invoice.invoice_number)}</p>
        <p style="font-size:12px;margin:2px 0;">תאריך: ${fmtDate(invoice.issue_date)}</p>
        ${invoice.due_date ? `<p style="font-size:12px;margin:2px 0;">יעד לתשלום: ${fmtDate(invoice.due_date)}</p>` : ""}
      </div>
      ${logo}
    </div>

    ${transactionNotice}
    ${body}

    ${
      invoice.notes
        ? `<p style="font-size:11px;color:#64748b;margin-top:16px;border-top:1px solid #e2e8f0;padding-top:8px;">הערות: ${escapeHtml(invoice.notes)}</p>`
        : ""
    }
  </div>`;
}

// Render the HTML to a PDF (client-side html2pdf), return a Blob for sharing / files
export async function generateInvoicePdfBlob(html: string): Promise<Blob> {
  const html2pdf = (await import("html2pdf.js")).default;
  const el = document.createElement("div");
  el.innerHTML = html;
  el.style.width = "700px";
  document.body.appendChild(el);
  await new Promise((r) => setTimeout(r, 100));
  try {
    const buffer = await html2pdf()
      .set({
        margin: 10,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(el.firstElementChild as HTMLElement)
      .outputPdf("arraybuffer");
    return new Blob([buffer], { type: "application/pdf" });
  } finally {
    document.body.removeChild(el);
  }
}

// Render the HTML to a PDF (client-side html2pdf), return raw base64 for emailing
export async function generateInvoicePdfBase64(html: string): Promise<string> {
  const html2pdf = (await import("html2pdf.js")).default;
  const el = document.createElement("div");
  el.innerHTML = html;
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