"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: "left" | "right";
  className?: string;
  menuClassName?: string;
}

const MENU_WIDTH_EST = 240;

export function Dropdown({
  trigger,
  children,
  align = "left",
  className = "",
  menuClassName = "",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [flip, setFlip] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onToggle = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const vw = window.innerWidth || 375;
      if (align === "left" && rect.left + MENU_WIDTH_EST > vw - 8) {
        setFlip(true);
      } else if (align === "right" && rect.right - MENU_WIDTH_EST < 8) {
        setFlip(false);
      }
    }
    setOpen((o) => !o);
  };

  const effectiveAlign = flip ? (align === "left" ? "right" : "left") : align;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div onClick={onToggle}>{trigger}</div>
      {open && (
        <div
          className={`absolute top-full mt-1 z-50 min-w-[190px] max-w-[calc(100vw-1rem)] max-h-[70vh] overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg p-1.5 ${
            effectiveAlign === "left" ? "left-0" : "right-0"
          } ${menuClassName}`}
        >
          {typeof children === "function" ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  );
}

interface MenuLabelProps {
  children: ReactNode;
}

export function MenuLabel({ children }: MenuLabelProps) {
  return (
    <div className="px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
      {children}
    </div>
  );
}

interface MenuItemProps {
  onClick: () => void;
  active?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

export function MenuItem({ onClick, active = false, icon, children }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
        active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate text-right flex-1">{children}</span>
    </button>
  );
}
