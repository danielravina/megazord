// Supabase Edge Function: OCR Document Analysis
// Uses Open Router API with Google Gemini 2.5 Flash Lite (cheap vision model)
//
// Deploy: supabase functions deploy ocr-document
// Set secret: supabase secrets set OPENROUTER_API_KEY=sk-or-...

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY")!;
const MODEL = "google/gemini-2.5-flash-lite-preview-06-17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();
    if (!imageUrl) throw new Error("Missing imageUrl");

    const prompt = `Analyze this document image. Return a JSON object with these fields:
- title: Short descriptive title in Hebrew
- tags: Array of 2-4 relevant Hebrew tags
- extractedText: All visible text from the document (keep original language)
- docType: One of "Invoice", "Delivery Note", "Proforma Invoice", "Other"
- dateOnDoc: Date found on document in YYYY-MM-DD format, or empty string
- totalAmount: Total numeric amount in NIS if found, or null
- folderSuggestion: One of "Bank", "VAT", "Income Tax", "National Insurance", "Accountant", "Suppliers", "Employees", "Other"
- isInvestment: true if this is a capital investment/fixed asset purchase, false otherwise

Return ONLY the JSON object, no markdown or other text.`;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.1,
      }),
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "{}";

    // Parse the JSON from the response (handle possible markdown wrapping)
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    }

    return new Response(JSON.stringify({
      title: parsed.title || "מסמך ללא שם",
      tags: Array.isArray(parsed.tags) ? parsed.tags : ["כללי"],
      extractedText: parsed.extractedText || "",
      docType: parsed.docType || "Other",
      dateOnDoc: parsed.dateOnDoc || "",
      totalAmount: parsed.totalAmount ?? null,
      folderSuggestion: parsed.folderSuggestion || "",
      isInvestment: parsed.isInvestment || false,
    }), {
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
