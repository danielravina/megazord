interface TableProps {
  headers: string[];
  rows: React.ReactNode[][];
  emptyMessage?: string;
}

export function Table({ headers, rows, emptyMessage = "אין נתונים להצגה" }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={headers.length}
                className="px-4 py-8 text-center text-sm text-slate-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-3 text-sm text-slate-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
