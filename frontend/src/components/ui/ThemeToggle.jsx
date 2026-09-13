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
      <div className="h-8 w-8 sm:w-24 rounded-lg bg-slate-200/50 dark:bg-slate-800 animate-pulse shrink-0" />
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
      {/* Phones: ultra-clean compact icon-only toggle (tapping cycles Light ☀️ → Dark 🌙 → System 💻) */}
      <button
        type="button"
        onClick={cycleTheme}
        title={`Theme: ${active.label} (Tap to switch)`}
        aria-label={`Theme: ${active.label}. Tap to switch`}
        className={`sm:hidden h-8 w-8 xs:h-8.5 xs:w-8.5 inline-flex items-center justify-center rounded-lg text-xs font-semibold transition-all active:scale-90 cursor-pointer shrink-0 ${
          variant === 'glass'
            ? 'bg-slate-900/50 backdrop-blur-md border border-white/15 text-white/90 shadow-sm'
            : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`}
      >
        <ActiveIcon
          className={`w-4 h-4 transition-colors ${
            active.key === 'light'
              ? 'text-amber-500'
              : active.key === 'dark'
              ? 'text-blue-400'
              : 'text-slate-600 dark:text-slate-300'
          }`}
        />
      </button>

    <div
      className={`hidden sm:inline-flex items-center p-1 rounded-xl transition-colors ${
        variant === 'glass'
          ? 'bg-slate-900/50 backdrop-blur-md border border-white/15 text-white/80 shadow-sm'
          : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
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
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              isActive
                ? variant === 'glass'
                  ? 'bg-white text-slate-900 shadow-sm scale-100 font-bold'
                  : 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                : variant === 'glass'
                  ? 'text-white/80 hover:text-white hover:bg-white/10 opacity-90 hover:opacity-100'
                  : 'hover:text-white dark:hover:text-white hover:bg-white/5 opacity-70 hover:opacity-100'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="text-[11px]">{opt.label}</span>
          </button>
        );
      })}
    </div>
    </>
  );
}
