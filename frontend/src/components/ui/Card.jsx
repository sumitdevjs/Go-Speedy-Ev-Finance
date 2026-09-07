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
      className={`rounded-xl border border-slate-200 bg-white p-6 card-elevation ${
        hover ? 'card-elevation-hover transition-smooth cursor-pointer' : ''
      } ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <div>
            {title && <h3 className="text-base font-bold text-slate-900">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
