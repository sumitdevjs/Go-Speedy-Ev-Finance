import React, { forwardRef } from 'react';

const Select = forwardRef(function Select(
  {
    label,
    error,
    helperText,
    options = [],
    placeholder = 'Select an option',
    className = '',
    id,
    name,
    required = false,
    ...props
  },
  ref
) {
  const selectId = id || name;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative rounded-xl shadow-xs">
        <select
          ref={ref}
          id={selectId}
          name={name}
          className={`block w-full rounded-xl border bg-white/90 dark:bg-slate-800/80 px-3 py-2 text-sm text-slate-900 dark:text-white backdrop-blur-sm transition-smooth focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-50 dark:disabled:bg-slate-800/40 disabled:cursor-not-allowed ${
            error
              ? 'border-rose-300 dark:border-rose-500 text-rose-900 dark:text-rose-200 focus:border-rose-500 focus:ring-rose-200 dark:focus:ring-rose-900/40'
              : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-100 dark:focus:ring-blue-900/30'
          } ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="dark:bg-slate-900">
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="dark:bg-slate-900 text-slate-900 dark:text-white">
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>}
      {helperText && !error && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helperText}</p>}
    </div>
  );
});

export default Select;
