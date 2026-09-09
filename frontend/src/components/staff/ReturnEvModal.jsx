'use client';

import React, { useState, useEffect } from 'react';
import { Search, Bike, AlertTriangle, CheckCircle2, Phone, RotateCcw } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import api from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/constants';

export default function ReturnEvModal({
  isOpen,
  onClose,
  onReturnSuccess,
}) {
  const [search, setSearch] = useState('');
  const [tenants, setTenants] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);

  const [returnCondition, setReturnCondition] = useState('good');
  const [odometerKm, setOdometerKm] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedTenant(null);
      setSearch('');
      setError('');
      setSuccessNotice(false);
      setReturnNotes('');
    }
  }, [isOpen]);

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
    setSearch('');
    setTenants([]);
    setError('');
  };

  const handleProcessReturn = async (e) => {
    e.preventDefault();
    if (!selectedTenant) {
      setError('Please select an active rental contract');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const noteText = `[EV RETURNED] Condition: ${returnCondition}. Odo: ${odometerKm || 'N/A'} km. Notes: ${returnNotes || 'Vehicle received at desk'}`;

      await api.put(`/api/rentals/${selectedTenant.id}`, {
        status: 'cancelled',
        address: selectedTenant.address ? `${selectedTenant.address} • ${noteText}` : noteText,
      });

      setSuccessNotice(true);
      if (onReturnSuccess) {
        onReturnSuccess();
      }

      setTimeout(() => {
        onClose();
        setSuccessNotice(false);
        setSelectedTenant(null);
      }, 1400);
    } catch (err) {
      console.error('Process EV return error:', err);
      setError(
        err.response?.data?.message || err.message || 'Failed to process vehicle return'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Return EV Vehicle"
      subtitle="Check-in returned scooter and close active rental contract"
      maxWidth="max-w-md"
    >
      {successNotice ? (
        <div className="py-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white">EV Returned Successfully!</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Contract closed for {selectedTenant?.name}. Vehicle marked returned to fleet.
          </p>
        </div>
      ) : (
        <form onSubmit={handleProcessReturn} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Tenant Search or Selected Tenant */}
          {!selectedTenant ? (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Select Active Rental *
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tenant name, phone or vehicle..."
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {searching && (
                <p className="text-xs text-slate-400 py-1 text-center">Searching active rentals...</p>
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
                        <p className="text-[11px] text-slate-400">{t.phone} • {t.ev_models?.name} • Chassis: {t.chassis_no || '—'}</p>
                      </div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {formatCurrency(t.computed_balance?.outstanding)} due
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{selectedTenant.name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{selectedTenant.phone} • {selectedTenant.ev_models?.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTenant(null)}
                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                >
                  Change
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 dark:border-white/5 text-[11px]">
                <p className="text-slate-500 dark:text-slate-400">Chassis: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedTenant.chassis_no || 'N/A'}</span></p>
                <p className="text-slate-500 dark:text-slate-400 text-right">Outstanding: <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(selectedTenant.computed_balance?.outstanding || 0)}</span></p>
              </div>
            </div>
          )}

          {/* Condition and Return inspection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Physical Condition
              </label>
              <select
                value={returnCondition}
                onChange={(e) => setReturnCondition(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="good">Good / Normal</option>
                <option value="minor_scratch">Minor Scratches</option>
                <option value="damaged">Damage Reported</option>
                <option value="needs_service">Needs Maintenance</option>
              </select>
            </div>

            <Input
              label="Odometer (KM)"
              type="number"
              placeholder="e.g. 1420"
              value={odometerKm}
              onChange={(e) => setOdometerKm(e.target.value)}
            />
          </div>

          <Input
            label="Return Inspection Notes"
            type="text"
            placeholder="Keys, charger received, battery OK..."
            value={returnNotes}
            onChange={(e) => setReturnNotes(e.target.value)}
          />

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
              variant="danger"
              size="md"
              loading={submitting}
              icon={RotateCcw}
            >
              Confirm Return & Close
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
