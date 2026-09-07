'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Phone,
  Bike,
  Calendar,
  IndianRupee,
  FileText,
  AlertTriangle,
  CheckCircle2,
  PlusCircle,
  XCircle,
  Clock,
  Download,
  Eye,
  ShieldAlert,
} from 'lucide-react';
import Header from '../../../../components/layout/Header';
import Card from '../../../../components/ui/Card';
import Badge from '../../../../components/ui/Badge';
import Button from '../../../../components/ui/Button';
import Modal from '../../../../components/ui/Modal';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import Spinner from '../../../../components/ui/Spinner';
import FileUpload from '../../../../components/ui/FileUpload';
import api from '../../../../lib/api';
import {
  formatCurrency,
  formatDate,
  PAYMENT_MODES,
} from '../../../../lib/constants';

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id;

  const [tenant, setTenant] = useState(null);
  const [payments, setPayments] = useState([]);
  const [signedDocs, setSignedDocs] = useState({});
  const [loading, setLoading] = useState(true);

  // Record Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('250');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [autoCompleteNotice, setAutoCompleteNotice] = useState(false);

  // Cancel Rental Modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Document Viewer Modal
  const [viewingDoc, setViewingDoc] = useState(null);

  useEffect(() => {
    if (tenantId) {
      loadAllData();
    }
  }, [tenantId]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [tenantRes, paymentsRes, docsRes] = await Promise.all([
        api.get(`/api/rentals/${tenantId}`),
        api.get(`/api/payments?tenant_id=${tenantId}`),
        api.get(`/api/documents/${tenantId}`),
      ]);

      if (tenantRes.data?.success) {
        setTenant(tenantRes.data.data);
      }
      if (paymentsRes.data?.success) {
        setPayments(paymentsRes.data.data || []);
      }
      if (docsRes.data?.success) {
        setSignedDocs(docsRes.data.data || {});
      }
    } catch (err) {
      console.error('Error loading tenant details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setPaymentError('');

    if (!paymentAmount || Number(paymentAmount) <= 0) {
      setPaymentError('Amount must be greater than 0');
      return;
    }

    try {
      setIsSubmittingPayment(true);
      const res = await api.post('/api/payments', {
        tenant_id: tenantId,
        amount: Number(paymentAmount),
        payment_date: paymentDate,
        mode: paymentMode,
        notes: paymentNotes || null,
      });

      if (res.data?.success) {
        setIsPaymentModalOpen(false);
        setPaymentAmount('250');
        setPaymentNotes('');

        if (res.data.data?.autoCompleted) {
          setAutoCompleteNotice(true);
        }

        loadAllData();
      }
    } catch (err) {
      setPaymentError(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleCancelRental = async () => {
    try {
      setIsCancelling(true);
      const res = await api.patch(`/api/rentals/${tenantId}/cancel`);
      if (res.data?.success) {
        setIsCancelModalOpen(false);
        loadAllData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel rental');
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" className="text-blue-600" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm font-semibold text-slate-700">Tenant record not found.</p>
        <Link href="/rentals" className="mt-3 inline-block">
          <Button variant="outline" size="sm">Return to Rentals</Button>
        </Link>
      </div>
    );
  }

  const balance = tenant.computed_balance || {};
  const isRented = tenant.status === 'rented';

  return (
    <div className="min-h-screen">
      <Header
        title={tenant.name}
        subtitle={`Tenant ID: ${tenant.id.slice(0, 8)} • Phone: ${tenant.phone}`}
        action={
          <div className="flex items-center gap-2">
            {isRented && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  icon={PlusCircle}
                  onClick={() => setIsPaymentModalOpen(true)}
                >
                  Record Payment
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={XCircle}
                  onClick={() => setIsCancelModalOpen(true)}
                >
                  Cancel Rental
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Auto Complete Success Banner */}
        {autoCompleteNotice && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-bold">Rental Completed & Vehicle Transferred!</p>
                <p className="text-xs text-emerald-700">
                  Outstanding balance has reached ₹0. Tenant is now the full owner.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoCompleteNotice(false)}
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* 24-month Expiry Warning */}
        {balance.contractExpired && isRented && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-bold">24-Month Contract Limit Breached</p>
              <p className="text-xs text-amber-700">
                The expected contract period has ended with a remaining balance of{' '}
                {formatCurrency(balance.outstanding)}. Administrator action required.
              </p>
            </div>
          </div>
        )}

        {/* Financial KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="text-center p-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Sticker Price</span>
            <h4 className="text-xl font-black text-slate-900 mt-1">
              {formatCurrency(tenant.total_price)}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Downpayment: {formatCurrency(tenant.downpayment_paid)}
            </p>
          </Card>

          <Card className="text-center p-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Installment Total</span>
            <h4 className="text-xl font-black text-blue-600 mt-1">
              {formatCurrency(balance.installmentTotal)}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">To pay in installments</p>
          </Card>

          <Card className="text-center p-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Total Collected</span>
            <h4 className="text-xl font-black text-emerald-600 mt-1">
              {formatCurrency(tenant.total_paid || 0)}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">{payments.length} payment(s) recorded</p>
          </Card>

          <Card className="text-center p-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Remaining Balance</span>
            <h4 className="text-xl font-black text-slate-900 mt-1">
              {formatCurrency(balance.outstanding)}
            </h4>
            <div className="mt-1">
              {balance.outstanding === 0 ? (
                <Badge status="Fully Paid" variant="emerald" size="sm" />
              ) : balance.daysOverdue > 0 ? (
                <Badge status={`${balance.daysOverdue} days overdue`} variant="rose" size="sm" />
              ) : balance.daysAdvance > 0 ? (
                <Badge status={`${balance.daysAdvance} days advance`} variant="emerald" size="sm" />
              ) : (
                <Badge status="On Track" variant="blue" size="sm" />
              )}
            </div>
          </Card>
        </div>

        {/* Details & Documents Tabs/Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Hardware & Contract Details */}
          <Card title="Vehicle & Contract Profile" className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="font-bold text-slate-400 uppercase text-[10px]">EV Model</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">
                  {tenant.ev_models?.name} ({tenant.ev_models?.company})
                </p>
              </div>

              <div>
                <p className="font-bold text-slate-400 uppercase text-[10px]">Chassis Serial</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">
                  {tenant.chassis_no || '—'}
                </p>
              </div>

              <div>
                <p className="font-bold text-slate-400 uppercase text-[10px]">Motor Controller</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">
                  {tenant.motor_ctrl_no || '—'}
                </p>
              </div>

              <div>
                <p className="font-bold text-slate-400 uppercase text-[10px]">Battery Serial</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">
                  {tenant.battery_no || '—'}
                </p>
              </div>

              <div>
                <p className="font-bold text-slate-400 uppercase text-[10px]">RTO Classification</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5 uppercase">
                  {tenant.rto_type || 'RTO'}
                </p>
              </div>

              <div>
                <p className="font-bold text-slate-400 uppercase text-[10px]">HP Financer</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5 uppercase">
                  {tenant.hp_financer || 'Go Speedy'}
                </p>
              </div>

              <div>
                <p className="font-bold text-slate-400 uppercase text-[10px]">Agreement Dates</p>
                <p className="text-xs text-slate-700 mt-0.5">
                  Start: {formatDate(tenant.start_date)} • End: {formatDate(tenant.expected_end_date)}
                </p>
              </div>

              <div>
                <p className="font-bold text-slate-400 uppercase text-[10px]">Installment Terms</p>
                <p className="text-xs text-slate-700 mt-0.5">
                  ₹{tenant.installment_daily_rate}/day ({tenant.installment_frequency})
                </p>
              </div>
            </div>

            {/* References & Guarantors summary */}
            <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="font-bold text-slate-500 uppercase text-[10px] mb-1">References Listed</p>
                {Array.isArray(tenant.references) && tenant.references.length > 0 ? (
                  <ul className="space-y-1 text-slate-700">
                    {tenant.references.map((r, i) => (
                      <li key={i}>
                        <span className="font-semibold">{r.name}</span> ({r.category}) — {r.phone}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-400">None provided</p>
                )}
              </div>

              <div>
                <p className="font-bold text-slate-500 uppercase text-[10px] mb-1">Guarantors</p>
                {Array.isArray(tenant.guarantors) && tenant.guarantors.length > 0 ? (
                  <ul className="space-y-1 text-slate-700">
                    {tenant.guarantors.map((g, i) => (
                      <li key={i}>
                        <span className="font-semibold">{g.name}</span> ({g.gender}) — {g.phone}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-400">None provided</p>
                )}
              </div>
            </div>
          </Card>

          {/* Documents Vault */}
          <Card title="Secured Documents (15-min Signed URLs)">
            <div className="space-y-3">
              {[
                { label: 'Aadhar Card', url: signedDocs.aadhar_url, path: tenant.aadhar_path, docType: 'aadhar_path' },
                { label: 'PAN Card', url: signedDocs.pan_url, path: tenant.pan_path, docType: 'pan_path' },
                { label: 'Cheque', url: signedDocs.cheque_url, path: tenant.cheque_path, docType: 'cheque_path' },
                { label: 'Electricity Bill', url: signedDocs.electricity_bill_url, path: tenant.electricity_bill_path, docType: 'electricity_bill_path' },
                { label: 'Tenant Photo', url: signedDocs.tenant_photo_url, path: tenant.tenant_photo_path, docType: 'tenant_photo_path' },
                { label: 'Scooty Photo', url: signedDocs.scooty_photo_url, path: tenant.scooty_photo_path, docType: 'scooty_photo_path' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/60"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {item.label}
                    </span>
                  </div>

                  {item.url ? (
                    <button
                      type="button"
                      onClick={() => setViewingDoc({ label: item.label, url: item.url })}
                      className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> View
                    </button>
                  ) : (
                    <span className="text-[11px] font-semibold text-amber-600">Pending</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Payment History Timeline */}
        <Card
          title="Payment Ledger & Collection Timeline"
          subtitle="All installments and settlements recorded"
          action={
            isRented && (
              <Button
                variant="primary"
                size="sm"
                icon={PlusCircle}
                onClick={() => setIsPaymentModalOpen(true)}
              >
                Record Payment
              </Button>
            )
          }
        >
          {payments.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <p className="text-xs font-medium">No installment payments recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Collected By</th>
                    <th className="px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {formatDate(p.payment_date)}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge status={p.mode} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {p.users?.name || 'Operator'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{p.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Installment Collection"
        subtitle={`Tenant: ${tenant.name} • Remaining: ${formatCurrency(balance.outstanding)}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          {paymentError && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{paymentError}</span>
            </div>
          )}

          <Input
            label="Amount Collected (₹)"
            type="number"
            placeholder="250"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            required
          />

          <Input
            label="Payment Date"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
          />

          <Select
            label="Collection Mode"
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            options={PAYMENT_MODES}
          />

          <Input
            label="Notes / Receipt Reference (Optional)"
            placeholder="e.g. UPI Ref: 981249102"
            value={paymentNotes}
            onChange={(e) => setPaymentNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsPaymentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSubmittingPayment}
            >
              Save Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cancel Rental Confirmation Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Confirm Rental Cancellation"
        subtitle="This action restores vehicle stock and closes the active contract"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-700">
            Are you sure you want to cancel the rental for <span className="font-bold">{tenant.name}</span>?
            The EV model stock will automatically increase by 1 in the inventory.
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsCancelModalOpen(false)}
            >
              No, Keep Rental
            </Button>
            <Button
              variant="danger"
              size="md"
              loading={isCancelling}
              onClick={handleCancelRental}
            >
              Yes, Cancel Rental
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Document Modal */}
      <Modal
        isOpen={Boolean(viewingDoc)}
        onClose={() => setViewingDoc(null)}
        title={viewingDoc?.label || 'Document Preview'}
        maxWidth="max-w-2xl"
      >
        <div className="flex justify-center p-2 bg-slate-900/5 rounded-xl">
          <img
            src={viewingDoc?.url}
            alt={viewingDoc?.label}
            className="max-h-[70vh] rounded-lg object-contain"
          />
        </div>
      </Modal>
    </div>
  );
}
