import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  onPageChange,
  className = '',
}) {
  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-between border-t border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/60 px-3 sm:px-6 py-3 rounded-b-2xl gap-2 backdrop-blur-xl transition-colors ${className}`}>
      {/* Desktop/Tablet text */}
      <div className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
        Showing page <span className="font-semibold text-slate-700 dark:text-slate-200">{currentPage}</span> of{' '}
        <span className="font-semibold text-slate-700 dark:text-slate-200">{totalPages}</span>
        {totalItems > 0 && <span> ({totalItems} total records)</span>}
      </div>

      {/* Mobile compact count */}
      <div className="text-xs text-slate-600 dark:text-slate-400 font-medium sm:hidden">
        <span className="font-bold text-slate-900 dark:text-white">{currentPage}</span> / {totalPages}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange && onPageChange(currentPage - 1)}
          className="inline-flex items-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 px-2 sm:px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-smooth"
        >
          <ChevronLeft className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Previous</span>
        </button>
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange && onPageChange(currentPage + 1)}
          className="inline-flex items-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 px-2 sm:px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-smooth"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4 sm:ml-1" />
        </button>
      </div>
    </div>
  );
}
