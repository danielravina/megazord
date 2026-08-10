// Supabase Edge Function: Send Invoice via Resend
// Receives base64 PDF + recipient + subject, sends email with the PDF attached

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const DEFAULT_FROM = Deno.env.get("SEND_INVOICE_FROM") || "עצמאי <onboarding@resend.dev>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, from, subject, htmlBody, pdfBase64, pdfFilename } = await req.json();

    if (!to || !pdfBase64) throw new Error("Missing recipient or PDF");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: from || DEFAULT_FROM,
        to,
        subject: subject || "חשבונית",
        html: htmlBody || "<p>מצורפת חשבונית.</p>",
        attachments: [
          {
            filename: pdfFilename || "חשבונית.pdf",
            content: pdfBase64,
          },
        ],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: data.message || "Failed to send" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
