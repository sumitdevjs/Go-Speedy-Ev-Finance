import { create } from 'zustand';

let toastSeq = 0;

/**
 * Global UI store for two things that used to be raw browser dialogs:
 *  - toast notifications (was `alert(...)`)
 *  - a single confirm dialog (was `confirm(...)`)
 *
 * Both are driven from plain functions in `lib/toast.js` / `lib/confirmDialog.js`
 * so any handler — even outside a component — can call `toast.error('...')` or
 * `await confirmDialog('...')` exactly like the old globals, but rendered as a
 * themed, animated in-app UI instead of a blocking OS dialog.
 */
export const useUIStore = create((set, get) => ({
  toasts: [],
  addToast: (toast) => {
    const id = ++toastSeq;
    set({ toasts: [...get().toasts, { id, duration: 4000, ...toast }] });
    return id;
  },
  removeToast: (id) => {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },

  confirmState: null, // { title, message, tone, confirmLabel, cancelLabel, resolve }
  requestConfirm: (opts) =>
    new Promise((resolve) => {
      set({ confirmState: { ...opts, resolve } });
    }),
  resolveConfirm: (result) => {
    const { confirmState } = get();
    if (confirmState) confirmState.resolve(result);
    set({ confirmState: null });
  },
}));
