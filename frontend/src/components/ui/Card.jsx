import React from 'react';

export default function Card({
  title,
  subtitle,
  children,
  action,
  className = '',
  hover = false,
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl p-4 sm:p-6 card-elevation shadow-xs dark:shadow-[0_8px_30px_rgb(0,0,0,0.35)] transition-all ${
        hover ? 'card-elevation-hover transition-smooth cursor-pointer' : ''
      } ${className}`}
    >
      {(title || action) && (
        <div className="flex items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/10 pb-3 sm:pb-4 mb-4 sm:mb-5">
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0 self-start sm:self-center">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
