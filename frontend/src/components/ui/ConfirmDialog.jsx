'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { gsap, animateModalIn, animateModalOut } from '../../lib/gsap';
import Button from './Button';

/**
 * Single, app-wide replacement for `window.confirm(...)`. Mounted once (see the
 * dashboard layout); `lib/confirmDialog.js` drives it via the ui store, so any
 * handler can `await confirmDialog('Cancel this booking?')` from anywhere.
 */
export default function ConfirmDialog() {
  const confirmState = useUIStore((s) => s.confirmState);
  const resolveConfirm = useUIStore((s) => s.resolveConfirm);
  const [rendered, setRendered] = useState(null); // keeps content mounted during exit animation
  const [busy, setBusy] = useState(false);
  const modalRef = useRef(null);
  const backdropRef = useRef(null);

  useEffect(() => {
    if (confirmState) {
      setRendered(confirmState);
      setBusy(false);
    }
  }, [confirmState]);

  useEffect(() => {
    if (confirmState && modalRef.current) {
      animateModalIn(modalRef.current);
      if (backdropRef.current) {
        gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25 });
      }
    }
  }, [confirmState]);

  const close = (result) => {
    // Resolve the caller's promise immediately — never make `await confirmDialog(...)`
    // hang on an animation. The GSAP exit tween below is a best-effort visual only;
    // a plain setTimeout (not GSAP's onComplete, which needs requestAnimationFrame and
    // won't fire while the tab is backgrounded) unmounts the dialog a beat later so the
    // animation gets a chance to play when the tab *is* visible.
    resolveConfirm(result);
    if (modalRef.current) animateModalOut(modalRef.current, () => {});
    if (backdropRef.current) gsap.to(backdropRef.current, { opacity: 0, duration: 0.2 });
    setTimeout(() => setRendered(null), 220);
  };

  if (!rendered) return null;

  const isDanger = rendered.tone === 'danger';
  const Icon = isDanger ? AlertTriangle : HelpCircle;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div
        ref={backdropRef}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
        onClick={() => !busy && close(false)}
      />
      <div
        ref={modalRef}
        className="relative z-10 w-full max-w-sm bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/15 p-6 text-center"
      >
        <div
          className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
            isDanger
              ? 'bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400'
              : 'bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400'
          }`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">{rendered.title}</h3>
        {rendered.message && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">{rendered.message}</p>
        )}
        <div className="flex items-center justify-center gap-3 mt-6">
          <Button variant="outline" size="md" className="flex-1" onClick={() => close(false)} disabled={busy}>
            {rendered.cancelLabel}
          </Button>
          <Button
            variant={isDanger ? 'danger' : 'primary'}
            size="md"
            className="flex-1"
            onClick={() => {
              setBusy(true);
              close(true);
            }}
            loading={busy}
          >
            {rendered.confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
