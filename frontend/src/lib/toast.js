import { useUIStore } from '../store/uiStore';

/**
 * Drop-in replacement for `alert(...)`, but non-blocking, themed, and animated.
 * Usage: toast.success('Saved!'), toast.error('Something went wrong'), toast.info('...')
 */
const push = (variant) => (message, opts = {}) =>
  useUIStore.getState().addToast({ variant, message, ...opts });

export const toast = {
  success: push('success'),
  error: push('error'),
  info: push('info'),
  warning: push('warning'),
};

export default toast;
