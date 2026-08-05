"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ClipboardList, Calendar,
  Layers, FolderKanban, Wallet, FileText,
  Settings, LogOut, Menu, X,
} from "lucide-react";
import { useAuth } from "./auth-provider";

const navItems = [
  { href: "/", label: "לוח בקרה", icon: LayoutDashboard },
  { href: "/projects/", label: "פרויקטים", icon: FolderKanban },
  { href: "/finance/", label: "ניהול כספים", icon: Wallet },
  { href: "/calendar/", label: "יומן", icon: Calendar },
  { href: "/todos/", label: "פתקים", icon: ClipboardList },
  { href: "/kanban/", label: "מעקב בקשות", icon: Layers },
  { href: "/documents/", label: "מסמכים", icon: FileText },
  { href: "/preferences/", label: "העדפות", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { supabase } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* Hamburger button - mobile only */}
      {!mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden fixed top-4 right-4 z-40 w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm"
        >
          <Menu size={20} className="text-slate-600" />
        </button>
      )}

      {/* Backdrop - mobile only */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed right-0 top-0 bottom-0 w-64 bg-white border-l border-slate-200 flex flex-col z-40 transition-transform duration-200
          ${mobileOpen ? "translate-x-0" : "translate-x-full"} lg:translate-x-0`}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">עצמאי</h1>
          </div>
          <button
            onClick={closeMobile}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
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
                onClick={closeMobile}
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
    </>
  );
}