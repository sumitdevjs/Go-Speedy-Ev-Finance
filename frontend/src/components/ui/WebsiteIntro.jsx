'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Leaf, Users, TrendingUp } from 'lucide-react';
import { gsap } from '../../lib/gsap';

export default function WebsiteIntro() {
  const [shouldRender, setShouldRender] = useState(false);
  const containerRef = useRef(null);
  const bgRef = useRef(null);
  const headerRef = useRef(null);
  const eyebrowRef = useRef(null);
  const headingRef = useRef(null);
  const subtextRef = useRef(null);
  const featuresRef = useRef(null);
  const footerRef = useRef(null);
  const progressLineRef = useRef(null);

  // Check if intro has already been shown in this browser session
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const hasShown = sessionStorage.getItem('gospeedy_intro_shown');
        if (!hasShown) {
          // Mark immediately so login, logout, page refreshes, and navigation NEVER replay it
          sessionStorage.setItem('gospeedy_intro_shown', 'true');
          setShouldRender(true);
        }
      }
    } catch (e) {
      // Fallback
    }
  }, []);

  // GSAP animation runs only once when shouldRender becomes true on initial website start
  useEffect(() => {
    if (!shouldRender || !containerRef.current) return;

    // Respect prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      const timer = setTimeout(() => {
        gsap.to(containerRef.current, {
          opacity: 0,
          duration: 0.4,
          ease: 'power2.inOut',
          onComplete: () => setShouldRender(false),
        });
      }, 2200);
      return () => clearTimeout(timer);
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'power2.out' },
        onComplete: () => {
          // Smooth crossfade into the main login / dashboard page
          gsap.to(containerRef.current, {
            opacity: 0,
            duration: 0.55,
            ease: 'power2.inOut',
            onComplete: () => setShouldRender(false),
          });
        },
      });

      // 1. Background image subtle fade & scale
      tl.fromTo(
        bgRef.current,
        { opacity: 0, scale: 1.05 },
        { opacity: 1, scale: 1.0, duration: 1.2, ease: 'power1.out' },
        0
      );

      // 2. Header logo & initiative label
      tl.fromTo(
        headerRef.current,
        { opacity: 0, y: -8 },
        { opacity: 1, y: 0, duration: 0.4 },
        0.08
      );

      // 3. Eyebrow "ELECTRIC MOBILITY"
      tl.fromTo(
        eyebrowRef.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.35 },
        0.18
      );

      // 4. Main heading "Move cleaner. Go further."
      tl.fromTo(
        headingRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5 },
        0.26
      );

      // 5. Supporting text "EV rentals • Fleet • Finance"
      tl.fromTo(
        subtextRef.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.35 },
        0.38
      );

      // 6. Feature indicators stagger
      if (featuresRef.current?.children) {
        tl.fromTo(
          featuresRef.current.children,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.35, stagger: 0.06 },
          0.48
        );
      }

      // 7. Footer area & progress bar line
      tl.fromTo(
        footerRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.4 },
        0.25
      );

      tl.fromTo(
        progressLineRef.current,
        { width: '0%' },
        { width: '100%', duration: 2.3, ease: 'power1.inOut' },
        0.15
      );

      // Hold complete state until 2.6s mark, then trigger smooth crossfade
      tl.to({}, { duration: 0.2 }, 2.5);
    }, containerRef);

    // Allow skip with ESC
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        gsap.killTweensOf(containerRef.current);
        gsap.to(containerRef.current, {
          opacity: 0,
          duration: 0.3,
          ease: 'power2.inOut',
          onComplete: () => setShouldRender(false),
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      ctx.revert();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shouldRender]);

  if (!shouldRender) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[999999] bg-[#070b14] overflow-hidden select-none"
      style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Realistic EV Scooter Background Photograph */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          ref={bgRef}
          src="/ev-hero-bg.webp"
          alt="GoSpeedy Electric Mobility"
          className="w-full h-full object-cover object-[72%_center] sm:object-right md:object-right will-change-transform"
        />

        {/* Photorealistic Dark Gradients for Text Contrast */}
        {/* Left-to-right gradient for typography readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#070b14]/95 via-[#070b14]/65 sm:via-[#070b14]/40 to-transparent pointer-events-none" />
        {/* Top-to-bottom vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#070b14]/60 via-transparent to-[#070b14]/80 pointer-events-none" />
      </div>

      {/* Main UI Overlay Container */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between p-6 sm:p-10 md:p-12 lg:p-16 max-w-[1700px] mx-auto pointer-events-none">
        {/* Top Header */}
        <header ref={headerRef} className="flex items-center justify-between gap-4 w-full">
          {/* Top-left: [Speedy GO EV logo] | [GROUP logo] */}
          <div className="flex items-center">
            <img
              src="/logo-user-transparent.png"
              alt="Speedy GO EV | GROUP"
              className="h-10 sm:h-12 md:h-13 w-auto object-contain shrink-0 drop-shadow-md"
            />
          </div>

          {/* Top-right: — A BS GROUP INITIATIVE */}
          <div className="text-[10px] sm:text-xs font-semibold tracking-[0.22em] text-slate-400 uppercase whitespace-nowrap">
            — A BS GROUP INITIATIVE
          </div>
        </header>

        {/* Main Content (Left Side) */}
        <main className="max-w-xl lg:max-w-2xl my-auto py-4 sm:py-8">
          {/* Eyebrow: ELECTRIC MOBILITY */}
          <p
            ref={eyebrowRef}
            className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 mb-3 sm:mb-4"
          >
            ELECTRIC MOBILITY
          </p>

          {/* Main Heading: Move cleaner. Go further. */}
          <h1
            ref={headingRef}
            className="text-[38px] sm:text-[54px] md:text-[66px] lg:text-[74px] font-extrabold text-white tracking-tight leading-[1.05]"
          >
            Move cleaner.<br />
            <span className="text-[#0ea5e9]">Go further.</span>
          </h1>

          {/* Supporting text: EV rentals • Fleet • Finance */}
          <p
            ref={subtextRef}
            className="text-sm sm:text-base font-normal text-slate-300/90 tracking-wide mt-4 sm:mt-5 flex items-center gap-2.5"
          >
            <span>EV rentals</span>
            <span className="text-slate-500 font-bold">•</span>
            <span>Fleet</span>
            <span className="text-slate-500 font-bold">•</span>
            <span>Finance</span>
          </p>

          {/* Feature Indicators (Vertical icon-top layout matching reference image) */}
          <div
            ref={featuresRef}
            className="flex items-start gap-8 sm:gap-11 md:gap-14 mt-8 sm:mt-11 pt-1"
          >
            {/* Cleaner Cities */}
            <div className="flex flex-col items-start gap-2">
              <Leaf className="w-5 h-5 text-[#0ea5e9]" strokeWidth={2.2} />
              <div>
                <p className="text-xs sm:text-sm font-bold text-white leading-tight">
                  Cleaner
                </p>
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5">
                  Cities
                </p>
              </div>
            </div>

            {/* Smarter Operations */}
            <div className="flex flex-col items-start gap-2">
              <Users className="w-5 h-5 text-[#0ea5e9]" strokeWidth={2.2} />
              <div>
                <p className="text-xs sm:text-sm font-bold text-white leading-tight">
                  Smarter
                </p>
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5">
                  Operations
                </p>
              </div>
            </div>

            {/* Greener Tomorrow */}
            <div className="flex flex-col items-start gap-2">
              <TrendingUp className="w-5 h-5 text-[#0ea5e9]" strokeWidth={2.2} />
              <div>
                <p className="text-xs sm:text-sm font-bold text-white leading-tight">
                  Greener
                </p>
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5">
                  Tomorrow
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* Bottom Area */}
        <footer
          ref={footerRef}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 w-full pt-4"
        >
          {/* Bottom-left: GO SPEEDY PVT. LTD. + Progress indicator */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[10px] sm:text-xs font-semibold tracking-wider text-slate-400 uppercase">
              GO SPEEDY PVT. LTD.
            </span>
            <div className="flex items-center gap-3">
              <div className="w-44 sm:w-60 h-[2px] bg-slate-800 rounded-full overflow-hidden">
                <div
                  ref={progressLineRef}
                  className="h-full bg-gradient-to-r from-sky-400 to-[#0ea5e9] rounded-full shadow-[0_0_8px_rgba(14,165,233,0.5)]"
                  style={{ width: '0%' }}
                />
              </div>
              <span className="text-[10px] sm:text-xs font-mono font-medium text-slate-400">
                01 / 03
              </span>
            </div>
          </div>

          {/* Bottom-right: PEOPLE · PLANET · PROGRESS — */}
          <div className="text-[10px] sm:text-xs font-medium tracking-[0.22em] text-slate-400 uppercase whitespace-nowrap pb-0.5">
            PEOPLE &nbsp;·&nbsp; PLANET &nbsp;·&nbsp; PROGRESS —
          </div>
        </footer>
      </div>
    </div>
  );
}
