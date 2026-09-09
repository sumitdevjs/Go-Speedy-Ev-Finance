'use client';

import React, { useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { gsap } from '../../lib/gsap';

const VARIANTS = {
  success: {
    icon: CheckCircle2,
    ring: 'border-emerald-200 dark:border-emerald-500/30',
    iconWrap: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    bar: 'bg-emerald-500',
  },
  error: {
    icon: XCircle,
    ring: 'border-rose-200 dark:border-rose-500/30',
    iconWrap: 'bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400',
    bar: 'bg-rose-500',
  },
  warning: {
    icon: AlertTriangle,
    ring: 'border-amber-200 dark:border-amber-500/30',
    iconWrap: 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400',
    bar: 'bg-amber-500',
  },
  info: {
    icon: Info,
    ring: 'border-blue-200 dark:border-blue-500/30',
    iconWrap: 'bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400',
    bar: 'bg-blue-500',
  },
};

function ToastItem({ toast, onDone }) {
  const ref = useRef(null);
  const barRef = useRef(null);
  const v = VARIANTS[toast.variant] || VARIANTS.info;
  const Icon = v.icon;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    gsap.fromTo(
      el,
      { opacity: 0, x: 48, scale: 0.95 },
      { opacity: 1, x: 0, scale: 1, duration: 0.4, ease: 'back.out(1.6)' }
    );

    if (barRef.current) {
      gsap.fromTo(barRef.current, { scaleX: 1 }, { scaleX: 0, duration: toast.duration / 1000, ease: 'none' });
    }

    const timer = setTimeout(() => dismiss(), toast.duration);
    let dismissed = false;

    function dismiss() {
      if (dismissed) return; // clicking the X while the auto-dismiss timer is also mid-fire
      dismissed = true;
      // Same reasoning as ConfirmDialog: don't gate removal on GSAP's onComplete
      // (needs rAF, which pauses in a backgrounded tab) — a plain timeout is the
      // reliable trigger, the tween is just the visual on top of it.
      gsap.to(el, { opacity: 0, x: 48, scale: 0.95, duration: 0.25, ease: 'power2.in' });
      setTimeout(onDone, 250);
    }

    el.dismissNow = dismiss;
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      role="status"
      className={`relative overflow-hidden pointer-events-auto w-[calc(100vw-2rem)] sm:w-96 max-w-sm rounded-2xl border ${v.ring} bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-xl dark:shadow-[0_15px_40px_rgba(0,0,0,0.5)] p-3.5 flex items-start gap-3`}
    >
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${v.iconWrap}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-snug pt-1 flex-1 min-w-0 break-words">
        {toast.message}
      </p>
      <button
        type="button"
        onClick={() => ref.current?.dismissNow?.()}
        aria-label="Dismiss notification"
        className="p-1 -mr-1 -mt-0.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shrink-0"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-slate-100 dark:bg-white/10">
        <div ref={barRef} className={`h-full w-full origin-left ${v.bar}`} />
      </div>
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2.5 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDone={() => removeToast(t.id)} />
      ))}
    </div>
  );
}
