import React from 'react';

export default function Badge({
  status,
  children,
  variant,
  size = 'md',
  showDot = true,
  className = '',
}) {
  const normStatus = (status || '').toLowerCase().trim();

  let computedVariant = variant;
  if (!computedVariant) {
    if (['rented', 'active', 'converted', 'direct_purchase', 'direct purchase'].includes(normStatus)) {
      computedVariant = 'blue';
    } else if (['completed', 'advance', 'paid', 'fully owned', 'fully_owned', 'in stock'].includes(normStatus) || normStatus.includes('in stock')) {
      computedVariant = 'emerald';
    } else if (['overdue', 'cancelled', 'breach', 'out of stock'].includes(normStatus) || normStatus.includes('out of stock')) {
      computedVariant = 'rose';
    } else if (['admin', 'super_admin'].includes(normStatus)) {
      computedVariant = 'purple';
    } else if (['ho_admin'].includes(normStatus)) {
      computedVariant = 'blue';
    } else if (['branch_admin', 'pending', 'docs pending', 'docs_pending'].includes(normStatus) || normStatus.includes('pending')) {
      computedVariant = 'amber';
    } else {
      computedVariant = 'slate';
    }
  }

  const variantClasses = {
    blue: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25',
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
    rose: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25',
    amber: 'bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/25',
    purple: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/25',
    slate: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
  }[computedVariant] || 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20';

  const dotClasses = {
    blue: 'bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.6)]',
    emerald: 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.6)]',
    rose: 'bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.6)]',
    amber: 'bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.6)]',
    purple: 'bg-purple-500 shadow-[0_0_5px_rgba(168,85,247,0.6)]',
    slate: 'bg-slate-400',
  }[computedVariant] || 'bg-slate-400';

  const sizeClasses = {
    sm: 'px-2.5 py-0.5 text-[10.5px] font-bold tracking-wider',
    md: 'px-3 py-1 text-xs font-bold tracking-wider',
  }[size] || 'px-2.5 py-1 text-xs font-bold tracking-wider';

  const displayText = children || status;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border whitespace-nowrap shrink-0 uppercase transition-colors leading-none select-none ${variantClasses} ${sizeClasses} ${className}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClasses}`} />}
      <span className="truncate">{displayText}</span>
    </span>
  );
}
