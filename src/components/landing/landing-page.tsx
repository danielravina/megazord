"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard, FolderKanban, FileText, Receipt,
  Wallet, Calendar, ChevronLeft,
} from "lucide-react";
import { useAuth } from "@/components/layout/auth-provider";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: LayoutDashboard,
    title: "לוח בקרה חכם",
    text: "תמונת מצב של העסק בכל רגע: הכנסות, הוצאות ומיסים — מחושבים בזמן אמת.",
  },
  {
    icon: Receipt,
    title: "סריקת מסמכים",
    text: "צלמו חשבונית או קבלה — ה-AI מזהה את הפרטים ורושם הכל אוטומטית.",
  },
  {
    icon: Wallet,
    title: 'ניהול מיסים ומע"מ',
    text: 'חישוב מע"מ, מקדמות מס הכנסה וביטוח לאומי — עם התראות למועדי דיווח.',
  },
  {
    icon: FolderKanban,
    title: "פרויקטים ולקוחות",
    text: "אפיון, מעקב התקדמות וניהול קשרי לקוחות וספקים ממקום אחד.",
  },
  {
    icon: FileText,
    title: "מסמכים והצעות מחיר",
    text: 'עסקאות, הצעות מחיר וחשבוניות ממותגות — עם יצוא PDF ושליחת דוחות לרו"ח.',
  },
  {
    icon: Calendar,
    title: "יומן ותזכורות",
    text: "יומן ותזכורות למועדי הדיווחים, פגישות ולקוחות — שלא יפלו לך מסמכים.",
  },
];

export function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard/");
    }
  }, [loading, user, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-slate-50 to-white">
      <header className="max-w-5xl mx-auto flex items-center justify-between px-4 py-5">
        <span className="font-bold text-xl text-slate-800">עצמאי</span>
        <div className="flex items-center gap-2">
          <Link
            href="/login/"
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
          >
            התחברות
          </Link>
          <Link href="/register/">
            <Button size="md">התחילו חינם</Button>
          </Link>
        </div>
      </header>

      <main>
        <section className="max-w-3xl mx-auto text-center px-4 pt-14 pb-20">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight">
            ניהול העסק העצמאי שלך,
            <br />
            בכל מקום אחד
          </h1>
          <p className="mt-5 text-lg text-slate-500 max-w-xl mx-auto">
            הכנסות, הוצאות, מסמכים, לקוחות ומיסים — מערכת אחת פשוטה ובעברית,
            שנבנתה במיוחד לעצמאים ולעסקים קטנים.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register/" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto">
                הרשמה עם כמה לחיצות
                <ChevronLeft size={16} />
              </Button>
            </Link>
            <Link href="/login/" className="w-full sm:w-auto">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                כבר יש לי חשבון
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            ללא כרטיס אשראי · ניתן לדלג על ההגדרות ולהתחיל לשלב מאוחר יותר
          </p>
        </section>

        <section className="max-w-5xl mx-auto px-4 pb-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <Icon size={22} />
                </div>
                <h3 className="font-bold text-slate-800 mb-1.5">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between text-sm text-slate-400">
          <span className="font-bold text-slate-600">עצמאי</span>
          <span>© {new Date().getFullYear()} — הכל נשמר אצלך, בפרטיות מלאה</span>
        </div>
      </footer>
    </div>
  );
}
