import React, { useEffect, useRef } from 'react';
import Spinner from './Spinner';
import { staggerFadeIn, gsap } from '../../lib/gsap';

export default function Table({
  columns = [],
  data = [],
  loading = false,
  emptyText = 'No records found',
  onRowClick,
}) {
  const tbodyRef = useRef(null);
  const prevSignature = useRef('');

  // Fade + stagger new rows in whenever the (filtered/paginated) result set changes —
  // a fresh page of search results, a page-change, or the initial load — but never on
  // the loading/empty placeholder rows.
  useEffect(() => {
    if (loading || !data.length || !tbodyRef.current) return;

    const signature = data.map((row) => row.id ?? '').join('|');
    if (signature === prevSignature.current) return; // same rows re-rendering (e.g. a field updated in place)
    prevSignature.current = signature;

    const rows = tbodyRef.current.querySelectorAll('tr[data-gsap-row]');
    if (!rows.length) return;

    gsap.killTweensOf(rows);
    staggerFadeIn(rows, {
      y: 8,
      scale: 1, // no scaling on table rows — plain fade + rise reads cleanly at any column width
      stagger: Math.min(0.035, 0.5 / rows.length),
      duration: 0.35,
      ease: 'power2.out',
    });
  }, [data, loading]);

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl card-elevation shadow-xs dark:shadow-[0_8px_30px_rgb(0,0,0,0.35)] -webkit-overflow-scrolling-touch transition-colors">
      <table className="w-full min-w-[640px] text-sm text-slate-600 dark:text-slate-300">
        <thead className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/60 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                scope="col"
                className={`px-3 md:px-6 py-3 md:py-4 text-center whitespace-nowrap ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody ref={tbodyRef} className="divide-y divide-slate-100 dark:divide-white/5">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-14 text-center">
                <Spinner size="lg" className="text-blue-600 dark:text-blue-400 mx-auto" />
                <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">Loading records...</p>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-14 text-center text-slate-400 dark:text-slate-500">
                <p className="text-sm font-medium">{emptyText}</p>
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={row.id || rowIdx}
                data-gsap-row
                onClick={() => onRowClick && onRowClick(row)}
                className={`transition-smooth ${
                  onRowClick
                    ? 'cursor-pointer hover:bg-slate-50/80 dark:hover:bg-white/5'
                    : 'hover:bg-slate-50/50 dark:hover:bg-white/[0.03]'
                }`}
              >
                {columns.map((col, colIdx) => (
                  <td
                    key={col.key || colIdx}
                    className={`px-3 md:px-6 py-3 md:py-4 text-center align-middle ${col.cellClassName || ''}`}
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
