import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { gsap, animateModalIn, animateModalOut } from '../../lib/gsap';

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
}) {
  const modalRef = useRef(null);
  const backdropRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Lock body scroll and trigger GSAP entrance when modal opens
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (modalRef.current) {
        animateModalIn(modalRef.current);
      }
      if (backdropRef.current) {
        gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25 });
      }
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleClose = () => {
    if (modalRef.current) {
      animateModalOut(modalRef.current, () => {
        onClose();
      });
      if (backdropRef.current) {
        gsap.to(backdropRef.current, { opacity: 0, duration: 0.2 });
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center">
      {/* Blurred Backdrop */}
      <div
        ref={backdropRef}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Container — Bottom sheet on mobile, Centered on sm+ with Apple blur & GSAP entrance */}
      <div
        ref={modalRef}
        className={`relative z-10 w-full sm:w-auto sm:${maxWidth} bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl text-left shadow-2xl border border-slate-200/80 dark:border-white/15 rounded-t-2xl sm:rounded-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col mx-0 sm:mx-4 transition-colors`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 px-5 py-4 shrink-0">
          <div className="min-w-0 pr-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-smooth shrink-0 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
