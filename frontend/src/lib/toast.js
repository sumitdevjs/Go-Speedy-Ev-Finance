import { useUIStore } from '../store/uiStore';

const push = (variant) => (message, opts = {}) =>
  useUIStore.getState().addToast({ variant, message, ...opts });

export const toast = {
  success: push('success'),
  error: push('error'),
  info: push('info'),
  warning: push('warning'),
};

export default toast;
