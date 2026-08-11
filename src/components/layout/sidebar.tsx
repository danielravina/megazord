"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ClipboardList, Calendar,
  FolderKanban, Wallet, FileText, Users, Receipt,
  Settings, PanelLeftClose, PanelLeftOpen, Building,
} from "lucide-react";

const navItems = [
  { href: "/", label: "לוח בקרה", icon: LayoutDashboard },
  { href: "/projects/", label: "פרויקטים", icon: FolderKanban },
  { href: "/customers/", label: "לקוחות", icon: Users },
  { href: "/suppliers/", label: "ספקים", icon: Building },
  { href: "/invoices/", label: "חשבוניות", icon: Receipt },
  { href: "/finance/", label: "ניהול כספים", icon: Wallet },
  { href: "/calendar/", label: "יומן", icon: Calendar },
  { href: "/todos/", label: "פתקים", icon: ClipboardList },
  { href: "/documents/", label: "מסמכים", icon: FileText },
  { href: "/preferences/", label: "העדפות", icon: Settings },
];

export function Sidebar({ pinned, onTogglePin }: { pinned: boolean; onTogglePin: () => void }) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed right-0 top-14 bottom-0 z-40 bg-white border-l border-slate-200 flex flex-col transition-[width] duration-150 overflow-hidden ${
        pinned ? "w-48" : "w-14 group hover:w-48"
      }`}
    >
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
              <span className={`leading-[18px] ${pinned ? "inline" : "hidden group-hover:inline"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="py-4 border-t border-slate-100">
        <button
          onClick={onTogglePin}
          title={pinned ? "כווץ את התפריט" : "הצמד תפריט פתוח"}
          className="flex items-center justify-start px-[19px] w-full py-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          {pinned ? (
            <PanelLeftClose size={16} />
          ) : (
            <PanelLeftOpen size={16} />
          )}
        </button>
      </div>
    </aside>
  );
}
