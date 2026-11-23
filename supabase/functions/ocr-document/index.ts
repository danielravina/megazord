// Supabase Edge Function: OCR Document Analysis
// Uses Claude Haiku 5.5 via OpenRouter

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY")!;
const MODEL = "anthropic/claude-haiku-5.5";

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

// The model sometimes emits invalid JSON escape sequences (e.g. `בע"מ\ `)
// that break JSON.parse — drop backslashes not starting a valid JSON escape.
function stripInvalidEscapes(s: string): string {
  return s.replace(/\\(?!["\\/bfnrtu])/g, "");
}

// Last-resort field extraction via regex when JSON.parse fails entirely
// (truncated responses, stray quotes, etc.). Unclosed strings (a value cut
// off by the token limit) intentionally do not match, so partial values
// are dropped instead of being salvaged wrong.
function salvageJson(content: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const unesc = (s: string) => s.replace(/\\u([0-9a-fA-F]{4})|\\(.)/g, (_m, hex, c) => {
    if (hex) return String.fromCharCode(parseInt(hex, 16));
    if (c === "n") return "\n";
    if (c === "t") return "\t";
    if (c === "r") return "\r";
    if (c === "b") return "\b";
    if (c === "f") return "\f";
    return c;
  });
  const str = (key: string): string => {
    const m = content.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
    return m ? unesc(m[1]) : "";
  };
  for (const key of ["title", "docType", "dateOnDoc", "folderSuggestion", "businessName", "businessVat", "businessAddress", "businessPhone"]) {
    const v = str(key);
    if (v) out[key] = v;
  }
  const tags = content.match(/"tags"\s*:\s*\[([\s\S]*?)\]/);
  if (tags) {
    const arr = Array.from(tags[1].matchAll(/"((?:[^"\\\\]|\\\\.)*)"/g)).map((m) => unesc(m[1]));
    if (arr.length) out.tags = arr;
  }
  const amount = content.match(/"totalAmount"\s*:\s*(-?\d+(?:\.\d+)?)/);
  if (amount) out.totalAmount = Number(amount[1]);
  const inv = content.match(/"isInvestment"\s*:\s*(true|false)/);
  if (inv) out.isInvestment = inv[1] === "true";
  return out;
}

function parseJson(content: string): Record<string, unknown> {
  let t = content.trim();
  if (t.startsWith("```json")) t = t.slice(7);
  else if (t.startsWith("```")) t = t.slice(3);
  if (t.endsWith("```")) t = t.slice(0, -3);
  t = t.trim();

  const candidates = [t, stripInvalidEscapes(t)];
  const m = t.match(/\{[\s\S]*\}/);
  if (m) candidates.push(m[0], stripInvalidEscapes(m[0]));
  for (const c of candidates) {
    try { return JSON.parse(c); } catch { /* */ }
  }

  const salvaged = salvageJson(t);
  if (Object.keys(salvaged).length > 0) {
    log("warn", "parse_warning", { reason: "json parse failed — salvaged fields via regex", rawPreview: truncate(t) });
    return salvaged;
  }
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
- tags: Array of relevant Hebrew tags, as many as the document warrants. IMPORTANT: if products or services were purchased on this document, add each purchased product/service name (from the line items) as a tag — in singular form (e.g. "סולם", "צבע"). Do NOT invent any that are not on the document. Also add any other useful tags (categories, anything someone might later search for).
- docType: One of the receipt/vendor document types: "tax_invoice" (חשבונית מס), "transaction_account" (חשבונית עסקה / דרישת תשלום), "tax_invoice_receipt" (חשבונית מס/קבלה), "credit_invoice" (חשבונית מס זיכוי), "receipt" (קבלה), "quotation" (הצעת מחיר), "delivery_note" (תעודת משלוח), or "other"
- dateOnDoc: Date in YYYY-MM-DD format, or ""
- totalAmount: Final total as number, or null
- folderSuggestion: One of the following Hebrew folder names exactly: "תעודת עוסק", "אישור ניהול ספרים", "אישור מס במקור", "ת.ז", "רישיון נהיגה", "דרכון", "אישור ניהול חשבון בנק", "ביטוחים", "חוזים מול נותני שירות/ספקים", "רישיונות עסק", "רישיון רכב"
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
        max_tokens: 16000,
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

    const choices = (d as { choices?: { message?: { content?: unknown }; finish_reason?: string }[] })?.choices;
    const raw = String(choices?.[0]?.message?.content || "");
    const finishReason = choices?.[0]?.finish_reason || null;
    log("info", "openrouter_response", {
      request_id: requestId,
      status: r.status,
      durationMs,
      model: d.model || null,
      finishReason,
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
      docType: String(parsed.docType || "other"),
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
