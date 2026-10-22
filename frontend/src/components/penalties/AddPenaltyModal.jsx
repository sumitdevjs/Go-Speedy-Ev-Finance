'use client';

import React, { useState } from 'react';
import api from '../../lib/api';
import { toast } from '../../lib/toast';
import {
  AlertTriangle,
  IndianRupee,
  Calendar,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

const REASON_PRESETS = [
  'Payment Overdue (Late Payment Penalty)',
  'Cheque / ECS Bounce Charge',
  'Delay in Vehicle Return / Contract Violation',
  'Accidental Negligence / Physical Damage',
  'Speed / Geo-fence Restriction Violation',
  'Custom Administrative Fine'
];

const AMOUNT_PRESETS = [100, 250, 500, 1000, 2500, 5000];

export default function AddPenaltyModal({ isOpen, onClose, target, onSuccess }) {
  const [amount, setAmount] = useState('500');
  const [reason, setReason] = useState(REASON_PRESETS[0]);
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');
  const [penaltyDate, setPenaltyDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!target) return null;

  const currentOutstanding = Number(target.outstanding || target.net_outstanding || 0);
  const penaltyNum = Number(amount) || 0;
  const newProjectedDue = currentOutstanding + penaltyNum;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || penaltyNum <= 0) {
      toast.error('Please enter a valid penalty amount (> 0)');
      return;
    }

    const effectiveReason = reason === 'Custom Administrative Fine' && customReason ? customReason : reason;
    if (!effectiveReason) {
      toast.error('Please specify a reason for the penalty');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (penaltyDate && penaltyDate < todayStr) {
      toast.error('Penalty date cannot be in the past (back date not allowed).');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/api/penalties', {
        tenant_id: target.id || target.tenant_id,
        amount: penaltyNum,
        reason: effectiveReason,
        notes: notes || null,
        penalty_date: penaltyDate
      });

      if (res.data?.success) {
        toast.success(`₹${penaltyNum.toLocaleString('en-IN')} penalty added successfully!`);
        if (onSuccess) onSuccess(res.data.data);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add penalty');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Custom Penalty"
      subtitle="Super Admin Direct Fine & Overdue Charge Levying"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Target Customer Info */}
        <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
              Target Customer
            </span>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
              {target.name || target.tenant_name || 'Customer'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              📞 {target.phone || target.customer_phone || 'N/A'} • 🛵 {target.vehicle_number || target.model_name || 'EV Bike'}
            </p>
          </div>
          {(target.days_overdue > 0 || target.max_days_overdue > 0) && (
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <AlertTriangle className="w-3.5 h-3.5" />
                {target.days_overdue || target.max_days_overdue}d Overdue
              </span>
            </div>
          )}
        </div>

        {/* Quick Amount Pills */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            Select or Enter Penalty Amount (₹)
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2.5">
            {AMOUNT_PRESETS.map((preset) => (
              <button
                type="button"
                key={preset}
                onClick={() => setAmount(preset.toString())}
                className={`py-1.5 px-1 text-xs font-bold rounded-lg border transition-all ${
                  amount === preset.toString()
                    ? 'bg-red-600 text-white border-red-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                ₹{preset}
              </button>
            ))}
          </div>

          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold">
              ₹
            </span>
            <input
              type="number"
              min="1"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter any custom amount"
              className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
              required
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Super Admin has full authorization to enter any amount without restriction.
          </p>
        </div>

        {/* Reason Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Reason / Category
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
          >
            {REASON_PRESETS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          {reason === 'Custom Administrative Fine' && (
            <input
              type="text"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Type specific penalty reason..."
              className="w-full mt-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
              required
            />
          )}
        </div>

        {/* Penalty Date */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Penalty Effective Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={penaltyDate}
              onChange={(e) => setPenaltyDate(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Additional Notes / Remarks (Optional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Challan #9812, 10 days default notice sent..."
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-all resize-none"
          />
        </div>

        {/* Real-time Calculation Summary Card */}
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 space-y-1 text-xs">
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Current Outstanding Due:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">₹{currentOutstanding.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-red-600 dark:text-red-400 font-bold">
            <span>+ Penalty Being Added:</span>
            <span>+₹{penaltyNum.toLocaleString('en-IN')}</span>
          </div>
          <div className="pt-1.5 border-t border-red-500/20 flex justify-between font-bold text-slate-900 dark:text-white text-sm">
            <span>New Total Amount Due:</span>
            <span className="text-red-600 dark:text-red-400">₹{newProjectedDue.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            size="md"
            loading={isSubmitting}
            disabled={isSubmitting || penaltyNum <= 0}
            icon={CheckCircle2}
          >
            Confirm & Levy Penalty
          </Button>
        </div>
      </form>
    </Modal>
  );
}
