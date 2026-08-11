// Supabase Edge Function: Send Monthly Report via Resend
// Receives base64 PDF + recipient + business details, sends email with attachment

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FN = "send-report";

function log(level: "info" | "warn" | "error", event: string, fields: Record<string, unknown> = {}) {
  const entry = { fn: FN, level, event, ...fields };
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.log(entry);
}

function truncate(s: string, max = 1000): string {
  return s.length > max ? `${s.slice(0, max)}…[+${s.length - max} chars]` : s;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startedAt = Date.now();

  try {
    const { to, subject, htmlBody, pdfBase64, pdfFilename } = await req.json();

    if (!to || !pdfBase64) throw new Error("Missing recipient or PDF");

    log("info", "email_started", {
      to,
      pdfFilename: pdfFilename || null,
      pdfSizeKb: pdfBase64 ? Math.round(pdfBase64.length / 1024) : null,
    });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "עצמאי <onboarding@resend.dev>",
        to,
        subject: subject || "דוח חודשי",
        html: htmlBody || "<p>מצורף דוח חודשי.</p>",
        attachments: [
          {
            filename: pdfFilename || "דוח-חודשי.pdf",
            content: pdfBase64,
          },
        ],
      }),
    });

    const resText = await res.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(resText);
    } catch {
      data = { message: truncate(resText) };
    }

    if (!res.ok) {
      log("error", "email_failed", {
        to,
        status: res.status,
        durationMs: Date.now() - startedAt,
        message: String(data.message || "Failed to send"),
      });
      return new Response(JSON.stringify({ error: data.message || "Failed to send" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("info", "email_sent", {
      to,
      id: data.id || null,
      durationMs: Date.now() - startedAt,
    });

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log("error", "email_error", {
      message,
      stack: err instanceof Error ? err.stack || null : null,
      durationMs: Date.now() - startedAt,
    });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});