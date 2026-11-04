"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { pushDebug } from "@/lib/supabase/auth-debug";

type AuthContextType = {
  supabase: ReturnType<typeof createClient>;
  session: Session | null;
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function decodeJwtClaims(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function describeSession(session: Session | null) {
  if (!session) return { has_session: false };
  const now = Math.round(Date.now() / 1000);
  const data: Record<string, unknown> = {
    has_session: true,
    expires_in_secs: typeof session.expires_at === "number" ? session.expires_at - now : null,
  };
  const claims = session.access_token ? decodeJwtClaims(session.access_token) : null;
  if (claims && typeof claims.iat === "number") {
    data.issued_secs_ago = now - claims.iat;
    if (now - claims.iat > 30 || now - claims.iat < -30) {
      data.clock_offset_vs_server = now - claims.iat;
    }
  }
  return data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pushDebug("page-load", { url: window.location.pathname, visibility: document.visibilityState });

    function onWindowError(err: ErrorEvent) {
      pushDebug("window-error", { message: String(err.message).slice(0, 200), source: err.filename });
    }
    function onUnhandledRejection(e: PromiseRejectionEvent) {
      pushDebug("unhandled-rejection", { reason: String(e.reason && e.reason.message ? e.reason.message : e.reason).slice(0, 200) });
    }
    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    const onVisibility = () => pushDebug("visibility-change", { state: document.visibilityState });
    document.addEventListener("visibilitychange", onVisibility);

    supabase.auth.getSession().then(({ data: { session } }) => {
      pushDebug("get-session", describeSession(session));
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      pushDebug(`auth:${event}`, describeSession(session));
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      document.removeEventListener("visibilitychange", onVisibility);
      subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ supabase, session, user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
