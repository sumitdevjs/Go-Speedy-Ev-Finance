import React from 'react';

export default function Badge({
  status,
  children,
  variant,
  size = 'md',
  className = '',
}) {
  const normStatus = (status || '').toLowerCase();

  let computedVariant = variant;
  if (!computedVariant) {
    if (['rented', 'active', 'converted'].includes(normStatus)) computedVariant = 'blue';
    else if (['completed', 'advance', 'paid'].includes(normStatus)) computedVariant = 'emerald';
    else if (['overdue', 'cancelled', 'breach'].includes(normStatus)) computedVariant = 'rose';
    else if (['pending', 'partial', 'warning'].includes(normStatus)) computedVariant = 'amber';
    else if (['admin'].includes(normStatus)) computedVariant = 'purple';
    else computedVariant = 'slate';
  }

  const variantClasses = {
    blue: 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
    rose: 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30',
    amber: 'bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
    purple: 'bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30',
    slate: 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600/60',
  }[computedVariant] || 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600/60';

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] font-medium',
    md: 'px-2.5 py-1 text-xs font-semibold',
  }[size] || 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center rounded-full border tracking-wide uppercase ${variantClasses} ${sizeClasses} ${className}`}
    >
      {children || status}
    </span>
  );
}
