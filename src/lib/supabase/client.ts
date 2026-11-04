import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { pushDebug } from "@/lib/supabase/auth-debug";

const authFetch: typeof fetch = async (url, init) => {
  const isTokenCall = typeof url === "string" && url.includes("/auth/v1/token");
  const grant =
    typeof url === "string" && url.includes("grant_type=")
      ? url.split("grant_type=")[1]?.split("&")[0]
      : null;
  const started = Date.now();
  const res = await fetch(url, init);
  if (isTokenCall) {
    let serverTime: string | null = null;
    try {
      serverTime = res.headers.get("date");
    } catch {
      serverTime = null;
    }
    pushDebug("token-call", {
      grant,
      status: res.status,
      ms: Date.now() - started,
      client_time: new Date(started).toISOString(),
      server_time: serverTime,
    });
  }
  if (
    res.status === 429 &&
    isTokenCall &&
    grant === "refresh_token"
  ) {
    throw new Error("token refresh rate-limited (429); keeping session for retry");
  }
  return res;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
type LooseClient = ReturnType<typeof createSupabaseClient<any, "public">>;

let cachedLoose: LooseClient | undefined;

export function createClient(): LooseClient {
  if (!cachedLoose) {
    cachedLoose = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: "pkce",
        },
        global: { fetch: authFetch },
      },
    );
  }
  return cachedLoose;
}
