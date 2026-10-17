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
      <div className="h-9 w-9 sm:w-[102px] rounded-xl bg-slate-200/50 dark:bg-slate-800/60 animate-pulse shrink-0" />
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
      {/* Mobile / Ultra-compact (< sm:): Sleek single icon button with 1-tap cycling */}
      <button
        type="button"
        onClick={cycleTheme}
        title={`Theme: ${active.label} (Tap to switch)`}
        aria-label={`Theme: ${active.label}. Tap to switch`}
        className={`sm:hidden h-9 w-9 inline-flex items-center justify-center rounded-xl transition-all active:scale-95 cursor-pointer shrink-0 shadow-2xs hover:shadow-xs ${
          variant === 'glass'
            ? 'bg-slate-900/60 hover:bg-slate-900/80 backdrop-blur-md border border-white/20 text-white'
            : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700/80 text-slate-700 dark:text-slate-200'
        }`}
      >
        <ActiveIcon
          className={`w-4 h-4 transition-transform duration-200 ${
            active.key === 'light'
              ? 'text-amber-500 fill-amber-500/20'
              : active.key === 'dark'
                ? 'text-blue-400 fill-blue-400/20'
                : 'text-slate-600 dark:text-slate-300'
          }`}
        />
      </button>

      {/* Screens sm: and above (Tablets, Laptops, Desktops 640px+): Sleek, minimal 3-icon segmented pill */}
      <div
        className={`h-9 hidden sm:inline-flex items-center p-1 rounded-xl transition-colors shrink-0 gap-0.5 shadow-2xs ${
          variant === 'glass'
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
              aria-label={`Switch to ${opt.label} theme`}
              className={`h-7 w-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? variant === 'glass'
                    ? 'bg-white text-slate-900 shadow-xs scale-105'
                    : 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs scale-105'
                  : variant === 'glass'
                    ? 'text-white/70 hover:text-white hover:bg-white/10'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-colors ${
                  isActive
                    ? opt.key === 'light'
                      ? 'text-amber-500 fill-amber-500/20'
                      : opt.key === 'dark'
                        ? 'text-blue-500 dark:text-blue-400 fill-blue-400/20'
                        : 'text-slate-800 dark:text-slate-100'
                    : ''
                }`}
              />
            </button>
          );
        })}
      </div>
    </>
  );
}
