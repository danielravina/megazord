"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ClipboardList, Calendar,
  Layers, FolderKanban, Wallet, FileText, Users, Receipt,
  Settings, LogOut,
} from "lucide-react";
import { useAuth } from "./auth-provider";

const navItems = [
  { href: "/", label: "לוח בקרה", icon: LayoutDashboard },
  { href: "/projects/", label: "פרויקטים", icon: FolderKanban },
  { href: "/customers/", label: "לקוחות", icon: Users },
  { href: "/invoices/", label: "חשבוניות", icon: Receipt },
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <aside className="group fixed right-0 top-0 bottom-0 z-40 w-14 hover:w-48 bg-white border-l border-slate-200 flex flex-col transition-[width] duration-150 overflow-hidden">
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-1">
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
              className={`flex items-center gap-3 px-[19px] py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon size={18} className="shrink-0" />
              <span className="hidden group-hover:inline leading-[18px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="py-4 border-t border-slate-100">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-[19px] w-full py-2 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap"
        >
          <LogOut size={16} className="shrink-0" />
          <span className="hidden group-hover:inline leading-[16px]">התנתק</span>
        </button>
      </div>
    </aside>
  );
}
