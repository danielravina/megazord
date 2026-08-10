import type { Invoice } from "./invoice-types";
import type { Customer } from "@/components/customers/customer-types";
import type { TaxSettings } from "@/components/finance/finance-types";
import { escapeHtml } from "@/components/shared/escape-html";
import { formatCurrency } from "@/components/shared/format-currency";
import { computeTotals, lineTotal } from "./invoice-utils";

const fmtDate = (d?: string | null) => (d ? d.split("-").reverse().join("/") : "-");

// Pure HTML string with inline styles (no Tailwind / oklch colors) for PDF capture
export function buildInvoiceHtml(
  invoice: Invoice,
  customer: Customer | null,
  settings: TaxSettings | null,
): string {
  const items = invoice.items || [];
  const totals = computeTotals(items, invoice.vat_rate);
  const isExempt = invoice.vat_rate === 0;

  const rows = items
    .map(
      (it) => `
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:8px;text-align:right;font-size:12px;">${escapeHtml(it.description)}</td>
          <td style="padding:8px;text-align:center;font-size:12px;">${it.quantity}</td>
          <td style="padding:8px;text-align:left;font-size:12px;">${formatCurrency(it.unit_price)}</td>
          <td style="padding:8px;text-align:left;font-size:12px;font-weight:600;">${formatCurrency(lineTotal(it))}</td>
        </tr>`,
    )
    .join("");

  return `
  <div dir="rtl" style="font-family:Arial,'Heebo',sans-serif;color:#1e293b;padding:24px;background:#fff;max-width:700px;overflow:hidden;">
    <div style="display:flex;justify-content:space-between;border-bottom:2px solid #1e293b;padding-bottom:12px;">
      <div>
        <h1 style="font-size:22px;margin:0;font-weight:700;">${escapeHtml(settings?.business_name || "עצמאי")}</h1>
        ${settings?.vat_number ? `<p style="font-size:12px;margin:4px 0;">ע.מ: ${escapeHtml(settings.vat_number)}</p>` : ""}
        ${settings?.business_address ? `<p style="font-size:12px;margin:2px 0;">${escapeHtml(settings.business_address)}</p>` : ""}
        ${settings?.business_phone ? `<p style="font-size:12px;margin:2px 0;">טל: ${escapeHtml(settings.business_phone)}</p>` : ""}
      </div>
      <div style="text-align:left;">
        <h2 style="font-size:18px;margin:0;font-weight:700;">חשבונית מס</h2>
        <p style="font-size:13px;margin:6px 0 2px;">מספר: ${escapeHtml(invoice.invoice_number)}</p>
        <p style="font-size:12px;margin:2px 0;">תאריך: ${fmtDate(invoice.issue_date)}</p>
        ${invoice.due_date ? `<p style="font-size:12px;margin:2px 0;">יעד לתשלום: ${fmtDate(invoice.due_date)}</p>` : ""}
      </div>
    </div>

    <div style="margin-top:16px;padding:12px;background:#f8fafc;border-radius:8px;">
      <p style="font-size:11px;font-weight:700;color:#64748b;margin:0 0 4px;">הוגש ל:</p>
      <p style="font-size:14px;font-weight:600;margin:0;">${customer ? escapeHtml(customer.name) : "-"}</p>
      ${customer?.company ? `<p style="font-size:12px;margin:2px 0;">${escapeHtml(customer.company)}</p>` : ""}
      ${customer?.vat_number ? `<p style="font-size:12px;margin:2px 0;">ע.מ: ${escapeHtml(customer.vat_number)}</p>` : ""}
      ${customer?.address ? `<p style="font-size:12px;margin:2px 0;">${escapeHtml(customer.address)}</p>` : ""}
    </div>

    <table style="width:100%;margin-top:16px;border-collapse:collapse;">
      <thead>
        <tr style="background:#f1f5f9;font-size:11px;color:#475569;">
          <th style="padding:8px;text-align:right;">תיאור</th>
          <th style="padding:8px;text-align:center;">כמות</th>
          <th style="padding:8px;text-align:left;">מחיר ליחידה</th>
          <th style="padding:8px;text-align:left;">סה"כ</th>
        </tr>
      </thead>
      <tbody>
        ${items.length ? rows : '<tr><td colspan="4" style="padding:8px;text-align:center;color:#94a3b8;font-size:12px;">אין פריטים</td></tr>'}
      </tbody>
    </table>

    <div style="margin-top:16px;display:flex;justify-content:flex-end;">
      <div style="width:260px;">
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;">
          <span>סכום ללא מע"מ</span>
          <span>${formatCurrency(totals.subtotal)}</span>
        </div>
        ${
          isExempt
            ? '<p style="font-size:11px;color:#64748b;margin:6px 0;line-height:1.5;">עוסק פטור - אין חיוב מע"מ (סעיף 31 לחוק מס ערך מוסף)</p>'
            : `<div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;">
                 <span>מע"מ (${invoice.vat_rate}%)</span>
                 <span>${formatCurrency(totals.vat)}</span>
               </div>`
        }
        <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700;padding:8px 0;border-top:2px solid #1e293b;">
          <span>סה"כ לתשלום</span>
          <span>${formatCurrency(totals.total)}</span>
        </div>
      </div>
    </div>

    ${
      invoice.notes
        ? `<p style="font-size:11px;color:#64748b;margin-top:16px;border-top:1px solid #e2e8f0;padding-top:8px;">הערות: ${escapeHtml(invoice.notes)}</p>`
        : ""
    }
  </div>`;
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
