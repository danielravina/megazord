"use client";

import type { TableData } from "@/components/dashboard/dashboard-types";

interface Props {
  data: unknown;
  tile: { id: string; type: string; span: number; title?: string };
}

export function TableWidget({ data, tile }: Props) {
  const d = data as TableData | null;

  if (!d || !d.columns.length || !d.rows.length) {
    return (
      <div className="flex flex-col h-full">
        {tile.title && <div className="text-xs font-bold text-slate-500 mb-2">{tile.title}</div>}
        <div className="flex items-center justify-center flex-1 text-slate-400 text-sm">אין נתונים להצגה</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {tile.title && <div className="text-xs font-bold text-slate-500 mb-2">{tile.title}</div>}
      <div className="overflow-auto flex-1">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100">
              {d.columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-1.5 px-2 font-bold text-slate-500 whitespace-nowrap ${
                    col.align === "left" ? "text-left" : col.align === "center" ? "text-center" : "text-right"
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {d.rows.slice(0, 10).map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-slate-50/50" : ""}>
                {d.columns.map((col) => (
                  <td
                    key={col.key}
                    className={`py-1.5 px-2 text-slate-700 whitespace-nowrap truncate max-w-[200px] ${
                      col.align === "left" ? "text-left" : col.align === "center" ? "text-center" : "text-right"
                    }`}
                  >
                    {row[col.key] ?? "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
