"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/layout/auth-provider";
import Link from "next/link";

export default function RegisterPage() {
  const { supabase, user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [confirmSent, setConfirmSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError("");
    setGoogleLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard/`,
      },
    });

    if (error) {
      setError("שגיאה בהתחברות עם Google");
      setGoogleLoading(false);
    }
  };

  if (user) {
    router.replace("/dashboard/");
    return null;
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("הסיסמאות אינן תואמות");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard/`,
      },
    });

    if (error) {
      setError(
        error.message === "User already registered"
          ? "המשתמש כבר רשום במערכת"
          : "שגיאה בהרשמה",
      );
      setLoading(false);
    } else if (data.session) {
      // הרשמה מוצלחת עם סשן — ישר לאשף הצירום
      router.replace("/onboarding/");
    } else {
      // נדרש אישור אימייל — הסשן ייווצר רק אחרי לחיצה על הקישור בדואר
      setConfirmSent(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-800">עצמאי</h1>
            <p className="text-sm text-slate-500 mt-1">הרשמה למערכת</p>
          </div>

          {confirmSent ? (
            <div className="bg-blue-50 text-blue-700 text-sm p-3 rounded-lg text-center">
              נשלח קישור אישור לכתובת שלך. אחרי האישור תתחבר למערכת ונשלים יחד את ההגדרות.
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  אימייל
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-sm"
                  placeholder="your@email.com"
                  dir="ltr"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  סיסמה
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-sm"
                  placeholder="••••••••"
                  dir="ltr"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  אימות סיסמה
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-sm"
                  placeholder="••••••••"
                  dir="ltr"
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "נרשם..." : "הרשמה"}
              </button>
          </form>
        )}

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400">או</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="w-5 h-5">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
            />
          </svg>
          {googleLoading ? "ממתין ל-Google..." : "Google"}
        </button>

          <p className="text-xs text-slate-400 text-center mt-6">
            כבר יש לך חשבון?{" "}
            <Link href="/login" className="text-blue-600 hover:underline">
              התחבר כאן
            </Link>
          </p>
          <p className="text-xs text-slate-400 text-center mt-2">
            <Link href="/" className="hover:underline">
              חזרה לדף הראשי
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
