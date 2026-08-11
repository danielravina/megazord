// Supabase Edge Function: Log Event
// Receives client-side log events and re-emits them so they appear in the
// Supabase Logs Explorer alongside edge function logs.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const events = Array.isArray(body.events) ? body.events : [body];
    for (const ev of events) {
      const { level = "info", event = "log_event", ...fields } = (ev ?? {}) as Record<string, unknown>;
      const entry = { fn: "log-event", level, event, ...fields };
      if (level === "error") console.error(entry);
      else if (level === "warn") console.warn(entry);
      else console.log(entry);
    }
    return new Response("ok", { headers: corsHeaders });
  } catch {
    return new Response("bad request", { status: 400, headers: corsHeaders });
  }
});
