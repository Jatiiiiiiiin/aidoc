import React from "react";
import { TableContent } from "@/lib/schema";
import { renderFormattedText } from "@/lib/markdown";

interface TableSectionProps {
  title: string;
  content: TableContent;
}

export const TableSection: React.FC<TableSectionProps> = ({ title, content }) => {
  const headers = content.headers || [];
  const rows = content.rows || [];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="overflow-hidden rounded-md border border-border-subtle bg-surface-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                {headers.map((header, idx) => (
                  <th key={idx} className="px-6 py-3 font-mono">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {rows.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="transition-colors hover:bg-surface-2/40"
                >
                  {row.map((cell, cellIdx) => (
                    <td
                      key={cellIdx}
                      className="px-6 py-4 font-sans text-text-muted whitespace-pre-line text-sm leading-relaxed"
                    >
                      {renderFormattedText(String(cell))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
