import { useUIStore } from '../store/uiStore';

/**
 * Drop-in async replacement for `confirm('Are you sure?')`. Shows a themed,
 * animated modal instead of the OS dialog and resolves the same true/false.
 *
 *   if (!(await confirmDialog('Cancel this booking?'))) return;
 *
 * Pass an options object instead of a string for more control:
 *   await confirmDialog({ title: 'Deactivate staff', message: '...', tone: 'danger' })
 */
export function confirmDialog(messageOrOpts) {
  const opts = typeof messageOrOpts === 'string' ? { message: messageOrOpts } : messageOrOpts;
  return useUIStore.getState().requestConfirm({
    title: 'Please confirm',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    tone: 'default', // 'default' | 'danger'
    ...opts,
  });
}

export default confirmDialog;
