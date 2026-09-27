'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
}) {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let timeoutId;
    if (isOpen) {
      setShouldRender(true);
      const frameId = requestAnimationFrame(() => {
        setActive(true);
      });

      // Lock scroll
      document.body.style.overflow = 'hidden';
      if (typeof window !== 'undefined' && window.__lenis) {
        window.__lenis.stop();
      }

      return () => {
        cancelAnimationFrame(frameId);
      };
    } else {
      setActive(false);
      timeoutId = setTimeout(() => {
        setShouldRender(false);
      }, 200);

      // Unlock scroll
      document.body.style.overflow = '';
      if (typeof window !== 'undefined' && window.__lenis) {
        window.__lenis.start();
      }
    }

    return () => {
      clearTimeout(timeoutId);
      document.body.style.overflow = '';
      if (typeof window !== 'undefined' && window.__lenis) {
        window.__lenis.start();
      }
    };
  }, [isOpen]);

  // Keyboard escape handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!mounted || !shouldRender) return null;

  let portalRoot = document.getElementById('modal-portal-root');
  if (!portalRoot && typeof document !== 'undefined') {
    portalRoot = document.createElement('div');
    portalRoot.id = 'modal-portal-root';
    document.body.appendChild(portalRoot);
  }

  if (!portalRoot) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex flex-col justify-end sm:justify-center items-center transition-opacity duration-200 ${
        active ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Blurred Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity duration-200 ${
          active ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => onClose?.()}
      />

      {/* Modal Container */}
      <div
        className={`relative z-10 w-full sm:w-auto sm:${maxWidth} bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl text-left shadow-2xl border border-slate-200/80 dark:border-white/15 rounded-t-2xl sm:rounded-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col mx-0 sm:mx-4 transition-all duration-200 ease-out transform ${
          active ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-3'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 px-5 py-4 shrink-0">
          <div className="min-w-0 pr-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-smooth shrink-0 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1" data-lenis-prevent>
          {children}
        </div>
      </div>
    </div>,
    portalRoot
  );
}
