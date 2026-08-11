// Supabase Edge Function: OCR Document Analysis
// Uses Gemini 2.5 Flash via OpenRouter

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY")!;
const MODEL = "google/gemini-2.5-flash";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FN = "ocr-document";

function log(level: "info" | "warn" | "error", event: string, fields: Record<string, unknown> = {}) {
  const entry = { fn: FN, level, event, ...fields };
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.log(entry);
}

function truncate(s: string, max = 1000): string {
  return s.length > max ? `${s.slice(0, max)}…[+${s.length - max} chars]` : s;
}

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

  const startedAt = Date.now();
  const fallbackRequestId = crypto.randomUUID();

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      throw new Error("Invalid JSON body");
    }

    const { imageUrl, imageBase64, mimeType, requestId: clientRequestId } = body as {
      imageUrl?: string;
      imageBase64?: string;
      mimeType?: string;
      requestId?: string;
    };
    const requestId = clientRequestId || fallbackRequestId;

    const resolvedUrl = imageBase64
      ? `data:${mimeType || "image/jpeg"};base64,${imageBase64}`
      : imageUrl;
    if (!resolvedUrl) throw new Error("Missing imageUrl or imageBase64");

    log("info", "scan_started", {
      request_id: requestId,
      mode: imageBase64 ? "base64" : "url",
      mimeType: mimeType || null,
      payloadSizeKb: imageBase64 ? Math.round(imageBase64.length / 1024) : null,
    });

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

    log("info", "openrouter_request", { request_id: requestId, model: MODEL });

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

    const durationMs = Date.now() - startedAt;
    const resText = await r.text();

    if (!r.ok) {
      let upstream: string;
      try {
        upstream = JSON.stringify(JSON.parse(resText));
      } catch {
        upstream = truncate(resText);
      }
      log("error", "openrouter_error", {
        request_id: requestId,
        status: r.status,
        durationMs,
        upstream: truncate(upstream),
      });
      throw new Error(`OpenRouter ${r.status}`);
    }

    let d: Record<string, unknown>;
    try {
      d = JSON.parse(resText);
    } catch {
      throw new Error("OpenRouter returned non-JSON response");
    }

    const raw = String((d as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]?.message?.content || "");
    log("info", "openrouter_response", {
      request_id: requestId,
      status: r.status,
      durationMs,
      model: d.model || null,
      promptTokens: (d.usage as { prompt_tokens?: number } | undefined)?.prompt_tokens ?? null,
      completionTokens: (d.usage as { completion_tokens?: number } | undefined)?.completion_tokens ?? null,
      totalTokens: (d.usage as { total_tokens?: number } | undefined)?.total_tokens ?? null,
      rawLength: raw.length,
    });

    if (!raw) {
      log("warn", "parse_warning", { request_id: requestId, reason: "empty model content" });
    }

    const parsed = parseJson(raw);
    if (Object.keys(parsed).length === 0 && raw) {
      log("warn", "parse_warning", {
        request_id: requestId,
        reason: "json parse failed",
        rawPreview: truncate(raw),
      });
    }

    const degraded: string[] = [];
    if (!parsed.title) degraded.push("title");
    if (!parsed.docType) degraded.push("docType");
    if (parsed.totalAmount == null) degraded.push("totalAmount");
    if (degraded.length) {
      log("warn", "parse_degraded", { request_id: requestId, fields: degraded });
    }

    const payload = {
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
    };

    log("info", "scan_success", {
      request_id: requestId,
      durationMs,
      docType: payload.docType,
      totalAmount: payload.totalAmount,
      hasBusinessName: Boolean(payload.businessName),
      hasBusinessVat: Boolean(payload.businessVat),
      extractedTextLength: payload.extractedText.length,
    });

    return new Response(JSON.stringify(payload), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    log("error", "scan_error", {
      request_id: fallbackRequestId,
      message: err.message || "Unknown",
      stack: err.stack || null,
      durationMs: Date.now() - startedAt,
    });
    return new Response(JSON.stringify({ error: err.message || "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
