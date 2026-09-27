'use client';

import React, { useState, useEffect, useRef } from 'react';
import { gsap } from '../../lib/gsap';

export default function WebsiteIntro() {
  const [shouldRender, setShouldRender] = useState(false);
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const glowRef = useRef(null);
  const logoRef = useRef(null);
  const line1Ref = useRef(null);
  const line2Ref = useRef(null);
  const line3Ref = useRef(null);

  // Check if intro has already been shown in this browser session
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const forceReplay = urlParams.has('intro') || urlParams.has('replay');
        const hasShown = sessionStorage.getItem('gospeedy_intro_shown');

        if (!hasShown || forceReplay) {
          sessionStorage.setItem('gospeedy_intro_shown', 'true');
          setShouldRender(true);
        }
      }
    } catch (e) {
      // Fallback
    }
  }, []);

  // GSAP animation runs only once when shouldRender becomes true on initial website load
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
      }, 1600);
      return () => clearTimeout(timer);
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          // Smooth fade-out into the main website / login page
          gsap.to(containerRef.current, {
            opacity: 0,
            duration: 0.5,
            ease: 'power2.inOut',
            onComplete: () => setShouldRender(false),
          });
        },
      });

      // 1. Center radial ambient glow
      tl.fromTo(
        glowRef.current,
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1.05, duration: 1.0, ease: 'power2.out' },
        0
      );

      // 2. Brand logo reveal
      tl.fromTo(
        logoRef.current,
        { opacity: 0, y: 16, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1.0, duration: 0.6, ease: 'back.out(1.2)' },
        0.08
      );

      // 3. Staggered reveal of all 3 lines
      tl.fromTo(
        [line1Ref.current, line2Ref.current, line3Ref.current],
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.12, ease: 'power2.out' },
        0.24
      );

      // 4. Hold state so user reads all three lines clearly (~1.8 seconds)
      tl.to({}, { duration: 1.8 }, 0.9);

      // 5. Smooth exit transition
      tl.to(
        contentRef.current,
        { opacity: 0, y: -10, scale: 0.98, duration: 0.45, ease: 'power2.inOut' },
        2.7
      );
    }, containerRef);

    // Allow user to click anywhere or press Escape to skip immediately
    const handleSkip = () => {
      gsap.killTweensOf(containerRef.current);
      gsap.killTweensOf(contentRef.current);
      gsap.to(containerRef.current, {
        opacity: 0,
        duration: 0.35,
        ease: 'power2.inOut',
        onComplete: () => setShouldRender(false),
      });
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        handleSkip();
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
    <aside
      ref={containerRef}
      aria-label="Website Introduction"
      className="fixed inset-0 z-[999999] bg-[#050811] flex items-center justify-center overflow-hidden select-none cursor-pointer"
      onClick={() => {
        // Quick skip on click
        gsap.to(containerRef.current, {
          opacity: 0,
          duration: 0.3,
          ease: 'power2.inOut',
          onComplete: () => setShouldRender(false),
        });
      }}
      style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Ambient background glow & subtle vignette */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Subtle dark radial backdrop */}
        <div
          ref={glowRef}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] sm:w-[620px] md:w-[750px] h-[480px] sm:h-[620px] md:h-[750px] rounded-full bg-gradient-to-tr from-emerald-500/15 via-teal-500/10 to-sky-500/15 blur-[120px] will-change-transform"
        />
        {/* Edge vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,#050811_95%)]" />
      </div>

      {/* Centered Brand Lockup: Logo + 3 Exact Lines */}
      <div
        ref={contentRef}
        className="relative z-10 flex flex-col items-center justify-center text-center px-6 max-w-4xl mx-auto will-change-transform"
      >
        {/* Brand Logo */}
        <div ref={logoRef} className="relative mb-5 sm:mb-7 shrink-0">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl -z-10 scale-125" />
          <img
            src="/logo-user-transparent.png"
            alt="Go Speedy EV"
            className="h-16 sm:h-20 md:h-24 w-auto object-contain mx-auto drop-shadow-[0_12px_32px_rgba(0,0,0,0.8)]"
          />
        </div>

        {/* Line 1: Go Speedy Pvt. Ltd */}
        <div
          ref={line1Ref}
          className="text-xs sm:text-sm md:text-base font-semibold tracking-[0.26em] uppercase text-emerald-400 mb-2 sm:mb-3 drop-shadow-sm"
        >
          Go Speedy Pvt. Ltd
        </div>

        {/* Line 2: Welcome to The Future */}
        <h1
          ref={line2Ref}
          className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight mb-2 sm:mb-3 drop-shadow-[0_4px_24px_rgba(255,255,255,0.18)]"
        >
          Welcome to The Future
        </h1>

        {/* Line 3: The House of Ev */}
        <p
          ref={line3Ref}
          className="text-sm xs:text-base sm:text-lg md:text-xl font-medium tracking-[0.22em] uppercase text-cyan-300 drop-shadow-sm"
        >
          The House of Ev
        </p>
      </div>

      {/* Subtle bottom skip hint */}
      <div className="absolute bottom-6 sm:bottom-8 inset-x-0 text-center pointer-events-none">
        <span className="text-[11px] sm:text-xs font-medium tracking-widest text-slate-600 uppercase">
          Click anywhere or press Esc to skip
        </span>
      </div>
    </aside>
  );
}
