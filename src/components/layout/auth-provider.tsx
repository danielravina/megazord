"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type AuthContextType = {
  supabase: ReturnType<typeof createClient>;
  session: Session | null;
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // אישור הרשמה במייל: באקספורט סטטי, קישור האימייל מגיע עם ?code= (PKCE)
    // לדשבורד. אם נזיז את loading מיידית, AuthGuard יזמן ל-login לפני שההחלפה
    // (exchangeCodeForSession) תספיק להסתיים והעלייה לאתר חדש תהרוס את הקוד.
    // לכן: אם יש קוד בכתובת מוודאים את ההחלפה ראשית ורק אחר כך מוותרים על loading.
    function isAuthCallbackUrl(): boolean {
      const url = new URL(window.location.href);
      if (url.searchParams.has("code")) return true;
      return (
        url.hash.includes("access_token") || url.hash.includes("error_code")
      );
    }

    function cleanCallbackUrl() {
      const url = new URL(window.location.href);
      url.searchParams.delete("code");
      window.history.replaceState(history.state, "", url.toString());
    }

    async function init() {
      if (isAuthCallbackUrl()) {
        try {
          await supabase.auth.exchangeCodeForSession(window.location.href);
        } catch {
          // קוד משומש/פג תוקף — ניפטרים אם ההחלפה האוטומטית כבר הצליחה
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (isAuthCallbackUrl()) cleanCallbackUrl();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
