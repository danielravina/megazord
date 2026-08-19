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
  { href: "/documents/", label: "מסמכים", icon: FileText },
  { href: "/scans/", label: "סריקות", icon: Receipt },
  { href: "/finance/", label: "ניהול כספים", icon: Wallet },
  { href: "/calendar/", label: "יומן", icon: Calendar },
  { href: "/todos/", label: "פתקים", icon: ClipboardList },
  { href: "/preferences/", label: "העדפות", icon: Settings },
];

export function Sidebar({
  pinned,
  onTogglePin,
  mobileOpen,
  onClose,
}: {
  pinned: boolean;
  onTogglePin: () => void;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed right-0 top-14 bottom-0 z-40 bg-white border-l border-slate-200 flex flex-col overflow-hidden group transition-transform duration-200 lg:transition-[width] lg:duration-150 ${
        mobileOpen ? "translate-x-0 w-64" : "translate-x-full w-64"
      } lg:translate-x-0 ${
        pinned ? "lg:w-48" : "lg:w-14 lg:hover:w-48"
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
              onClick={onClose}
              className={`flex items-center gap-3 px-[19px] py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon size={18} className="shrink-0" />
              <span className={`leading-[18px] max-lg:inline ${
                pinned ? "inline" : "hidden lg:group-hover:inline"
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="py-4 border-t border-slate-100 max-lg:hidden">
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