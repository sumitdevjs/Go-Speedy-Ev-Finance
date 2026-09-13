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
  ShieldAlert,
  Edit,
  CheckCircle,
  Eye,
  Save,
  X,
  Trash2
} from 'lucide-react';
import Header from '../../../../components/layout/Header';
import Card from '../../../../components/ui/Card';
import Badge from '../../../../components/ui/Badge';
import Button from '../../../../components/ui/Button';
import Modal from '../../../../components/ui/Modal';
import { toast } from '../../../../lib/toast';
import { confirmDialog } from '../../../../lib/confirmDialog';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import Spinner from '../../../../components/ui/Spinner';
import FileUpload from '../../../../components/ui/FileUpload';
import api from '../../../../lib/api';
import {
  formatCurrency,
  formatDate,
  PAYMENT_MODES,
  REFERENCE_CATEGORIES,
  HP_FINANCERS,
  RTO_TYPES,
} from '../../../../lib/constants';

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id;

  const [tenant, setTenant] = useState(null);
  const [payments, setPayments] = useState([]);
  const [signedDocs, setSignedDocs] = useState({});
  const [loading, setLoading] = useState(true);

  // Edit Mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({});

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
        const t = tenantRes.data.data;
        const isStandardFinancer = HP_FINANCERS.some(f => f.value === t.hp_financer && f.value !== 'other');
        setTenant(t);
        setEditData({
          name: t.name || '',
          phone: t.phone || '',
          address: t.address || '',
          chassis_no: t.chassis_no || '',
          motor_ctrl_no: t.motor_ctrl_no || '',
          battery_no: t.battery_no || '',
          date_of_purchase: t.date_of_purchase ? t.date_of_purchase.split('T')[0] : '',
          rto_type: t.rto_type || '',
          hp_financer: t.hp_financer ? (isStandardFinancer ? t.hp_financer : 'other') : '',
          hp_financer_other: isStandardFinancer ? '' : (t.hp_financer === 'other' ? '' : (t.hp_financer || '')),
          start_date: t.start_date ? t.start_date.split('T')[0] : '',
          total_months: t.total_months || 24,
          installment_daily_rate: t.installment_daily_rate || '',
          installment_frequency: t.installment_frequency || '',
          include_gst: t.include_gst || false,
          gst_percent: t.gst_percent || 0,
          references: Array.isArray(t.references) ? t.references : [],
          guarantors: Array.isArray(t.guarantors) ? t.guarantors : [],
          notes: t.notes || '',
          scooty_insurance_company: t.scooty_insurance_company || '',
          scooty_policy_number: t.scooty_policy_number || '',
          scooty_policy_expiry: t.scooty_policy_expiry ? t.scooty_policy_expiry.split('T')[0] : '',
          rider_insurance_company: t.rider_insurance_company || '',
          rider_policy_number: t.rider_policy_number || '',
          rider_policy_expiry: t.rider_policy_expiry ? t.rider_policy_expiry.split('T')[0] : '',
          vehicle_number: t.vehicle_number || '',
          scooty_insurance_amount: t.scooty_insurance_amount || '',
          scooty_insurance_idv: t.scooty_insurance_idv || '',
          scooty_insurance_start: t.scooty_insurance_start ? t.scooty_insurance_start.split('T')[0] : '',
          rider_insurance_amount: t.rider_insurance_amount || '',
          rider_insurance_idv: t.rider_insurance_idv || '',
          rider_insurance_start: t.rider_insurance_start ? t.rider_insurance_start.split('T')[0] : '',
          amc_amount: t.amc_amount || '',
          amc_start_date: t.amc_start_date ? t.amc_start_date.split('T')[0] : '',
          amc_expire_date: t.amc_expire_date ? t.amc_expire_date.split('T')[0] : '',
          buyback_amount: t.buyback_amount || '',
          amc_service_log: Array.isArray(t.amc_service_log) ? t.amc_service_log : [],
        });
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
        gst_amount: tenant.include_gst ? ((Number(paymentAmount) || 0) * (tenant.gst_percent || 0)) / 100 : 0,
      });

      if (res.data?.success) {
        setIsPaymentModalOpen(false);
        setPaymentAmount('250');
        setPaymentNotes('');
        if (res.data.data?.autoCompleted) {
          setAutoCompleteNotice(true);
        } else {
          toast.success('Payment recorded.');
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
        toast.success('Rental contract cancelled.');
        loadAllData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel rental');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCompleteRental = async () => {
    const ok = await confirmDialog({
      title: 'Convert to completed purchase?',
      message: 'This marks the contract as fully paid and transfers ownership to the tenant.',
      confirmLabel: 'Complete Purchase',
      cancelLabel: 'Not Yet',
    });
    if (!ok) return;
    try {
      const res = await api.patch(`/api/rentals/${tenantId}/complete`);
      if (res.data?.success) {
        toast.success('Rental converted to completed purchase!');
        loadAllData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete rental');
    }
  };

  const handleSaveChanges = async () => {
    if (editData.phone && !/^\d{10}$/.test(editData.phone.trim())) {
      toast.error('Phone number must be exactly 10 digits');
      return;
    }
    if (editData.references?.some(r => r.phone && !/^\d{10}$/.test(r.phone.trim()))) {
      toast.error('All reference phone numbers must be exactly 10 digits');
      return;
    }
    if (editData.guarantors?.some(g => g.phone && !/^\d{10}$/.test(g.phone.trim()))) {
      toast.error('All guarantor phone numbers must be exactly 10 digits');
      return;
    }
    try {
      setIsSaving(true);
      const { hp_financer_other, ...restEditData } = editData;
      const payload = {
        ...restEditData,
        hp_financer: editData.hp_financer === 'other' ? (hp_financer_other || 'Other') : editData.hp_financer,
        references: (editData.references || []).map(({ customCategory, ...r }) => ({
          ...r,
          category: r.category === 'other' ? (customCategory || 'Other') : r.category,
        })),
      };
      const res = await api.patch(`/api/rentals/${tenantId}`, payload);
      if (res.data?.success) {
        setIsEditMode(false);
        toast.success('Changes saved.');
        loadAllData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  // Edit Array Helpers
  const updateReference = (index, field, value) => {
    const newRefs = [...editData.references];
    newRefs[index] = { ...newRefs[index], [field]: value };
    setEditData({ ...editData, references: newRefs });
  };

  const updateGuarantor = (index, field, value) => {
    const newGuarantors = [...editData.guarantors];
    newGuarantors[index] = { ...newGuarantors[index], [field]: value };
    setEditData({ ...editData, guarantors: newGuarantors });
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
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tenant record not found.</p>
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
        title={isEditMode ? `Editing Details: ${tenant.name}` : tenant.name}
        subtitle={`Tenant ID: ${tenant.id.slice(0, 8)} • Phone: ${tenant.phone}`}
        action={
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 justify-end">
            {isEditMode ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  icon={X}
                  onClick={() => setIsEditMode(false)}
                  disabled={isSaving}
                  className="px-2.5 py-1.5"
                >
                  <span className="hidden sm:inline">Cancel Edit</span>
                  <span className="sm:hidden">Cancel</span>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Save}
                  onClick={handleSaveChanges}
                  loading={isSaving}
                  className="px-2.5 py-1.5"
                >
                  <span className="hidden sm:inline">Save Changes</span>
                  <span className="sm:hidden">Save</span>
                </Button>
              </>
            ) : (
              <>
                {tenant.status !== 'cancelled' && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Edit}
                    onClick={() => setIsEditMode(true)}
                    className="h-8 w-8 p-0 xs:h-auto xs:w-auto xs:px-2.5 xs:py-1.5"
                    title="Edit Details"
                  >
                    <span className="hidden sm:inline">Edit Details</span>
                    <span className="hidden xs:inline sm:hidden">Edit</span>
                  </Button>
                )}
                {isRented && (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={PlusCircle}
                      onClick={() => setIsPaymentModalOpen(true)}
                      className="h-8 w-8 p-0 xs:h-auto xs:w-auto xs:px-2.5 xs:py-1.5"
                      title="Record Payment"
                    >
                      <span className="hidden sm:inline">Record Payment</span>
                      <span className="hidden xs:inline sm:hidden">Pay</span>
                    </Button>
                    {balance.outstanding === 0 && (
                      <Button
                        variant="success"
                        size="sm"
                        icon={CheckCircle}
                        onClick={handleCompleteRental}
                        className="h-8 w-8 p-0 xs:h-auto xs:w-auto xs:px-2.5 xs:py-1.5"
                        title="Convert to Purchase"
                      >
                        <span className="hidden sm:inline">Convert to Purchase</span>
                        <span className="hidden xs:inline sm:hidden">Convert</span>
                      </Button>
                    )}
                  </>
                )}
                {tenant.status !== 'cancelled' && (
                  <Button
                    variant="danger"
                    size="sm"
                    icon={XCircle}
                    onClick={() => setIsCancelModalOpen(true)}
                    className="h-8 w-8 p-0 xs:h-auto xs:w-auto xs:px-2.5 xs:py-1.5"
                    title="Cancel Contract"
                  >
                    <span className="hidden sm:inline">Cancel Contract</span>
                    <span className="hidden xs:inline sm:hidden">Cancel</span>
                  </Button>
                )}
              </>
            )}
          </div>
        }
      />

      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Auto Complete Success Banner */}
        {autoCompleteNotice && !isEditMode && (
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

        {/* Financial KPI Grid (Hidden in Edit Mode for focus) */}
        {!isEditMode && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="text-center p-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Sticker Price</span>
              <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {formatCurrency(tenant.status === 'direct_purchase' ? 0 : tenant.total_price)}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Total Upfront: {formatCurrency(tenant.status === 'direct_purchase' ? 0 : (Number(tenant.downpayment_paid) + Number(tenant.booking_amount || 0)))}
              </p>
            </Card>

            <Card className="text-center p-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Installment Total</span>
              <h4 className="text-xl font-black text-blue-600 mt-1">
                {formatCurrency(tenant.status === 'direct_purchase' ? 0 : balance.installmentTotal)}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">To pay in installments</p>
            </Card>

            <Card className="text-center p-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Collected</span>
              <h4 className="text-xl font-black text-emerald-600 mt-1">
                {formatCurrency(tenant.status === 'direct_purchase' ? 0 : (tenant.total_paid || 0))}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">{payments.length} payment(s) recorded</p>
            </Card>

            <Card className="text-center p-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Remaining Balance</span>
              <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {formatCurrency(tenant.status === 'direct_purchase' ? 0 : balance.outstanding)}
              </h4>
              <div className="mt-1">
                {tenant.status === 'direct_purchase' || balance.outstanding === 0 ? (
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
        )}

        {/* Details & Documents Tabs/Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Details (Personal, Hardware, Contract) */}
          <Card title={isEditMode ? "Edit Profile & Contract" : "Vehicle & Contract Profile"} className="lg:col-span-2">
            
            {/* PERSONAL INFO (Only shown as editable in Edit Mode) */}
            {isEditMode && (
              <>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Personal Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <Input
                    label="Full Name"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  />
                  <Input
                    label="Phone Number"
                    placeholder="10-digit mobile number"
                    value={editData.phone}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    maxLength={10}
                    inputMode="numeric"
                  />
                  <div className="sm:col-span-2">
                    <Input
                      label="Address"
                      value={editData.address}
                      onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                    />
                  </div>
                </div>
                <hr className="my-6 border-slate-100" />
              </>
            )}

            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Vehicle Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                {isEditMode ? (
                  <Input
                    label="Vehicle Reg. Number"
                    value={editData.vehicle_number}
                    onChange={(e) => setEditData({ ...editData, vehicle_number: e.target.value })}
                  />
                ) : (
                  <>
                    <p className="font-bold text-slate-400 uppercase text-[10px]">Vehicle Reg. Number</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{tenant.vehicle_number || '—'}</p>
                  </>
                )}
              </div>

              <div>
                <p className="font-bold text-slate-400 uppercase text-[10px]">EV Model</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {tenant.ev_models?.name} ({tenant.ev_models?.company})
                </p>
              </div>

              <div>
                {isEditMode ? (
                  <Input
                    label="Chassis Serial"
                    value={editData.chassis_no}
                    onChange={(e) => setEditData({ ...editData, chassis_no: e.target.value })}
                  />
                ) : (
                  <>
                    <p className="font-bold text-slate-400 uppercase text-[10px]">Chassis Serial</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{tenant.chassis_no || '—'}</p>
                  </>
                )}
              </div>

              <div>
                {isEditMode ? (
                  <Input
                    label="Motor Controller"
                    value={editData.motor_ctrl_no}
                    onChange={(e) => setEditData({ ...editData, motor_ctrl_no: e.target.value })}
                  />
                ) : (
                  <>
                    <p className="font-bold text-slate-400 uppercase text-[10px]">Motor Controller</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{tenant.motor_ctrl_no || '—'}</p>
                  </>
                )}
              </div>

              <div>
                {isEditMode ? (
                  <Input
                    label="Battery Serial"
                    value={editData.battery_no}
                    onChange={(e) => setEditData({ ...editData, battery_no: e.target.value })}
                  />
                ) : (
                  <>
                    <p className="font-bold text-slate-400 uppercase text-[10px]">Battery Serial</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{tenant.battery_no || '—'}</p>
                  </>
                )}
              </div>

              <div>
                {isEditMode ? (
                  <Select
                    label="RTO Classification"
                    value={editData.rto_type}
                    onChange={(e) => setEditData({ ...editData, rto_type: e.target.value })}
                    options={RTO_TYPES}
                  />
                ) : (
                  <>
                    <p className="font-bold text-slate-400 uppercase text-[10px]">RTO Classification</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5 uppercase">{tenant.rto_type || 'RTO'}</p>
                  </>
                )}
              </div>

              <div>
                {isEditMode ? (
                  <>
                    <Select
                      label="HP Financer"
                      value={editData.hp_financer}
                      onChange={(e) => setEditData({ ...editData, hp_financer: e.target.value })}
                      options={HP_FINANCERS}
                    />
                    {editData.hp_financer === 'other' && (
                      <div className="mt-4">
                        <Input
                          label="Custom Financer"
                          placeholder="Enter custom financer name"
                          value={editData.hp_financer_other || ''}
                          onChange={(e) => setEditData({ ...editData, hp_financer_other: e.target.value })}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-bold text-slate-400 uppercase text-[10px]">HP Financer</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5 uppercase">{tenant.hp_financer || 'Go Speedy'}</p>
                  </>
                )}
              </div>

              {/* Scooty Insurance */}
              <div>
                {isEditMode ? (
                  <Input
                    label="Scooty Ins. Company"
                    value={editData.scooty_insurance_company}
                    onChange={(e) => setEditData({ ...editData, scooty_insurance_company: e.target.value })}
                  />
                ) : (
                  <>
                    <p className="font-bold text-slate-400 uppercase text-[10px]">Scooty Ins. Company</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{tenant.scooty_insurance_company || '—'}</p>
                  </>
                )}
              </div>

              <div>
                {isEditMode ? (
                  <Input
                    label="Scooty Policy #"
                    value={editData.scooty_policy_number}
                    onChange={(e) => setEditData({ ...editData, scooty_policy_number: e.target.value })}
                  />
                ) : (
                  <>
                    <p className="font-bold text-slate-400 uppercase text-[10px]">Scooty Policy #</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{tenant.scooty_policy_number || '—'}</p>
                  </>
                )}
              </div>

              <div>
                {isEditMode ? (
                  <Input
                    label="Scooty Policy Expiry"
                    type="date"
                    value={editData.scooty_policy_expiry}
                    onChange={(e) => setEditData({ ...editData, scooty_policy_expiry: e.target.value })}
                  />
                ) : (
                  <>
                    <p className="font-bold text-slate-400 uppercase text-[10px]">Scooty Policy Expiry</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{tenant.scooty_policy_expiry ? formatDate(tenant.scooty_policy_expiry) : '—'}</p>
                  </>
                )}
              </div>

              <div>
                {isEditMode ? (
                  <Input
                    label="Scooty Ins. Amount (₹)"
                    type="number"
                    value={editData.scooty_insurance_amount}
                    onChange={(e) => setEditData({ ...editData, scooty_insurance_amount: e.target.value })}
                  />
                ) : (
                  <>
                    <p className="font-bold text-slate-400 uppercase text-[10px]">Scooty Ins. Amount (₹)</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{tenant.scooty_insurance_amount ? formatCurrency(tenant.scooty_insurance_amount) : '—'}</p>
                  </>
                )}
              </div>

              <div>
                {isEditMode ? (
                  <Input
                    label="Scooty Ins. IDV (₹)"
                    type="number"
                    value={editData.scooty_insurance_idv}
                    onChange={(e) => setEditData({ ...editData, scooty_insurance_idv: e.target.value })}
                  />
                ) : (
                  <>
                    <p className="font-bold text-slate-400 uppercase text-[10px]">Scooty Ins. IDV (₹)</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{tenant.scooty_insurance_idv ? formatCurrency(tenant.scooty_insurance_idv) : '—'}</p>
                  </>
                )}
              </div>

              <div>
                {isEditMode ? (
                  <Input
                    label="Scooty Ins. Start Date"
                    type="date"
                    value={editData.scooty_insurance_start}
                    onChange={(e) => setEditData({ ...editData, scooty_insurance_start: e.target.value })}
                  />
                ) : (
                  <>
                    <p className="font-bold text-slate-400 uppercase text-[10px]">Scooty Ins. Start Date</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{tenant.scooty_insurance_start ? formatDate(tenant.scooty_insurance_start) : '—'}</p>
                  </>
                )}
              </div>
              
              {/* Rider Insurance */}
              <div>
                {isEditMode ? (
                  <Input
                    label="Rider Ins. Company"
                    value={editData.rider_insurance_company}
                    onChange={(e) => setEditData({ ...editData, rider_insurance_company: e.target.value })}
                  />
                ) : (
                  <>
                    <p className="font-bold text-slate-400 uppercase text-[10px]">Rider Ins. Company</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{tenant.rider_insurance_company || '—'}</p>
                  </>
                )}
              </div>

              <div>
                {isEditMode ? (
                  <Input
                    label="Rider Policy #"
                    value={editData.rider_policy_number}
                    onChange={(e) => setEditData({ ...editData, rider_policy_number: e.target.value })}
                  />
                ) : (
                  <>
                    <p className="font-bold text-slate-400 uppercase text-[10px]">Rider Policy #</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{tenant.rider_policy_number || '—'}</p>
                  </>
                )}
              </div>

              <div>
                {isEditMode ? (
                  <Input
                    label="Rider Policy Expiry"
                    type="date"
                    value={editData.rider_policy_expiry}
                    onChange={(e) => setEditData({ ...editData, rider_policy_expiry: e.target.value })}
                  />
                ) : (
                  <>
                    <p className="font-bold text-slate-400 uppercase text-[10px]">Rider Policy Expiry</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{tenant.rider_policy_expiry ? formatDate(tenant.rider_policy_expiry) : '—'}</p>
                  </>
                )}
              </div>

              <div>
                {isEditMode ? (
                  <Input
                    label="Rider Ins. Amount (₹)"
                    type="number"
                    value={editData.rider_insurance_amount}
                    onChange={(e) => setEditData({ ...editData, rider_insurance_amount: e.target.value })}
                  />
                ) : (
                  <>
                    <p className="font-bold text-slate-400 uppercase text-[10px]">Rider Ins. Amount (₹)</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{tenant.rider_insurance_amount ? formatCurrency(tenant.rider_insurance_amount) : '—'}</p>
                  </>
                )}
              </div>

              <div>
                {isEditMode ? (
                  <Input
                    label="Rider Ins. IDV (₹)"
                    type="number"
                    value={editData.rider_insurance_idv}
                    onChange={(e) => setEditData({ ...editData, rider_insurance_idv: e.target.value })}
                  />
                ) : (
                  <>
                    <p className="font-bold text-slate-400 uppercase text-[10px]">Rider Ins. IDV (₹)</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{tenant.rider_insurance_idv ? formatCurrency(tenant.rider_insurance_idv) : '—'}</p>
                  </>
                )}
              </div>

              <div>
                {isEditMode ? (
                  <Input
                    label="Rider Ins. Start Date"
                    type="date"
                    value={editData.rider_insurance_start}
                    onChange={(e) => setEditData({ ...editData, rider_insurance_start: e.target.value })}
                  />
                ) : (
                  <>
                    <p className="font-bold text-slate-400 uppercase text-[10px]">Rider Ins. Start Date</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{tenant.rider_insurance_start ? formatDate(tenant.rider_insurance_start) : '—'}</p>
                  </>
                )}
              </div>

              <div className="sm:col-span-2">
                {isEditMode ? (
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Additional Notes
                    </label>
                    <textarea
                      className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-smooth"
                      placeholder="Add a note (e.g., How many times the battery or controller or charger got replaced, and how often they came to us for repairs)"
                      rows={3}
                      value={editData.notes || ''}
                      onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                    />
                  </div>
                ) : (
                  <>
                    <p className="font-bold text-slate-400 uppercase text-[10px]">Additional Notes</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{tenant.notes || '—'}</p>
                  </>
                )}
              </div>
            </div>

            <hr className="my-6 border-slate-100" />
            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">AMC & Extra Financials</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                {isEditMode ? (
                  <Input
                    label="AMC Amount (₹)"
                    type="number"
                    value={editData.amc_amount}
                    onChange={(e) => setEditData({ ...editData, amc_amount: e.target.value })}
                  />
                ) : (
                  <>
                    <p className="font-bold text-slate-400 uppercase text-[10px]">AMC Amount (₹)</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{tenant.amc_amount ? formatCurrency(tenant.amc_amount) : '—'}</p>
                  </>
                )}
              </div>

              <div>
                {isEditMode ? (
                  <Input
                    label="Buyback / Early Exit Fee (₹)"
                    type="number"
                    value={editData.buyback_amount}
                    onChange={(e) => setEditData({ ...editData, buyback_amount: e.target.value })}
                  />
                ) : (
                  <>
                    <p className="font-bold text-slate-400 uppercase text-[10px]">Buyback / Early Exit Fee (₹)</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{tenant.buyback_amount ? formatCurrency(tenant.buyback_amount) : '—'}</p>
                  </>
                )}
              </div>
              
              <div>
                {isEditMode ? (
                  <Input
                    label="AMC Start Date"
                    type="date"
                    value={editData.amc_start_date}
                    onChange={(e) => setEditData({ ...editData, amc_start_date: e.target.value })}
                  />
                ) : (
                  <>
                    <p className="font-bold text-slate-400 uppercase text-[10px]">AMC Start Date</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{tenant.amc_start_date ? formatDate(tenant.amc_start_date) : '—'}</p>
                  </>
                )}
              </div>
              
              <div>
                {isEditMode ? (
                  <Input
                    label="AMC Expire Date"
                    type="date"
                    value={editData.amc_expire_date}
                    onChange={(e) => setEditData({ ...editData, amc_expire_date: e.target.value })}
                  />
                ) : (
                  <>
                    <p className="font-bold text-slate-400 uppercase text-[10px]">AMC Expire Date</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{tenant.amc_expire_date ? formatDate(tenant.amc_expire_date) : '—'}</p>
                  </>
                )}
              </div>
            </div>

            {tenant.status !== 'direct_purchase' && (
              <>
                <hr className="my-6 border-slate-100" />
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Contract & Financials</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    {isEditMode ? (
                      <div className="space-y-3">
                        <Input
                          type="date"
                          label="Start Date"
                          value={editData.start_date}
                          onChange={(e) => setEditData({ ...editData, start_date: e.target.value })}
                        />
                        <Input
                          type="number"
                          label="Contract Horizon (Months)"
                          value={editData.total_months}
                          onChange={(e) => setEditData({ ...editData, total_months: e.target.value })}
                        />
                        <Input
                          type="date"
                          label="Expected Completion (Last Date)"
                          value={(() => {
                            if (!editData.start_date) return '';
                            const d = new Date(editData.start_date);
                            if (isNaN(d.getTime())) return '';
                            d.setMonth(d.getMonth() + (Number(editData.total_months) || 24));
                            return d.toISOString().split('T')[0];
                          })()}
                          disabled
                          helperText={`Computed: Start Date + ${editData.total_months || 24} months`}
                        />
                      </div>
                    ) : (
                      <>
                        <p className="font-bold text-slate-400 uppercase text-[10px]">Agreement Dates</p>
                        <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                          Start: {formatDate(tenant.start_date)} • End: {formatDate(tenant.expected_end_date)} ({tenant.total_months || 24} months)
                        </p>
                      </>
                    )}
                  </div>

                  <div>
                    {isEditMode ? (
                      <Input
                        type="number"
                        label="Installment Rate (₹)"
                        value={editData.installment_daily_rate}
                        onChange={(e) => setEditData({ ...editData, installment_daily_rate: e.target.value })}
                      />
                    ) : (
                      <>
                        <p className="font-bold text-slate-400 uppercase text-[10px]">Installment Terms</p>
                        <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                          ₹{tenant.installment_daily_rate}/day ({tenant.installment_frequency})
                        </p>
                      </>
                    )}
                  </div>
                  
                  {isEditMode && (
                    <div>
                      <Select
                        label="Frequency"
                        value={editData.installment_frequency}
                        onChange={(e) => setEditData({ ...editData, installment_frequency: e.target.value })}
                        options={[
                          { value: 'daily', label: `Daily (${formatCurrency(editData.installment_daily_rate)}/day)` },
                          { value: 'weekly', label: `Weekly (${formatCurrency(editData.installment_daily_rate * 7)}/wk)` },
                          { value: 'monthly', label: `Monthly (${formatCurrency(editData.installment_daily_rate * 30)}/mo)` },
                        ]}
                      />
                    </div>
                  )}

                  <div className="sm:col-span-2 mt-4 pt-4 border-t border-slate-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        {isEditMode ? (
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editData.include_gst}
                              onChange={(e) => {
                                setEditData({ ...editData, include_gst: e.target.checked, gst_percent: e.target.checked ? editData.gst_percent : 0 });
                              }}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>Include GST</span>
                          </label>
                        ) : (
                          <>
                            <p className="font-bold text-slate-400 uppercase text-[10px]">GST Included</p>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                              {tenant.include_gst ? 'Yes' : 'No'}
                            </p>
                          </>
                        )}
                      </div>

                      {(isEditMode ? editData.include_gst : tenant.include_gst) && (
                        <div>
                          {isEditMode ? (
                            <div className="flex gap-4">
                              <Input
                                type="number"
                                label="Tax Percent (%)"
                                min="0"
                                value={editData.gst_percent}
                                onChange={(e) => setEditData({ ...editData, gst_percent: parseFloat(e.target.value) || 0 })}
                              />
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                                  GST Amount
                                </span>
                                <div className="flex items-center h-10 px-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                  ₹{((editData.installment_daily_rate * (editData.gst_percent || 0)) / 100).toFixed(2)}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="font-bold text-slate-400 uppercase text-[10px]">GST Details</p>
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                                {tenant.gst_percent}% (₹{((tenant.installment_daily_rate * (tenant.gst_percent || 0)) / 100).toFixed(2)} per installment)
                              </p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Reference & Guarantors summary */}
            {tenant.status !== 'direct_purchase' && (
              <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-bold text-slate-500 uppercase text-[10px] mb-2">Reference Listed</p>
                  {isEditMode ? (
                    <div className="space-y-3">
                      {editData.references.map((r, i) => (
                        <div key={i} className="space-y-2 mb-4">
                          <Input
                            placeholder="Reference Name"
                            value={r.name || ''}
                            onChange={(e) => updateReference(i, 'name', e.target.value)}
                          />
                          <div className="grid grid-cols-2 gap-2">
                             <Input
                              placeholder="10-digit phone"
                              value={r.phone || ''}
                              onChange={(e) => updateReference(i, 'phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                              maxLength={10}
                              inputMode="numeric"
                            />
                            <Select
                              value={r.category || ''}
                              onChange={(e) => updateReference(i, 'category', e.target.value)}
                              options={REFERENCE_CATEGORIES}
                            />
                            {r.category === 'other' && (
                              <Input
                                placeholder="Please specify category"
                                value={r.customCategory || ''}
                                onChange={(e) => updateReference(i, 'customCategory', e.target.value)}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    Array.isArray(tenant.references) && tenant.references.length > 0 ? (
                      <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                        {tenant.references.map((r, i) => (
                          <li key={i}>
                            <span className="font-semibold">{r.name}</span> ({r.category}) — {r.phone}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-400">None provided</p>
                    )
                  )}
                </div>

                <div>
                  <p className="font-bold text-slate-500 uppercase text-[10px] mb-2">Guarantors</p>
                  {isEditMode ? (
                    <div className="space-y-3">
                      {editData.guarantors.map((g, i) => (
                        <div key={i} className="space-y-2 mb-4">
                          <Input
                            placeholder="Guarantor Name"
                            value={g.name || ''}
                            onChange={(e) => updateGuarantor(i, 'name', e.target.value)}
                          />
                           <div className="grid grid-cols-2 gap-2">
                             <Input
                              placeholder="10-digit phone"
                              value={g.phone || ''}
                              onChange={(e) => updateGuarantor(i, 'phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                              maxLength={10}
                              inputMode="numeric"
                            />
                            <Select
                              value={g.gender || ''}
                              onChange={(e) => updateGuarantor(i, 'gender', e.target.value)}
                              options={[
                                { value: 'male', label: 'Male' },
                                { value: 'female', label: 'Female' }
                              ]}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    Array.isArray(tenant.guarantors) && tenant.guarantors.length > 0 ? (
                      <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                        {tenant.guarantors.map((g, i) => (
                          <li key={i}>
                            <span className="font-semibold">{g.name}</span> ({g.gender}) — {g.phone}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-400">None provided</p>
                    )
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-slate-500 uppercase text-[10px]">AMC Service Logs</p>
                    {isEditMode && (
                      <button
                        type="button"
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800"
                        onClick={() => {
                          const logs = [...(editData.amc_service_log || [])];
                          logs.push({ date: new Date().toISOString().split('T')[0], what_change: '', old_serial_no: '', new_serial_no: '', cost: '' });
                          setEditData({ ...editData, amc_service_log: logs });
                        }}
                      >
                        + Add Log
                      </button>
                    )}
                  </div>
                  
                  {isEditMode ? (
                    editData.amc_service_log && editData.amc_service_log.length > 0 ? (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                          <thead className="bg-slate-50 dark:bg-slate-800/80 uppercase font-semibold text-[10px] text-slate-500">
                            <tr>
                              <th className="px-3 py-2">Date</th>
                              <th className="px-3 py-2">What Changed</th>
                              <th className="px-3 py-2">Old Serial #</th>
                              <th className="px-3 py-2">New Serial #</th>
                              <th className="px-3 py-2">Cost (₹)</th>
                              <th className="px-3 py-2 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {editData.amc_service_log.map((log, i) => (
                              <tr key={i} className="bg-white dark:bg-slate-900/40 hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                <td className="px-3 py-2">
                                  <input type="date" className="w-full bg-transparent border border-slate-200 dark:border-white/10 rounded px-2 py-1 focus:outline-none focus:border-blue-500" value={log.date || ''} onChange={(e) => { const logs = [...editData.amc_service_log]; logs[i].date = e.target.value; setEditData({ ...editData, amc_service_log: logs }); }} />
                                </td>
                                <td className="px-3 py-2">
                                  <input type="text" className="w-full bg-transparent border border-slate-200 dark:border-white/10 rounded px-2 py-1 focus:outline-none focus:border-blue-500" value={log.what_change || ''} onChange={(e) => { const logs = [...editData.amc_service_log]; logs[i].what_change = e.target.value; setEditData({ ...editData, amc_service_log: logs }); }} placeholder="e.g. Battery" />
                                </td>
                                <td className="px-3 py-2">
                                  <input type="text" className="w-full bg-transparent border border-slate-200 dark:border-white/10 rounded px-2 py-1 focus:outline-none focus:border-blue-500" value={log.old_serial_no || ''} onChange={(e) => { const logs = [...editData.amc_service_log]; logs[i].old_serial_no = e.target.value; setEditData({ ...editData, amc_service_log: logs }); }} />
                                </td>
                                <td className="px-3 py-2">
                                  <input type="text" className="w-full bg-transparent border border-slate-200 dark:border-white/10 rounded px-2 py-1 focus:outline-none focus:border-blue-500" value={log.new_serial_no || ''} onChange={(e) => { const logs = [...editData.amc_service_log]; logs[i].new_serial_no = e.target.value; setEditData({ ...editData, amc_service_log: logs }); }} />
                                </td>
                                <td className="px-3 py-2">
                                  <input type="number" className="w-full bg-transparent border border-slate-200 dark:border-white/10 rounded px-2 py-1 focus:outline-none focus:border-blue-500" value={log.cost || ''} onChange={(e) => { const logs = [...editData.amc_service_log]; logs[i].cost = e.target.value; setEditData({ ...editData, amc_service_log: logs }); }} />
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <button type="button" className="text-red-500 hover:text-red-700 p-1" onClick={() => { const logs = [...editData.amc_service_log]; logs.splice(i, 1); setEditData({ ...editData, amc_service_log: logs }); }}><Trash2 className="w-3.5 h-3.5 mx-auto" /></button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-white/10 text-center">Currently empty. Click "+ Add Log" to add an AMC service record.</p>
                    )
                  ) : (
                    Array.isArray(tenant.amc_service_log) && tenant.amc_service_log.length > 0 ? (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                          <thead className="bg-slate-50 dark:bg-slate-800/80 uppercase font-semibold text-[10px] text-slate-500">
                            <tr>
                              <th className="px-3 py-2">Date</th>
                              <th className="px-3 py-2">What Changed</th>
                              <th className="px-3 py-2">Old Serial #</th>
                              <th className="px-3 py-2">New Serial #</th>
                              <th className="px-3 py-2 text-right">Cost (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {tenant.amc_service_log.map((log, i) => (
                              <tr key={i} className="bg-white dark:bg-slate-900/40 hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                <td className="px-3 py-2">{log.date || '—'}</td>
                                <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">{log.what_change || '—'}</td>
                                <td className="px-3 py-2">{log.old_serial_no || '—'}</td>
                                <td className="px-3 py-2">{log.new_serial_no || '—'}</td>
                                <td className="px-3 py-2 text-right font-medium text-emerald-600 dark:text-emerald-400">{log.cost ? formatCurrency(log.cost) : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-white/10 text-center">Currently empty.</p>
                    )
                  )}
                </div>
          </Card>

          {/* Documents Vault */}
          <Card title={isEditMode ? "Edit Documents" : "Secured Documents"}>
            <div className="space-y-3">
              {[
                { label: 'Aadhar Card', url: signedDocs.aadhar_url, path: tenant.aadhar_path, docType: 'aadhar_path' },
                { label: 'PAN Card', url: signedDocs.pan_url, path: tenant.pan_path, docType: 'pan_path' },
                { label: 'Cheque', url: signedDocs.cheque_url, path: tenant.cheque_path, docType: 'cheque_path' },
                { label: 'Electricity Bill', url: signedDocs.electricity_bill_url, path: tenant.electricity_bill_path, docType: 'electricity_bill_path' },
                { label: tenant.status === 'direct_purchase' ? 'Buyer Photo' : 'Tenant Photo', url: signedDocs.tenant_photo_url, path: tenant.tenant_photo_path, docType: 'tenant_photo_path' },
                { label: 'Scooty Photo', url: signedDocs.scooty_photo_url, path: tenant.scooty_photo_path, docType: 'scooty_photo_path' },
                tenant.status === 'direct_purchase'
                  ? { label: 'Invoice Document', url: signedDocs.invoice_doc_url, path: tenant.invoice_doc_path, docType: 'invoice_doc_path' }
                  : { label: 'Rent Agreement', url: signedDocs.rent_agreement_url, path: tenant.rent_agreement_path, docType: 'rent_agreement_path' },
                { label: 'Scooty Insurance', url: signedDocs.scooty_insurance_url, path: tenant.scooty_insurance_path, docType: 'scooty_insurance_path' },
                { label: 'Rider Insurance', url: signedDocs.rider_insurance_url, path: tenant.rider_insurance_path, docType: 'rider_insurance_path' },
                { label: 'Rider License', url: signedDocs.rider_license_url, path: tenant.rider_license_path, docType: 'rider_license_path' },
                { label: 'AMC Document', url: signedDocs.amc_doc_url, path: tenant.amc_doc_path, docType: 'amc_doc_path' },
              ].map((item, idx) => (
                isEditMode ? (
                  <div key={idx} className="mb-4">
                    <FileUpload
                      label={item.label}
                      docType={item.docType}
                      currentPath={item.path}
                      currentUrl={item.url}
                      tenantId={tenantId}
                      onUploaded={() => loadAllData()}
                    />
                  </div>
                ) : (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-slate-800/40"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {item.label}
                      </span>
                    </div>

                    {item.url ? (
                      <button
                        type="button"
                        onClick={() => setViewingDoc({ label: item.label, url: item.url })}
                        className="inline-flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> View
                      </button>
                    ) : (
                      <span className="text-[11px] font-semibold text-amber-600">Pending</span>
                    )}
                  </div>
                )
              ))}
            </div>
          </Card>
        </div>

        {/* Payment History Timeline (Hidden in edit mode) */}
        {!isEditMode && (
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
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                  <thead className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/60 text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">GST</th>
                      <th className="px-4 py-3">Mode</th>
                      <th className="px-4 py-3">Collected By</th>
                      <th className="px-4 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-white/5">
                        <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                          {formatDate(p.payment_date)}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {p.gst_amount && Number(p.gst_amount) > 0 ? formatCurrency(p.gst_amount) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge status={p.mode} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
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
        )}
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Installment Collection"
        subtitle={`Tenant: ${tenant.name} • Remaining: ${formatCurrency(balance.outstanding)}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4" autoComplete="off">
          {paymentError && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{paymentError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Principal Amount Collected (₹)"
              type="number"
              placeholder="250"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              required
            />
            {tenant?.include_gst && (
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  GST Amount (+{tenant.gst_percent}%)
                </span>
                <div className="flex items-center h-10 px-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  ₹{(((Number(paymentAmount) || 0) * (tenant.gst_percent || 0)) / 100).toFixed(2)}
                </div>
              </div>
            )}
          </div>

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

      {/* Cancel Rental/Purchase Confirmation Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title={tenant.status === 'direct_purchase' ? "Cancel Direct Purchase" : "Confirm Rental Cancellation"}
        subtitle="This action restores vehicle stock and closes the contract"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-700 dark:text-slate-300">
            Are you sure you want to cancel the {tenant.status === 'direct_purchase' ? 'purchase' : 'rental'} contract for <span className="font-bold">{tenant.name}</span>?
            The EV model stock will automatically increase by 1 in the inventory.
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsCancelModalOpen(false)}
            >
              No, Keep Active
            </Button>
            <Button
              variant="danger"
              size="md"
              loading={isCancelling}
              onClick={handleCancelRental}
            >
              Yes, Cancel Contract
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
