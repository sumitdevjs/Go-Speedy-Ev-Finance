'use client';

import React, { useState, useEffect } from 'react';
import { Search, IndianRupee, CheckCircle2, AlertTriangle, Phone, Bike } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Badge from '../ui/Badge';
import api from '../../lib/api';
import { formatCurrency, PAYMENT_MODES } from '../../lib/constants';

export default function QuickPaymentModal({
  isOpen,
  onClose,
  initialTenant = null,
  onPaymentSuccess,
}) {
  const [search, setSearch] = useState('');
  const [tenants, setTenants] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(initialTenant);

  const [amount, setAmount] = useState('250');
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState(false);

  useEffect(() => {
    if (initialTenant) {
      setSelectedTenant(initialTenant);
      setAmount(String(initialTenant.installment_daily_rate || 250));
    }
  }, [initialTenant]);

  useEffect(() => {
    if (!isOpen) {
      setError('');
      setSuccessNotice(false);
      if (!initialTenant) setSelectedTenant(null);
    }
  }, [isOpen, initialTenant]);

  // Search active tenants
  useEffect(() => {
    if (!search || search.length < 2) {
      setTenants([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await api.get(`/api/rentals?search=${encodeURIComponent(search)}&status=rented&limit=6`);
        setTenants(res.data?.data || []);
      } catch (err) {
        console.error('Tenant search error:', err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [search]);

  const handleSelectTenant = (t) => {
    setSelectedTenant(t);
    setAmount(String(t.installment_daily_rate || 250));
    setSearch('');
    setTenants([]);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTenant) {
      setError('Please select a tenant to record payment for');
      return;
    }
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      await api.post('/api/payments', {
        tenant_id: selectedTenant.id,
        amount: numAmount,
        payment_date: paymentDate,
        mode: paymentMode,
        notes: paymentNotes || undefined,
      });

      setSuccessNotice(true);
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }

      setTimeout(() => {
        onClose();
        setSuccessNotice(false);
        if (!initialTenant) setSelectedTenant(null);
      }, 1200);
    } catch (err) {
      console.error('Record payment error:', err);
      setError(
        err.response?.data?.message || err.message || 'Failed to record payment'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Daily Payment"
      subtitle="Operational fast collection for active EV contracts"
      maxWidth="max-w-md"
    >
      {successNotice ? (
        <div className="py-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white">Payment Recorded!</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {formatCurrency(Number(amount))} has been recorded for {selectedTenant?.name}.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Tenant Search or Selected Tenant Display */}
          {!selectedTenant ? (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Select Tenant *
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Type tenant name or 10-digit phone..."
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {searching && (
                <p className="text-xs text-slate-400 py-1 text-center">Searching tenants...</p>
              )}

              {tenants.length > 0 && (
                <div className="divide-y divide-slate-100 dark:divide-white/5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-800/90 shadow-lg max-h-48 overflow-y-auto">
                  {tenants.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelectTenant(t)}
                      className="w-full p-2.5 text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{t.name}</p>
                        <p className="text-[11px] text-slate-400">{t.phone} • {t.ev_models?.name}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                          Due: {formatCurrency(t.computed_balance?.outstanding)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">{selectedTenant.name}</p>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {selectedTenant.phone}</span>
                  <span>•</span>
                  <span>{selectedTenant.ev_models?.name || 'EV Scooty'}</span>
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-1">
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  Balance: {formatCurrency(selectedTenant.computed_balance?.outstanding || 0)}
                </span>
                {!initialTenant && (
                  <button
                    type="button"
                    onClick={() => setSelectedTenant(null)}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                  >
                    Change
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Amount and Mode */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount (₹)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="1"
            />
            <Select
              label="Payment Mode"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              options={PAYMENT_MODES}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Payment Date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
            <Input
              label="Notes (Optional)"
              type="text"
              placeholder="e.g. Daily cash desk collection"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={submitting}
              icon={IndianRupee}
            >
              Record Payment
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
