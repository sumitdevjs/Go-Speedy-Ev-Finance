import React from 'react';
import Spinner from './Spinner';

export default function Table({
  columns = [],
  data = [],
  loading = false,
  emptyText = 'No records found',
  onRowClick,
}) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white card-elevation">
      <table className="w-full text-sm text-slate-600">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                scope="col"
                className={`px-6 py-4 text-center ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-14 text-center">
                <Spinner size="lg" className="text-blue-600 mx-auto" />
                <p className="mt-2 text-xs font-medium text-slate-500">Loading records...</p>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-14 text-center text-slate-400">
                <p className="text-sm font-medium">{emptyText}</p>
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={row.id || rowIdx}
                onClick={() => onRowClick && onRowClick(row)}
                className={`transition-smooth ${
                  onRowClick ? 'cursor-pointer hover:bg-slate-50/80' : 'hover:bg-slate-50/50'
                }`}
              >
                {columns.map((col, colIdx) => (
                  <td
                    key={col.key || colIdx}
                    className={`px-6 py-4 text-center align-middle ${col.cellClassName || ''}`}
                  >
                    {col.render ? col.render(row) : row[col.key]}
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
