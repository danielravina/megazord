"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Calendar,
  CloudSun,
  Calculator,
  Layers,
  FolderKanban,
  Wallet,
  FileText,
  LogOut,
} from "lucide-react";
import { useAuth } from "./auth-provider";

const navItems = [
  { href: "/", label: "לוח בקרה", icon: LayoutDashboard },
  { href: "/todos/", label: "פתקים", icon: ClipboardList },
  { href: "/calendar/", label: "יומן", icon: Calendar },
  { href: "/weather/", label: "מזג אוויר", icon: CloudSun },
  { href: "/calculator/", label: "מחשבון", icon: Calculator },
  { href: "/kanban/", label: "מעקב בקשות", icon: Layers },
  { href: "/projects/", label: "פרויקטים", icon: FolderKanban },
  { href: "/finance/", label: "ניהול כספים", icon: Wallet },
  { href: "/documents/", label: "מסמכים", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();
  const { supabase } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <aside className="fixed right-0 top-0 bottom-0 w-64 bg-white border-l border-slate-200 flex flex-col z-30">
      <div className="p-6 border-b border-slate-100">
        <h1 className="text-xl font-bold text-slate-800">Megazord</h1>
        <p className="text-xs text-slate-400 mt-0.5">מערכת ניהול אישית</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={16} />
          <span>התנתק</span>
        </button>
      </div>
    </aside>
  );
}
