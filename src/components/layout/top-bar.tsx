"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/layout/auth-provider";
import { GlobalSearch } from "@/components/layout/global-search";
import { Dropdown, MenuItem } from "@/components/ui/dropdown";
import { Settings, LogOut, CircleHelp } from "lucide-react";

export function TopBar() {
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
    <header className="sticky top-0 z-50 h-14 shrink-0 flex items-center justify-between gap-4 px-4 lg:px-6 bg-white border-b border-slate-200">
      <Link
        href="/"
        className="font-bold text-slate-800 text-lg truncate hover:opacity-75 transition-opacity"
        title="לוח בקרה"
      >
        {businessName || "עצמאי"}
      </Link>

      <div className="flex items-center gap-3">
        <GlobalSearch />
        <Link
          href="/help/"
          title="מרכז העזרה"
          className="w-9 h-9 rounded-full text-slate-500 flex items-center justify-center hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0"
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
