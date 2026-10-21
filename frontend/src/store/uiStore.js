import { create } from 'zustand';

let toastSeq = 0;

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

  confirmState: null,
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
