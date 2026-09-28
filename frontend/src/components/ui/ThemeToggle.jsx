'use client';

import React, { useState, useEffect } from 'react';
import { Sun, Moon, Laptop, ChevronDown } from 'lucide-react';
import { useTheme } from '../../store/themeContext';

export default function ThemeToggle({ variant = 'default' }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-9 w-18 sm:w-23 rounded-xl bg-slate-200/50 dark:bg-slate-800 animate-pulse shrink-0" />
    );
  }

  const options = [
    { key: 'light', label: 'Light', icon: Sun },
    { key: 'dark', label: 'Dark', icon: Moon },
    { key: 'system', label: 'System', icon: Laptop },
  ];

  const active = options.find((opt) => opt.key === theme) || options[2];
  const ActiveIcon = active.icon;
  const cycleTheme = () => {
    const i = options.findIndex((opt) => opt.key === theme);
    setTheme(options[(i + 1) % options.length].key);
  };

  return (
    <>
      {/* Mobile / Compact (< sm:): Sleek Pill Button with generous padding */}
      <button
        type="button"
        onClick={cycleTheme}
        title={`Theme: ${active.label} (Click to switch)`}
        aria-label={`Theme: ${active.label}. Click to switch`}
        className={`sm:hidden h-9 px-3.5 xs:px-4 py-2 inline-flex items-center gap-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0 shadow-xs hover:shadow-sm ${variant === 'glass'
          ? 'bg-slate-900/60 hover:bg-slate-900/80 backdrop-blur-md border border-white/20 text-white'
          : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/90 dark:hover:bg-slate-700/90 border border-slate-200/90 dark:border-slate-700 text-slate-800 dark:text-slate-100'
          }`}
      >
        <ActiveIcon
          className={`w-4 h-4 transition-colors shrink-0 ${active.key === 'light'
            ? 'text-amber-500'
            : active.key === 'dark'
              ? 'text-blue-400'
              : 'text-slate-600 dark:text-slate-300'
            }`}
        />
        <span className="capitalize tracking-wide font-bold">{active.label}</span>
      </button>

      {/* Screens sm: and above (Tablets, Laptops, Desktops 640px+): Full 3-Button Pill */}
      <div
        className={`h-9 sm:h-10 hidden sm:inline-flex items-center p-1 rounded-xl transition-colors shrink-0 gap-0.5 sm:gap-1 shadow-xs ${variant === 'glass'
          ? 'bg-slate-900/60 backdrop-blur-md border border-white/20 text-white/80'
          : 'bg-slate-100 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/90 text-slate-600 dark:text-slate-300'
          }`}
        role="group"
        aria-label="Theme selector"
      >
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = theme === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setTheme(opt.key)}
              title={`Switch to ${opt.label} theme`}
              className={`h-7 sm:h-8 flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${isActive
                ? variant === 'glass'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : variant === 'glass'
                  ? 'text-white/80 hover:text-white hover:bg-white/10 opacity-90 hover:opacity-100'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
                }`}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
