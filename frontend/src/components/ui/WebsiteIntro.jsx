'use client';

import React, { useState, useEffect } from 'react';
import { Zap, X } from 'lucide-react';

export default function WebsiteIntro() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  const handleDismiss = () => {
    setFading(true);
    setTimeout(() => setVisible(false), 450);
  };

  useEffect(() => {
    // 2.2s intro duration then smooth 600ms dissolve
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 2400);

    const removeTimer = setTimeout(() => {
      setVisible(false);
    }, 2950);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      onClick={handleDismiss}
      className={`fixed inset-0 z-[999999] bg-[#050811] flex flex-col items-center justify-center cursor-pointer select-none transition-all duration-700 ${
        fading ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      title="Click anywhere to skip intro"
    >
      {/* Top right skip button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDismiss();
        }}
        className="absolute top-6 right-6 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white text-xs font-medium transition-colors"
      >
        <span>Skip Intro</span>
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Ambient background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[800px] h-[600px] sm:h-[800px] bg-emerald-500/10 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-cyan-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 text-center px-4 max-w-2xl mx-auto flex flex-col items-center animate-in fade-in zoom-in-95 duration-700">
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

        {/* Cinematic Progress Line */}
        <div className="mt-10 sm:mt-12 flex flex-col items-center gap-2">
          <div className="w-44 sm:w-60 h-1 bg-slate-800/80 rounded-full overflow-hidden border border-emerald-500/20">
            <div className="h-full bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 rounded-full animate-[introProgress_2.4s_cubic-bezier(0.4,0,0.2,1)_forwards]" />
          </div>
          <span className="text-[10px] sm:text-xs text-slate-500 font-mono tracking-wider">
            Click anywhere or press ESC to skip
          </span>
        </div>
      </div>
    </div>
  );
}
