'use client';

import React, { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';

export default function WebsiteIntro() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Exact 2 second display, then smooth 500ms dissolve
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 2000);

    const removeTimer = setTimeout(() => {
      setVisible(false);
    }, 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[999999] bg-[#050811] flex flex-col items-center justify-center select-none transition-all duration-500 pointer-events-none ${
        fading ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
      }`}
    >
      {/* Ambient background glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[800px] h-[600px] sm:h-[800px] bg-emerald-500/12 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-cyan-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 text-center px-4 max-w-2xl mx-auto flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
        {/* User Logo */}
        <img
          src="/logo-user-transparent.png"
          alt="Go Speedy EV"
          className="h-16 sm:h-20 w-auto object-contain mb-6 drop-shadow-[0_0_35px_rgba(56,189,248,0.45)]"
        />

        {/* Line 1: Go Speedy Pvt. Ltd */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-emerald-400 text-xs sm:text-sm font-extrabold tracking-widest uppercase mb-5 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
          <Zap className="w-4 h-4 fill-emerald-400 text-emerald-400 animate-pulse" />
          <span>Go Speedy Pvt. Ltd</span>
        </div>

        {/* Line 2: Welcome to The Future */}
        <h1 className="text-3xl xxs:text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight leading-[1.08]">
          Welcome to <br className="sm:hidden" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 drop-shadow-[0_0_40px_rgba(16,185,129,0.5)]">
            The Future
          </span>
        </h1>

        {/* Line 3: The House of Ev */}
        <div className="mt-5 flex items-center justify-center gap-3 sm:gap-4">
          <span className="h-[2px] w-6 sm:w-12 bg-gradient-to-r from-transparent to-emerald-400 inline-block" />
          <p className="text-base xxs:text-lg sm:text-2xl md:text-3xl font-black uppercase tracking-[0.25em] text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">
            The House of Ev
          </p>
          <span className="h-[2px] w-6 sm:w-12 bg-gradient-to-l from-transparent to-emerald-400 inline-block" />
        </div>

        {/* Clean Glowing 2-second Progress Bar */}
        <div className="mt-10 sm:mt-12 w-44 sm:w-60 h-1 bg-slate-800/80 rounded-full overflow-hidden border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
          <div className="h-full bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 rounded-full animate-[introProgress_2s_linear_forwards]" />
        </div>
      </div>
    </div>
  );
}
