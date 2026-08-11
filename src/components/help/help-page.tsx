"use client";

import { useEffect, useRef, useState } from "react";
import { Lightbulb, HelpCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { guides } from "./help-content";

export function HelpPage() {
  const [activeId, setActiveId] = useState<string>(guides[0].id);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const active = guides.some((g) => g.id === activeId) ? activeId : guides[0].id;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
    );
    for (const el of Object.values(sectionRefs.current)) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const scrollToGuide = (id: string) => {
    setActiveId(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "auto", block: "start" });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <header className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <HelpCircle size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 leading-tight">מרכז העזרה</h1>
          <p className="text-xs text-slate-500">מדריכים מפורטים לשימוש בכל חלקי המערכת</p>
        </div>
      </header>

      {/* Mobile navigation strip */}
      <div className="md:hidden flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        {guides.map((g) => {
          const isActive = g.id === active;
          return (
            <button
              key={g.id}
              onClick={() => scrollToGuide(g.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                isActive
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200"
              }`}
            >
              {g.title}
            </button>
          );
        })}
      </div>

      <div className="flex items-start gap-6">
        {/* TOC sidebar */}
        <aside className="hidden md:flex w-48 shrink-0 flex-col sticky top-0 max-h-[calc(100vh-8rem)]">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400 px-2 pb-2">
            מדריכים
          </div>
          <nav className="flex-1 overflow-y-auto space-y-0.5 pb-2">
            {guides.map((g) => {
              const Icon = g.icon;
              const isActive = g.id === active;
              return (
                <button
                  key={g.id}
                  onClick={() => scrollToGuide(g.id)}
                  className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium text-right transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon size={16} className="shrink-0 opacity-70" />
                  <span className="leading-snug">{g.title}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Long-scroll content */}
        <section className="flex-1 min-w-0 space-y-5">
          {guides.map((g) => {
            const Icon = g.icon;
            return (
              <Card key={g.id} className="p-6 sm:p-8 scroll-mt-4">
                <div
                  id={g.id}
                  ref={(el) => {
                    sectionRefs.current[g.id] = el;
                  }}
                  className="scroll-mt-4"
                >
                  <header className="flex items-center gap-3 mb-6 pb-5 border-b border-slate-100">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Icon size={22} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">{g.title}</h2>
                      <p className="text-sm text-slate-500 mt-0.5">{g.summary}</p>
                    </div>
                  </header>

                  <div className="space-y-6">
                    {g.sections.map((s, i) => (
                      <div key={i}>
                        <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                          {s.heading}
                        </h3>
                        {s.body && (
                          <p className="text-sm text-slate-600 leading-relaxed mb-3">
                            {s.body}
                          </p>
                        )}
                        {s.steps && (
                          <ol className="space-y-1.5 mb-3">
                            {s.steps.map((step, j) => (
                              <li key={j} className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
                                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                  {j + 1}
                                </span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        )}
                        {s.tips && (
                          <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5 space-y-1">
                            {s.tips.map((tip, j) => (
                              <div key={j} className="flex items-start gap-2 text-xs text-amber-800 leading-relaxed">
                                <Lightbulb size={13} className="shrink-0 mt-0.5 text-amber-500" />
                                <span>{tip}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </section>
      </div>
    </div>
  );
}
