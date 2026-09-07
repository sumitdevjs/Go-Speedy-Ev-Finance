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
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  }[computedVariant] || 'bg-slate-100 text-slate-700 border-slate-200';

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
