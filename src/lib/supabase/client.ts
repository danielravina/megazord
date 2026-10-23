import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const authFetch: typeof fetch = async (url, init) => {
  const res = await fetch(url, init);
  if (res.status === 429 && typeof url === "string" && url.includes("grant_type=refresh_token")) {
    // Rate-limited token refresh is transient. Throwing makes gotrue classify it as
    // AuthRetryableFetchError (retry with backoff, session kept) instead of
    // AuthApiError, which removes the session and fires SIGNED_OUT (logs user out).
    throw new Error("token refresh rate-limited (429); keeping session for retry");
  }
  return res;
};

// Uses Database = any, mirroring createBrowserClient's default loose typing,
// which the rest of the app (from().insert/update) depends on.
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
