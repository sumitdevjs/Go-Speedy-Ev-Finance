export const APP_NAME = 'Go Speedy EV';
export const APP_SUBTITLE = 'Finance & Rent Monitor System';

export const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
};

export const TENANT_STATUS = {
  RENTED: 'rented',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DIRECT_PURCHASE: 'direct_purchase',
};

export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONVERTED: 'converted',
  CANCELLED: 'cancelled',
};

export const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'online', label: 'Online / UPI' },
];

export const DOWNPAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'online', label: 'Online / UPI' },
  { value: 'not_paid', label: 'Not Paid' },
];

export const INSTALLMENT_FREQUENCIES = [
  { value: 'daily', label: 'Daily (₹250/day)' },
  { value: 'weekly', label: 'Weekly (₹1,750/wk)' },
  { value: 'monthly', label: 'Monthly (₹7,500/mo)' },
];

export const REFERENCE_CATEGORIES = [
  { value: 'dsgmc_member', label: 'DSGMC Member' },
  { value: 'nigam_parshad', label: 'Nigam Parshad' },
  { value: 'mla', label: 'MLA' },
];

export const RTO_TYPES = [
  { value: 'rto', label: 'RTO Approved' },
  { value: 'non_rto', label: 'Non-RTO' },
];

export const HP_FINANCERS = [
  { value: 'go_speedy', label: 'Go Speedy' },
  { value: 'swastik_finance', label: 'Swastik Finance' },
];

export const formatCurrency = (val) => {
  const num = Number(val || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

export const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};
