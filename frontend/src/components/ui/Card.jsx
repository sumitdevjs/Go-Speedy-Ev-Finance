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
      className={`rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl p-6 card-elevation shadow-xs dark:shadow-[0_8px_30px_rgb(0,0,0,0.35)] transition-all ${
        hover ? 'card-elevation-hover transition-smooth cursor-pointer' : ''
      } ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4 mb-5">
          <div>
            {title && <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
