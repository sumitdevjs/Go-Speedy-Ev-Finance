'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import 'lenis/dist/lenis.css';

/**
 * SmoothScroll component:
 * Integrates Lenis with GSAP ScrollTrigger and GSAP ticker for ultra-smooth scrolling on both PC and mobile.
 */
export default function SmoothScroll({ children }) {
  const pathname = usePathname();
  const lenisRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Register ScrollTrigger plugin safely
    gsap.registerPlugin(ScrollTrigger);

    // Tell GSAP ticker to run at native display refresh rate (120Hz / 144Hz / 240Hz)
    gsap.ticker.fps(0);
    gsap.ticker.lagSmoothing(500, 33);

    // Initialize Lenis tuned for 120Hz monitors and ultra-smooth fluid momentum
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.0,
      syncTouch: false, // Allows native 120Hz GPU compositor on iOS/Android ProMotion displays
      allowNestedScroll: true,
      autoResize: true,
      prevent: (node) => {
        if (!node || node.nodeType !== 1) return false;
        return (
          node.hasAttribute('data-lenis-prevent') ||
          Boolean(node.closest?.('[data-lenis-prevent]')) ||
          Boolean(node.closest?.('.overflow-y-auto')) ||
          Boolean(node.closest?.('.overflow-auto')) ||
          Boolean(node.closest?.('.dropdown-scroll'))
        );
      },
    });

    lenisRef.current = lenis;
    window.__lenis = lenis;

    // Add Lenis's RAF to GSAP's 120Hz ticker loop in perfect lockstep
    const tickerUpdate = (time) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerUpdate);

    return () => {
      gsap.ticker.remove(tickerUpdate);
      lenis.destroy();
      delete window.__lenis;
      lenisRef.current = null;
    };
  }, []);

  // When pathname changes, reset scroll to top cleanly and refresh ScrollTrigger
  useEffect(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
      const timer = setTimeout(() => {
        ScrollTrigger.refresh();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  return <>{children}</>;
}
