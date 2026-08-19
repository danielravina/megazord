"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/layout/auth-provider";
import { GlobalSearch } from "@/components/layout/global-search";
import { Dropdown, MenuItem } from "@/components/ui/dropdown";
import { Settings, LogOut, CircleHelp, Menu, X } from "lucide-react";

export function TopBar({ onToggleMenu, mobileOpen }: { onToggleMenu: () => void; mobileOpen: boolean }) {
  const { supabase, user } = useAuth();
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("tax_settings")
      .select("business_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setBusinessName(data?.business_name || ""));
  }, [user, supabase]);

  const email = user?.email || "";
  const initials = email.split("@")[0].slice(0, 2).toUpperCase() || "ע";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="sticky top-0 z-50 h-14 shrink-0 flex items-center justify-between gap-3 px-3 sm:px-4 lg:px-6 bg-white border-b border-slate-200">
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onToggleMenu}
          className="lg:hidden w-9 h-9 rounded-lg text-slate-500 flex items-center justify-center hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0"
          title={mobileOpen ? "סגור תפריט" : "פתח תפריט"}
          aria-label={mobileOpen ? "סגור תפריט" : "פתח תפריט"}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <Link
          href="/"
          className="font-bold text-slate-800 text-base sm:text-lg truncate hover:opacity-75 transition-opacity min-w-0"
          title="לוח בקרה"
        >
          {businessName || "עצמאי"}
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <GlobalSearch />
        <Link
          href="/help/"
          title="מרכז העזרה"
          className="hidden sm:flex w-9 h-9 rounded-full text-slate-500 items-center justify-center hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0"
        >
          <CircleHelp size={19} />
        </Link>
        <Dropdown
          align="left"
          trigger={
            <button
              className="w-9 h-9 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center hover:opacity-90 transition-opacity shrink-0"
              title="החשבון שלי"
            >
              {initials}
            </button>
          }
        >
          {(close) => (
            <div className="w-60">
              <div className="px-3 py-2.5">
                <div className="text-sm font-bold text-slate-800 truncate">{businessName || "עצמאי"}</div>
                <div className="text-xs text-slate-400 truncate">{email}</div>
              </div>
              <div className="my-1 border-t border-slate-100" />
              <MenuItem
                icon={<Settings size={14} />}
                onClick={() => {
                  close();
                  router.push("/preferences/");
                }}
              >
                העדפות
              </MenuItem>
              <div className="my-1 border-t border-slate-100" />
              <MenuItem icon={<LogOut size={14} />} onClick={() => handleSignOut()}>
                <span className="text-red-600">התנתק</span>
              </MenuItem>
            </div>
          )}
        </Dropdown>
      </div>
    </header>
  );
}
