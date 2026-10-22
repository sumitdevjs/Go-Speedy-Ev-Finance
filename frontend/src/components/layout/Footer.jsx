'use client';

import React from 'react';
import { Leaf } from 'lucide-react';

export default function DashboardFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full mt-auto px-3.5 sm:px-5 md:px-6 pb-6 pt-2 select-none">
      <div className="w-full">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-white/95 via-blue-50/70 to-emerald-50/60 dark:from-[#081220] dark:via-[#0c1a2f] dark:to-[#071325] backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-sm dark:shadow-[0_8px_30px_rgb(0,0,0,0.35)] text-slate-900 dark:text-white transition-colors duration-300">
          
          {/* ── Background Illustration: Integrated City Skyline, Trees & EV Scooter Silhouette ── */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-end justify-center">
            <svg
              className="w-full h-full max-w-[850px] opacity-[0.16] sm:opacity-[0.22] dark:opacity-[0.12] dark:sm:opacity-[0.16] transition-opacity duration-300"
              viewBox="0 0 1000 120"
              preserveAspectRatio="xMidYMax meet"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Skyline Gradient Light */}
                <linearGradient id="footerSkylineGradLight" x1="0" y1="0" x2="0" y2="120" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.08" />
                </linearGradient>

                {/* Skyline Gradient Dark */}
                <linearGradient id="footerSkylineGradDark" x1="0" y1="0" x2="0" y2="120" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.08" />
                </linearGradient>

                {/* Scooter Gradient */}
                <linearGradient id="footerScooterGrad" x1="450" y1="40" x2="550" y2="115" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.5" />
                </linearGradient>

                {/* Edge fade mask so illustration stays soft behind text */}
                <linearGradient id="footerCenterMask" x1="0" y1="0" x2="1000" y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="black" stopOpacity="0.05" />
                  <stop offset="25%" stopColor="white" stopOpacity="0.3" />
                  <stop offset="42%" stopColor="white" stopOpacity="1" />
                  <stop offset="65%" stopColor="white" stopOpacity="1" />
                  <stop offset="82%" stopColor="white" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="black" stopOpacity="0.05" />
                </linearGradient>
                <mask id="footerIllustrationMask">
                  <rect width="1000" height="120" fill="url(#footerCenterMask)" />
                </mask>
              </defs>

              <g mask="url(#footerIllustrationMask)">
                {/* Distant Subtle Skyline */}
                <rect x="280" y="38" width="22" height="77" fill="url(#footerSkylineGradLight)" className="dark:hidden" rx="2" />
                <rect x="280" y="38" width="22" height="77" fill="url(#footerSkylineGradDark)" className="hidden dark:block" rx="2" />

                <rect x="306" y="52" width="26" height="63" fill="url(#footerSkylineGradLight)" className="dark:hidden" rx="2" />
                <rect x="306" y="52" width="26" height="63" fill="url(#footerSkylineGradDark)" className="hidden dark:block" rx="2" />

                <rect x="336" y="28" width="18" height="87" fill="url(#footerSkylineGradLight)" className="dark:hidden" rx="2" />
                <rect x="336" y="28" width="18" height="87" fill="url(#footerSkylineGradDark)" className="hidden dark:block" rx="2" />

                <rect x="358" y="44" width="30" height="71" fill="url(#footerSkylineGradLight)" className="dark:hidden" rx="2" />
                <rect x="358" y="44" width="30" height="71" fill="url(#footerSkylineGradDark)" className="hidden dark:block" rx="2" />

                <rect x="392" y="58" width="24" height="57" fill="url(#footerSkylineGradLight)" className="dark:hidden" rx="2" />
                <rect x="392" y="58" width="24" height="57" fill="url(#footerSkylineGradDark)" className="hidden dark:block" rx="2" />

                {/* Right-side skyline */}
                <rect x="580" y="48" width="24" height="67" fill="url(#footerSkylineGradLight)" className="dark:hidden" rx="2" />
                <rect x="580" y="48" width="24" height="67" fill="url(#footerSkylineGradDark)" className="hidden dark:block" rx="2" />

                <rect x="608" y="32" width="20" height="83" fill="url(#footerSkylineGradLight)" className="dark:hidden" rx="2" />
                <rect x="608" y="32" width="20" height="83" fill="url(#footerSkylineGradDark)" className="hidden dark:block" rx="2" />

                <rect x="632" y="50" width="28" height="65" fill="url(#footerSkylineGradLight)" className="dark:hidden" rx="2" />
                <rect x="632" y="50" width="28" height="65" fill="url(#footerSkylineGradDark)" className="hidden dark:block" rx="2" />

                <rect x="664" y="40" width="22" height="75" fill="url(#footerSkylineGradLight)" className="dark:hidden" rx="2" />
                <rect x="664" y="40" width="22" height="75" fill="url(#footerSkylineGradDark)" className="hidden dark:block" rx="2" />

                <rect x="690" y="55" width="25" height="60" fill="url(#footerSkylineGradLight)" className="dark:hidden" rx="2" />
                <rect x="690" y="55" width="25" height="60" fill="url(#footerSkylineGradDark)" className="hidden dark:block" rx="2" />

                {/* Clean Trees & Landscape Foliage */}
                <circle cx="425" cy="88" r="14" fill="#10b981" opacity="0.4" />
                <circle cx="438" cy="85" r="11" fill="#059669" opacity="0.45" />
                <circle cx="560" cy="88" r="13" fill="#10b981" opacity="0.4" />
                <circle cx="572" cy="86" r="10" fill="#059669" opacity="0.45" />

                {/* Electric Scooter Silhouette (Center Focus) */}
                <g transform="translate(470, 50) scale(0.70)">
                  {/* Back Wheel */}
                  <circle cx="20" cy="76" r="13" stroke="url(#footerScooterGrad)" strokeWidth="3.2" fill="none" />
                  <circle cx="20" cy="76" r="5" fill="#10b981" opacity="0.6" />
                  {/* Front Wheel */}
                  <circle cx="88" cy="76" r="13" stroke="url(#footerScooterGrad)" strokeWidth="3.2" fill="none" />
                  <circle cx="88" cy="76" r="5" fill="#10b981" opacity="0.6" />
                  {/* Deck / Footboard */}
                  <path d="M22 75 L76 75" stroke="url(#footerScooterGrad)" strokeWidth="4.5" strokeLinecap="round" />
                  {/* Steering Column & Handlebar */}
                  <path d="M72 74 L84 22 L75 22 M84 22 L89 22" stroke="url(#footerScooterGrad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                  {/* Front subtle headlight glow accent */}
                  <circle cx="88" cy="24" r="2.5" fill="#0ea5e9" opacity="0.9" />
                </g>

                {/* Clean Ground / Road Line */}
                <line x1="200" y1="115" x2="800" y2="115" stroke="#0ea5e9" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="6 6" />
              </g>
            </svg>
          </div>

          {/* ── Main Content Area: Responsive Typography, High Contrast & Perfectly Aligned ── */}
          <div className="relative z-10 px-4 py-3.5 sm:px-6 md:px-8 sm:py-4.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              
              {/* Left Side: Leaf Icon + Brand Title & Subtitle */}
              <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                <div className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
                  <Leaf className="h-4.5 w-4.5 sm:h-5 sm:w-5 fill-emerald-500/20 dark:fill-emerald-400/20" />
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs xs:text-sm sm:text-[15px] font-extrabold text-slate-900 dark:text-white tracking-tight">
                      Driving a Cleaner Tomorrow
                    </h4>
                    {/* Badge */}
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] xs:text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Clean Mobility
                    </span>
                  </div>
                  <p className="text-[10px] xs:text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5 leading-snug">
                    Track. Manage. Accelerate. For a sustainable Delhi future.
                  </p>
                </div>
              </div>

              {/* Desktop / Tablet Right Tagline */}
              <div className="hidden sm:flex items-center gap-3 shrink-0 text-right">
                <div>
                  <p className="text-xs md:text-[13px] font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
                    Zero-Emission Fleet
                  </p>
                  <p className="text-[9px] sm:text-[10px] md:text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-none font-medium">
                    Smart Fleet Operations
                  </p>
                </div>
              </div>
            </div>

            {/* ── Bottom Sub-Bar: Copyright & System Status ── */}
            <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-bold text-slate-800 dark:text-slate-200">Go Speedy EV Pvt. Ltd.</span>
                <span className="opacity-40">•</span>
                <span>Fleet Governance &amp; Telemetry</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span>© {currentYear}</span>
                <span className="opacity-40">•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">100% Green Mobility</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </footer>
  );
}
