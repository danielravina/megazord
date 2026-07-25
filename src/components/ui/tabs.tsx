"use client";

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex border-b border-slate-200">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-6 py-3 text-sm font-medium flex items-center gap-2 transition-colors border-b-2 -mb-px ${
            activeTab === tab.id
              ? "text-blue-600 border-blue-600"
              : "text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
