'use client';

import React from 'react';

interface Column {
  key: string;
  label: string;
  sortable: boolean;
  width?: string;
  render?: (row: any) => React.ReactNode;
  onSort?: () => void;
  sortDirection?: 'asc' | 'desc';
}

export interface DataTableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
}

export default function DataTable({ columns, data, onRowClick }: DataTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800">
      <table className="w-full table-fixed">
        <thead>
          <tr className="bg-slate-800/50">
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider border-b border-slate-700"
                style={{ width: column.width }}
                onClick={() => column.sortable && column.onSort?.()}
              >
                <div className="flex items-center cursor-pointer">
                  {column.label}
                  {column.sortable && (
                    <span className="ml-1">
                      {column.sortDirection ? (
                        <span className="inline-block ml-1">
                          {column.sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      ) : (
                        <span className="inline-block ml-1 text-slate-600">⇅</span>
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {data.length > 0 ? (
            data.map((row, rowIndex) => {
              const uniqueKey = row.id || row._id || row.name || row.project_name || (row.project_name && row.date && row.scam_type ? `${row.project_name}-${row.date}-${row.scam_type}` : undefined) || row.cycle || rowIndex;
              return (
                <tr
                  key={uniqueKey}
                  onClick={() => onRowClick?.(row)}
                  className={`${onRowClick ? 'cursor-pointer hover:bg-slate-800/50 transition-colors duration-200' : ''} border-b border-slate-800`}
                >
                  {columns.map((column) => (
                    <td
                      key={`${uniqueKey}-${column.key}`}
                      className="px-4 py-4 text-sm text-slate-300"
                    >
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-400">
                No results found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
} 