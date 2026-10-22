import { useUIStore } from '../store/uiStore';

export function confirmDialog(messageOrOpts) {
  const opts = typeof messageOrOpts === 'string' ? { message: messageOrOpts } : messageOrOpts;
  return useUIStore.getState().requestConfirm({
    title: 'Please confirm',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    tone: 'default',
    ...opts,
  });
}

export default confirmDialog;
