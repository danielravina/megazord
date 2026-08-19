"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

const PIN_KEY = "sidebar-pinned";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [pinned, setPinned] = useState<boolean>(() => {
    try {
      return localStorage.getItem(PIN_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const togglePin = () => {
    setPinned((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(PIN_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar onToggleMenu={() => setMobileOpen((o) => !o)} mobileOpen={mobileOpen} />
      <div className="flex-1 flex min-h-0">
        <Sidebar
          pinned={pinned}
          onTogglePin={togglePin}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
        {mobileOpen && (
          <div
            className="fixed inset-0 top-14 z-30 bg-slate-900/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <main
          className={`flex-1 min-h-0 overflow-y-auto overflow-x-clip p-4 lg:p-6 ${
            pinned ? "mr-0 lg:mr-48" : "mr-0 lg:mr-14"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}