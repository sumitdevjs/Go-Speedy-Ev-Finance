'use client';

import React, { useEffect, useRef } from 'react';
import { Leaf, ArrowRight } from 'lucide-react';
import { gsap } from '../../lib/gsap';

export default function SustainabilityBanner() {
  const bannerRef = useRef(null);

  useEffect(() => {
    if (bannerRef.current) {
      gsap.fromTo(
        bannerRef.current,
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: 'power2.out',
          clearProps: 'transform',
        }
      );
    }
  }, []);

  return (
    <div className="relative w-full mt-8 px-0">
      <div className="w-full mx-auto">
        <div
          ref={bannerRef}
          className="pointer-events-auto w-full overflow-hidden rounded-2xl bg-gradient-to-r from-white/95 via-blue-50/80 to-emerald-50/60 dark:from-[#081220]/95 dark:via-[#0c1a2f]/95 dark:to-[#071325]/95 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-lg dark:shadow-[0_8px_30px_rgb(0,0,0,0.55)] text-slate-900 dark:text-white select-none transition-colors duration-300"
        >
      {/* ── Background Illustration: Integrated City Skyline, Trees & EV Scooter Silhouette ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-end justify-center">
        <svg
          className="w-full h-full min-w-[700px] opacity-[0.20] dark:opacity-[0.18] transition-opacity duration-300"
          viewBox="0 0 1000 120"
          preserveAspectRatio="xMidYMax slice"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Skyline Gradient Light */}
            <linearGradient id="skylineGradLight" x1="0" y1="0" x2="0" y2="120" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.05" />
            </linearGradient>

            {/* Skyline Gradient Dark */}
            <linearGradient id="skylineGradDark" x1="0" y1="0" x2="0" y2="120" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.05" />
            </linearGradient>

            {/* Scooter Gradient */}
            <linearGradient id="scooterGrad" x1="450" y1="40" x2="550" y2="115" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.4" />
            </linearGradient>

            {/* Edge fade mask so illustration stays in center and never overlaps text */}
            <linearGradient id="centerMask" x1="0" y1="0" x2="1000" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="black" stopOpacity="0" />
              <stop offset="20%" stopColor="white" stopOpacity="0.15" />
              <stop offset="38%" stopColor="white" stopOpacity="1" />
              <stop offset="68%" stopColor="white" stopOpacity="1" />
              <stop offset="85%" stopColor="white" stopOpacity="0.15" />
              <stop offset="100%" stopColor="black" stopOpacity="0" />
            </linearGradient>
            <mask id="illustrationMask">
              <rect width="1000" height="120" fill="url(#centerMask)" />
            </mask>
          </defs>

          <g mask="url(#illustrationMask)">
            {/* Distant Subtle Skyline */}
            <rect x="280" y="38" width="22" height="77" fill="url(#skylineGradLight)" className="dark:hidden" rx="2" />
            <rect x="280" y="38" width="22" height="77" fill="url(#skylineGradDark)" className="hidden dark:block" rx="2" />

            <rect x="306" y="52" width="26" height="63" fill="url(#skylineGradLight)" className="dark:hidden" rx="2" />
            <rect x="306" y="52" width="26" height="63" fill="url(#skylineGradDark)" className="hidden dark:block" rx="2" />

            <rect x="336" y="28" width="18" height="87" fill="url(#skylineGradLight)" className="dark:hidden" rx="2" />
            <rect x="336" y="28" width="18" height="87" fill="url(#skylineGradDark)" className="hidden dark:block" rx="2" />

            <rect x="358" y="44" width="30" height="71" fill="url(#skylineGradLight)" className="dark:hidden" rx="2" />
            <rect x="358" y="44" width="30" height="71" fill="url(#skylineGradDark)" className="hidden dark:block" rx="2" />

            <rect x="392" y="58" width="24" height="57" fill="url(#skylineGradLight)" className="dark:hidden" rx="2" />
            <rect x="392" y="58" width="24" height="57" fill="url(#skylineGradDark)" className="hidden dark:block" rx="2" />

            {/* Right-side skyline */}
            <rect x="580" y="48" width="24" height="67" fill="url(#skylineGradLight)" className="dark:hidden" rx="2" />
            <rect x="580" y="48" width="24" height="67" fill="url(#skylineGradDark)" className="hidden dark:block" rx="2" />

            <rect x="608" y="32" width="20" height="83" fill="url(#skylineGradLight)" className="dark:hidden" rx="2" />
            <rect x="608" y="32" width="20" height="83" fill="url(#skylineGradDark)" className="hidden dark:block" rx="2" />

            <rect x="632" y="50" width="28" height="65" fill="url(#skylineGradLight)" className="dark:hidden" rx="2" />
            <rect x="632" y="50" width="28" height="65" fill="url(#skylineGradDark)" className="hidden dark:block" rx="2" />

            <rect x="664" y="40" width="22" height="75" fill="url(#skylineGradLight)" className="dark:hidden" rx="2" />
            <rect x="664" y="40" width="22" height="75" fill="url(#skylineGradDark)" className="hidden dark:block" rx="2" />

            <rect x="690" y="55" width="25" height="60" fill="url(#skylineGradLight)" className="dark:hidden" rx="2" />
            <rect x="690" y="55" width="25" height="60" fill="url(#skylineGradDark)" className="hidden dark:block" rx="2" />

            {/* Clean Trees & Landscape Foliage */}
            <circle cx="425" cy="88" r="14" fill="#10b981" opacity="0.35" />
            <circle cx="438" cy="85" r="11" fill="#059669" opacity="0.4" />
            <circle cx="560" cy="88" r="13" fill="#10b981" opacity="0.35" />
            <circle cx="572" cy="86" r="10" fill="#059669" opacity="0.4" />

            {/* Electric Scooter Silhouette (Center Focus) */}
            <g transform="translate(470, 52) scale(0.68)">
              {/* Back Wheel */}
              <circle cx="20" cy="76" r="13" stroke="url(#scooterGrad)" strokeWidth="3.2" fill="none" />
              <circle cx="20" cy="76" r="5" fill="#10b981" opacity="0.6" />
              {/* Front Wheel */}
              <circle cx="88" cy="76" r="13" stroke="url(#scooterGrad)" strokeWidth="3.2" fill="none" />
              <circle cx="88" cy="76" r="5" fill="#10b981" opacity="0.6" />
              {/* Deck / Footboard */}
              <path d="M22 75 L76 75" stroke="url(#scooterGrad)" strokeWidth="4.5" strokeLinecap="round" />
              {/* Steering Column & Handlebar */}
              <path d="M72 74 L84 22 L75 22 M84 22 L89 22" stroke="url(#scooterGrad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              {/* Front subtle headlight glow accent */}
              <circle cx="88" cy="24" r="2.5" fill="#0ea5e9" opacity="0.9" />
            </g>

            {/* Clean Ground / Road Line */}
            <line x1="200" y1="115" x2="800" y2="115" stroke="#0ea5e9" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="6 6" />
          </g>
        </svg>
      </div>

      {/* ── Content Container: Generous Padding, Proper Alignments for Both Themes ── */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 px-4 py-3.5 sm:px-6 md:px-8 sm:py-4 md:py-5">
        {/* Left Side: Leaf Icon + Heading & Subtitle */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-xl bg-emerald-100/90 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs transition-colors">
            <Leaf className="h-4.5 w-4.5 sm:h-5 sm:w-5 fill-emerald-600/20 dark:fill-emerald-400/20" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm md:text-[15px] font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
              Driving a Cleaner Tomorrow
            </h4>
            <p className="text-[10px] sm:text-[11px] md:text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-normal truncate sm:whitespace-normal">
              Track. Manage. Accelerate. For a sustainable future.
            </p>
          </div>
        </div>

        {/* Right Side: Clean Mobility + Subtitle + Small Arrow */}
        <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
          <div className="text-right">
            <p className="text-xs md:text-[13px] font-bold text-slate-900 dark:text-white tracking-tight leading-none">
              Clean Mobility
            </p>
            <p className="text-[9px] sm:text-[10px] md:text-[11px] text-slate-400 dark:text-slate-500 mt-1 leading-none">
              Brighter Futures
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>
  );
}
