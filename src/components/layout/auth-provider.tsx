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

function describeSession(session: Session | null) {
  if (!session) return { has_session: false };
  const now = Math.round(Date.now() / 1000);
  return {
    has_session: true,
    expires_in_secs: typeof session.expires_at === "number" ? session.expires_at - now : null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [clockSkewHint, setClockSkewHint] = useState(false);

  const checkForClockSkew = (s: Session | null) => {
    if (!s || typeof s.expires_at !== "number") return;
    const left = s.expires_at - Math.round(Date.now() / 1000);
    if (left >= 0 && left < 120) {
      pushDebug("clock-skew-suspected", { expires_in_secs: left });
      setClockSkewHint(true);
    }
  };

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
      checkForClockSkew(session);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      pushDebug(`auth:${event}`, describeSession(session));
      checkForClockSkew(session);
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
      {clockSkewHint && (
        <div className="fixed top-0 right-0 left-0 z-[100] bg-amber-100 border-b border-amber-300 text-amber-900 text-sm text-center py-2.5 px-4">
          נראה שהשעון של המחשב שלך לא מדויק. סנכרן את השעה בהגדרות וינדוס ואז רענן את העמוד.
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
