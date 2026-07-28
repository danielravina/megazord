// Supabase Edge Function: OCR Document Analysis
// Uses Gemini 2.5 Flash via OpenRouter

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY")!;
const MODEL = "google/gemini-2.5-flash";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseJson(content: string): Record<string, unknown> {
  let t = content.trim();
  if (t.startsWith("```json")) t = t.slice(7);
  else if (t.startsWith("```")) t = t.slice(3);
  if (t.endsWith("```")) t = t.slice(0, -3);
  t = t.trim();
  try { return JSON.parse(t); } catch { /* */ }
  try { return JSON.parse(content); } catch { /* */ }
  const m = content.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* */ } }
  return {};
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { imageUrl, imageBase64, mimeType } = await req.json();
    const resolvedUrl = imageBase64
      ? `data:${mimeType || "image/jpeg"};base64,${imageBase64}`
      : imageUrl;
    if (!resolvedUrl) throw new Error("Missing imageUrl or imageBase64");

    const p = `Analyze this document image. Return a JSON object with these fields:
- title: Short descriptive title in Hebrew
- tags: Array of 2-4 relevant Hebrew tags
- extractedText: ALL visible text from the document
- docType: "Invoice" | "Delivery Note" | "Proforma Invoice" | "Other"
- dateOnDoc: Date in YYYY-MM-DD format, or ""
- totalAmount: Final total as number, or null
- folderSuggestion: "Bank" | "VAT" | "Income Tax" | "National Insurance" | "Accountant" | "Suppliers" | "Employees" | "Other"
- isInvestment: true or false
- businessName: IMPORTANT: The name of the company/business that ISSUED this document. Look at the top of the document near the logo. Example: "חברת חשמל", "All Product", "דורל". Never leave empty if visible.
- businessVat: The VAT / עוסק מורשה / ח.פ number. Usually "עוסק מורשה: XXXXXXXXX" or "ח.פ: XXXXXX". Empty if not found.
- businessAddress: The business address if visible on the document (street, city). Empty if not found.
- businessPhone: Any phone number belonging to the business (not the customer). Empty if not found.`;

    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENROUTER_API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: p },
            { type: "image_url", image_url: { url: resolvedUrl } },
          ],
        }],
        max_tokens: 3000,
        temperature: 0,
      }),
    });

    if (!r.ok) throw new Error(`OpenRouter ${r.status}`);

    const d = await r.json();
    const raw = d.choices?.[0]?.message?.content || "";
    const parsed = parseJson(raw);

    return new Response(JSON.stringify({
      title: String(parsed.title || "מסמך ללא שם"),
      tags: Array.isArray(parsed.tags) ? parsed.tags : ["כללי"],
      extractedText: String(parsed.extractedText || raw),
      docType: String(parsed.docType || "Other"),
      dateOnDoc: String(parsed.dateOnDoc || ""),
      totalAmount: parsed.totalAmount != null ? Number(parsed.totalAmount) : null,
      folderSuggestion: String(parsed.folderSuggestion || ""),
      isInvestment: Boolean(parsed.isInvestment),
      businessName: String(parsed.businessName || ""),
      businessVat: String(parsed.businessVat || ""),
      businessAddress: String(parsed.businessAddress || ""),
      businessPhone: String(parsed.businessPhone || ""),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: (e as Error).message || "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});