"use client";

import { useState } from "react";
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
      <TopBar />
      <div className="flex-1 flex min-h-0">
        <Sidebar pinned={pinned} onTogglePin={togglePin} />
        <main className={`flex-1 min-h-0 overflow-y-auto p-4 lg:p-6 ${pinned ? "mr-48" : "mr-14"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
