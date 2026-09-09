'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Draggable } from 'gsap/Draggable';
import { Flip } from 'gsap/Flip';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';

// Register plugins safely on client-side
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, Draggable, Flip, MotionPathPlugin);
}

/**
 * Animate numbers counting up smoothly
 * @param {HTMLElement|string} target - DOM element or selector
 * @param {number} endValue - final target number
 * @param {object} options - format options (prefix, suffix, decimals, duration)
 */
export const animateCounter = (target, endValue, options = {}) => {
  if (typeof window === 'undefined' || !target) return;
  const {
    prefix = '',
    suffix = '',
    duration = 1.2,
    ease = 'power2.out',
    decimals = 0,
    startValue = 0,
  } = options;

  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return;

  const obj = { val: startValue };
  return gsap.to(obj, {
    val: endValue,
    duration,
    ease,
    onUpdate: () => {
      const formatted = decimals > 0 ? obj.val.toFixed(decimals) : Math.round(obj.val).toLocaleString('en-IN');
      el.innerText = `${prefix}${formatted}${suffix}`;
    },
  });
};

/**
 * Staggered entrance animation for lists, grid cards, or rows
 * @param {Array|NodeList|string} elements
 * @param {object} options
 */
export const staggerFadeIn = (elements, options = {}) => {
  if (typeof window === 'undefined' || !elements) return;
  const {
    stagger = 0.08,
    duration = 0.6,
    y = 20,
    scale = 0.97,
    ease = 'back.out(1.4)',
    delay = 0,
    hover = false, // also give each element a subtle lift-on-hover (see attachCardHover)
  } = options;

  if (hover) {
    gsap.utils.toArray(elements).forEach((el) => {
      if (el.dataset.gsapHoverBound) return; // don't rebind on every re-render
      el.dataset.gsapHoverBound = 'true';
      attachCardHover(el);
    });
  }

  return gsap.fromTo(
    elements,
    { opacity: 0, y, scale },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration,
      stagger,
      ease,
      delay,
      clearProps: 'transform,opacity',
    }
  );
};

/**
 * Smooth pop & scale animation for modals
 * @param {HTMLElement} modalContentElement
 */
export const animateModalIn = (modalContentElement) => {
  if (typeof window === 'undefined' || !modalContentElement) return;
  gsap.killTweensOf(modalContentElement);
  return gsap.fromTo(
    modalContentElement,
    { opacity: 0, scale: 0.92, y: 15 },
    {
      opacity: 1,
      scale: 1,
      y: 0,
      duration: 0.35,
      ease: 'power3.out',
    }
  );
};

/**
 * Smooth exit animation for modals before unmounting
 * @param {HTMLElement} modalContentElement
 * @param {Function} onComplete
 */
export const animateModalOut = (modalContentElement, onComplete) => {
  if (typeof window === 'undefined' || !modalContentElement) {
    onComplete?.();
    return;
  }
  return gsap.to(modalContentElement, {
    opacity: 0,
    scale: 0.95,
    y: 10,
    duration: 0.2,
    ease: 'power2.in',
    onComplete,
  });
};

/**
 * Subtle interactive 3D physics hover on interactive cards
 * @param {HTMLElement} element
 */
export const attachCardHover = (element) => {
  if (typeof window === 'undefined' || !element) return () => {};

  const onMouseEnter = () => {
    gsap.to(element, {
      y: -4,
      scale: 1.015,
      duration: 0.25,
      ease: 'power2.out',
    });
  };

  const onMouseLeave = () => {
    gsap.to(element, {
      y: 0,
      scale: 1,
      duration: 0.3,
      ease: 'power2.out',
    });
  };

  element.addEventListener('mouseenter', onMouseEnter);
  element.addEventListener('mouseleave', onMouseLeave);

  return () => {
    element.removeEventListener('mouseenter', onMouseEnter);
    element.removeEventListener('mouseleave', onMouseLeave);
  };
};

export { gsap, ScrollTrigger, Draggable, Flip, MotionPathPlugin };
export default gsap;
