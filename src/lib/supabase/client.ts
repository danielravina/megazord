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
  if (isTokenCall && res.ok && grant) {
    // The server supplies expires_at as an absolute epoch (server clock). A device
    // whose clock is off sees every fresh session as already expired, which causes
    // gotrue to refresh in a tight loop until the rate limit kills the session.
    // expires_in is relative truth and skew-free: derive expiry from local time.
    try {
      const body = await res.clone().json();
      if (typeof body?.expires_at === "number" && typeof body?.expires_in === "number") {
        body.expires_at = Math.floor(Date.now() / 1000) + body.expires_in;
        pushDebug("expires-at-normalized", { grant, local_expiry: body.expires_at });
        const headers = new Headers(res.headers);
        headers.delete("content-length");
        return new Response(JSON.stringify(body), {
          status: res.status,
          statusText: res.statusText,
          headers,
        });
      }
    } catch {
      /* fall through with the untouched response */
    }
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
