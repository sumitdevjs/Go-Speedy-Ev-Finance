'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Bike,
  User,
  FileText,
  Cpu,
  IndianRupee,
  Users2,
  ShieldAlert,
  Calendar,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Wrench,
  Trash2,
} from 'lucide-react';
import Header from '../../../../components/layout/Header';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import FileUpload from '../../../../components/ui/FileUpload';
import { confirmDialog } from '../../../../lib/confirmDialog';
import { toast } from '../../../../lib/toast';
import Modal from '../../../../components/ui/Modal';
import api from '../../../../lib/api';
import {
  formatCurrency,
  DOWNPAYMENT_MODES,
  INSTALLMENT_FREQUENCIES,
  REFERENCE_CATEGORIES,
  RTO_TYPES,
  HP_FINANCERS,
} from '../../../../lib/constants';

const DRAFT_KEY = 'gs_rental_form_draft';

const ALL_STEPS = [
  { id: 1, name: 'EV Model', icon: Bike },
  { id: 2, name: 'Personal', icon: User },
  { id: 3, name: 'Documents', icon: FileText },
  { id: 4, name: 'Scooty HW', icon: Cpu },
  { id: 5, name: 'Insurance', icon: ShieldCheck },
  { id: 6, name: 'Downpayment', icon: IndianRupee },
  { id: 7, name: 'Reference', icon: Users2 },
  { id: 8, name: 'Guarantors', icon: ShieldAlert },
  { id: 9, name: 'Contract', icon: Calendar },
  { id: 10, name: 'AMC', icon: Wrench },
];

export default function NewRentalWizardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentStep, setCurrentStep] = useState(1);
  const [models, setModels] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Pending Docs Confirmation Modal
  const [isPendingDocsModalOpen, setIsPendingDocsModalOpen] = useState(false);
  const [missingDocsList, setMissingDocsList] = useState([]);

  // Form State
  const isDirectPurchase = false;
  const STEPS = ALL_STEPS;
  const [formData, setFormData] = useState({
    // Step 1: Model
    ev_model_id: searchParams.get('model_id') || '',

    // Step 2: Personal
    name: searchParams.get('name') || '',
    phone: searchParams.get('phone') || '',
    gender: 'male',
    address: '',
    rent_agreement_signed: false,

    // Step 3: Documents
    aadhar_path: '',
    pan_path: '',
    cheque_path: '',
    electricity_bill_path: '',
    tenant_photo_path: '',
    scooty_photo_path: '',
    rent_agreement_path: '',
    scooty_insurance_path: '',
    rider_insurance_path: '',
    rider_license_path: '',
    amc_doc_path: '',

    // Step 4: Scooty Hardware
    chassis_no: '',
    motor_ctrl_no: '',
    battery_no: '',
    vehicle_number: '',
    rto_type: 'rto',
    hp_financer: 'go_speedy',
    hp_financer_other: '',
    date_of_purchase: new Date().toISOString().split('T')[0],
    date_of_delivery: new Date().toISOString().split('T')[0],

    // Step 5: Insurance
    scooty_insurance_company: '',
    scooty_policy_number: '',
    scooty_policy_expiry: '',
    scooty_insurance_amount: '',
    scooty_insurance_idv: '',
    scooty_insurance_start: '',
    rider_insurance_company: '',
    rider_policy_number: '',
    rider_policy_expiry: '',
    rider_insurance_amount: '',
    rider_insurance_idv: '',
    rider_insurance_start: '',
    notes: '',

    // Step 6: Financial & Downpayment
    booking_amount: Number(searchParams.get('amount') || 0),
    downpayment_paid: 10000,
    downpayment_mode: 'cash',
    dp_by_other: false,
    dp_other_name: '',
    dp_other_phone: '',
    buyback_amount: '',

    // Step 7: 1 Reference
    references: [
      { category: '', name: '', area: '', phone: '' },
    ],

    // Step 8: 2 Guarantors (1 Male + 1 Female mandatory)
    guarantors: [
      { gender: 'male', name: '', address: '', phone: '' },
      { gender: 'female', name: '', address: '', phone: '' },
    ],

    // Step 9: Installments & Timeline
    installment_daily_rate: '250',
    installment_frequency: 'daily',
    installment_by_self: true,
    installment_other_name: '',
    installment_other_phone: '',
    start_date: new Date().toISOString().split('T')[0],
    total_months: 24,
    include_gst: false,
    gst_percent: 0,

    // Step 10: AMC
    amc_amount: '',
    amc_start_date: '',
    amc_expire_date: '',
    amc_service_log: [],

    // Optional booking linkage
    booking_id: searchParams.get('booking_id') || '',
  });

  // Load models & draft
  useEffect(() => {
    api.get('/api/models/dropdown').then((res) => {
      if (res.data?.success) {
        setModels(res.data.data || []);
      }
    });

    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved && !searchParams.get('booking_id')) {
      try {
        const parsed = JSON.parse(saved);
        const { isDirectPurchase: _, ...validData } = parsed;
        setFormData((prev) => ({ ...prev, ...validData }));
      } catch (err) {
        console.warn('Could not parse saved draft:', err);
      }
    }
  }, []);

  // Autosave to localStorage
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...formData, isDirectPurchase }));
  }, [formData, isDirectPurchase]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateReference = (idx, field, val) => {
    const updated = [...formData.references];
    updated[idx][field] = val;
    setFormData((prev) => ({ ...prev, references: updated }));
  };

  const updateGuarantor = (idx, field, val) => {
    const updated = [...formData.guarantors];
    updated[idx][field] = val;
    setFormData((prev) => ({ ...prev, guarantors: updated }));
  };

  const clearDraft = async () => {
    const ok = await confirmDialog({
      title: 'Discard draft and start over?',
      message: 'Everything entered so far will be cleared. This cannot be undone.',
      tone: 'danger',
      confirmLabel: 'Discard Draft',
      cancelLabel: 'Keep Editing',
    });
    if (ok) {
      localStorage.removeItem(DRAFT_KEY);
      window.location.reload();
    }
  };

  const validateStep = (step) => {
    setErrorMessage('');
    if (step === 1) {
      if (!formData.ev_model_id) {
        setErrorMessage('Please select an EV model to proceed');
        return false;
      }
    }
    if (step === 2) {
      if (!formData.name.trim() || !formData.phone.trim() || !formData.address.trim()) {
        setErrorMessage('Name, phone, and address are required');
        return false;
      }
      if (!/^\d{10}$/.test(formData.phone.trim())) {
        setErrorMessage('Phone number must be exactly 10 digits');
        return false;
      }
    }
    if (step === 4) {
      if (!formData.vehicle_number?.trim() || !formData.chassis_no.trim() || !formData.motor_ctrl_no.trim() || !formData.battery_no.trim() || !formData.rto_type || !formData.hp_financer || !formData.date_of_purchase || !formData.date_of_delivery) {
        setErrorMessage('All hardware and registration details are required');
        return false;
      }
    }
    if (step === 5) {
      if (!formData.scooty_insurance_company.trim() || !formData.scooty_policy_number.trim() || !formData.scooty_policy_expiry || !formData.scooty_insurance_amount || !formData.scooty_insurance_idv || !formData.scooty_insurance_start ||
          !formData.rider_insurance_company.trim() || !formData.rider_policy_number.trim() || !formData.rider_policy_expiry || !formData.rider_insurance_amount || !formData.rider_insurance_idv || !formData.rider_insurance_start) {
        setErrorMessage('All insurance details are required');
        return false;
      }
    }
    if (step === 6 && !isDirectPurchase) {
      if (formData.booking_amount === '' || formData.downpayment_paid === '' || !formData.downpayment_mode || formData.buyback_amount === '') {
        setErrorMessage('All downpayment and financial details are required');
        return false;
      }
      if (formData.dp_by_other && formData.dp_other_phone && !/^\d{10}$/.test(formData.dp_other_phone.trim())) {
        setErrorMessage('Sponsor phone number must be exactly 10 digits');
        return false;
      }
    }
    if (step === 7) {
      const missingRef = formData.references.some(r => !r.category || !r.name.trim() || !r.area.trim() || !r.phone.trim());
      if (missingRef) {
        setErrorMessage('Reference details are required');
        return false;
      }
      const invalidRefPhone = formData.references.some(r => !/^\d{10}$/.test(r.phone.trim()));
      if (invalidRefPhone) {
        setErrorMessage('Reference phone number must be exactly 10 digits');
        return false;
      }
    }
    if (step === 8) {
      const missingGuarantor = formData.guarantors.some(g => !g.gender || !g.name.trim() || !g.address.trim() || !g.phone.trim());
      if (missingGuarantor) {
        setErrorMessage('All guarantor details are required');
        return false;
      }
      const invalidGuarantorPhone = formData.guarantors.some(g => !/^\d{10}$/.test(g.phone.trim()));
      if (invalidGuarantorPhone) {
        setErrorMessage('All guarantor phone numbers must be exactly 10 digits');
        return false;
      }
    }
    if (step === 9 && !isDirectPurchase) {
      if (!formData.installment_frequency || formData.start_date === '' || formData.total_months === '') {
        setErrorMessage('All installment details (except daily rate) are required');
        return false;
      }
      if (!formData.installment_by_self && formData.installment_other_phone && !/^\d{10}$/.test(formData.installment_other_phone.trim())) {
        setErrorMessage('Payer phone number must be exactly 10 digits');
        return false;
      }
    }
    if (step === 10) {
      if (formData.amc_amount === '' || formData.amc_start_date === '' || formData.amc_expire_date === '') {
        setErrorMessage('AMC amount and dates are required');
        return false;
      }
    }
    return true;
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;

    if (currentStep === 4) {
      try {
        setIsSubmitting(true);
        const res = await api.get(`/api/rentals/check-uniqueness?chassis_no=${encodeURIComponent(formData.chassis_no)}&motor_ctrl_no=${encodeURIComponent(formData.motor_ctrl_no)}&battery_no=${encodeURIComponent(formData.battery_no)}&vehicle_number=${encodeURIComponent(formData.vehicle_number || '')}`);
        if (res.data?.success && res.data.data?.exists) {
          setErrorMessage(res.data.data.message);
          return;
        }
      } catch (err) {
        setErrorMessage('Failed to validate hardware numbers');
        return;
      } finally {
        setIsSubmitting(false);
      }
    }

    if (currentStep === 5) {
      try {
        setIsSubmitting(true);
        const res = await api.get(`/api/rentals/check-uniqueness?scooty_policy_number=${encodeURIComponent(formData.scooty_policy_number)}&rider_policy_number=${encodeURIComponent(formData.rider_policy_number)}`);
        if (res.data?.success && res.data.data?.exists) {
          setErrorMessage(res.data.data.message);
          return;
        }
      } catch (err) {
        setErrorMessage('Failed to validate policy numbers');
        return;
      } finally {
        setIsSubmitting(false);
      }
    }

    const currentIndex = STEPS.findIndex(s => s.id === currentStep);
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1].id);
    }
  };

  const handlePrev = () => {
    setErrorMessage('');
    const currentIndex = STEPS.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].id);
    }
  };

  // Submit Flow with Pending Docs check
  const handleSubmitClick = () => {
    setErrorMessage('');
    if (!validateStep(currentStep)) return;

    // Check missing documents
    const docLabels = [
      { key: 'aadhar_path', label: 'Aadhar Card Photo' },
      { key: 'pan_path', label: 'PAN Card Photo' },
      { key: 'cheque_path', label: 'Bank Cheque Photo' },
      { key: 'electricity_bill_path', label: 'Electricity Bill Photo' },
      { key: 'tenant_photo_path', label: 'Tenant Profile Photo' },
      { key: 'scooty_photo_path', label: 'Scooty Handover Photo' },
      { key: 'rent_agreement_path', label: 'Rent Agreement Photo' },
      { key: 'scooty_insurance_path', label: 'Scooty Insurance Policy' },
      { key: 'rider_insurance_path', label: 'Rider Insurance Policy' },
      { key: 'rider_license_path', label: 'Rider License' },
    ];

    const missing = docLabels
      .filter((d) => !formData[d.key])
      .map((d) => d.label);

    if (missing.length > 0) {
      setMissingDocsList(missing);
      setIsPendingDocsModalOpen(true);
    } else {
      executeSubmission(false);
    }
  };

  const executeSubmission = async (hasPendingDocs) => {
    setIsPendingDocsModalOpen(false);
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const { booking_id, isDirectPurchase: _, hp_financer_other, ...restFormData } = formData;
      const payload = {
        ...restFormData,
        hp_financer: formData.hp_financer === 'other' ? (hp_financer_other || 'Other') : formData.hp_financer,
        references: formData.references.map(r => ({
          category: r.category === 'other' ? (r.customCategory || 'Other') : r.category,
          name: r.name,
          area: r.area,
          phone: r.phone
        })),
        has_pending_docs: hasPendingDocs,
        booking_amount: isDirectPurchase ? 0 : Number(formData.booking_amount || 0),
        downpayment_paid: isDirectPurchase ? 0 : Number(formData.downpayment_paid || 0),
        installment_daily_rate: Number(formData.installment_daily_rate || 250),
        total_months: Number(formData.total_months || 24),
        status: isDirectPurchase ? 'direct_purchase' : undefined,
      };

      let res;
      if (formData.booking_id) {
        res = await api.patch(`/api/bookings/${formData.booking_id}/convert`, payload);
      } else {
        res = await api.post('/api/rentals', payload);
      }

      if (res.data?.success) {
        localStorage.removeItem(DRAFT_KEY);
        const newId = res.data.data?.id;
        toast.success(isDirectPurchase ? 'Direct purchase recorded!' : 'Rental issued successfully!');
        router.replace(`/rentals/${newId}`);
      } else {
        throw new Error(res.data?.message || 'Submission failed');
      }
    } catch (err) {
      console.error('Rental registration error:', err);
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to issue rental'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedModel = models.find((m) => m.id === formData.ev_model_id);

  return (
    <div>
      <Header
        title="Issue New EV Rental"
        subtitle="10-Step fast registration wizard with draft autosave"
        action={
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" icon={RotateCcw} onClick={clearDraft}>
              Discard Draft
            </Button>
          </div>
        }
      />

      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        {/* Step Progress Pills */}
        <div className="bg-white/90 dark:bg-slate-900/60 p-2 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 backdrop-blur-xl card-elevation shadow-xs dark:shadow-[0_8px_30px_rgb(0,0,0,0.35)] overflow-x-auto -webkit-overflow-scrolling-touch transition-colors">
          <div className="flex items-center justify-between w-full">
            {STEPS.map((s, idx) => {
              const Icon = s.icon;
              const isDone = currentStep > s.id;
              const isCurrent = currentStep === s.id;

              return (
                <div key={s.id} className="flex items-center flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (validateStep(currentStep)) setCurrentStep(s.id);
                    }}
                    className={`flex items-center gap-1 md:gap-2 text-[10px] md:text-xs font-semibold py-1.5 px-1.5 md:px-3 rounded-lg transition-smooth whitespace-nowrap ${
                      isCurrent
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isDone
                        ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Icon className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
                    )}
                    <span className="hidden lg:inline">
                      {s.id}. {s.name}
                    </span>
                    <span className="lg:hidden">
                      {s.id}
                    </span>
                  </button>

                  {idx < STEPS.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-1 md:mx-2 ${
                        isDone ? 'bg-emerald-300' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Wizard Form Card */}
        <Card>
          {/* STEP 1: MODEL */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Select EV Scooter Model</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose from models currently available in Delhi hubs
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {models.filter(m => m.is_active || formData.ev_model_id === m.id).map((m) => {
                  const selected = formData.ev_model_id === m.id;
                  const inStock = (m.stock_count || 0) > 0;

                  return (
                    <div
                      key={m.id}
                      onClick={() => inStock && updateField('ev_model_id', m.id)}
                      className={`p-4 rounded-xl border-2 transition-smooth cursor-pointer ${
                        selected
                          ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-500/10 shadow-sm'
                          : inStock
                          ? 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/60'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/40 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">{m.name}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                            inStock
                              ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                              : 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {m.stock_count} in stock
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{m.company} • {m.ward}</p>
                      <p className="text-sm font-black text-blue-600 dark:text-blue-400 mt-3">
                        {formatCurrency(m.total_price)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: PERSONAL */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Tenant Personal Details</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Legal identity information for contract agreement
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  placeholder="e.g. Gurpreet Singh"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  required
                />

                <Input
                  label="Phone Number"
                  placeholder="10-digit mobile number"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  maxLength={10}
                  inputMode="numeric"
                  required
                />

                <Select
                  label="Gender"
                  value={formData.gender}
                  onChange={(e) => updateField('gender', e.target.value)}
                  options={[
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                  ]}
                  required
                />

                <Input
                  label="Current Residential Address"
                  placeholder="House No, Ward, City, Pincode"
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  required
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.rent_agreement_signed}
                    onChange={(e) => updateField('rent_agreement_signed', e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Physical rent agreement physically signed and verified</span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 3: DOCUMENTS */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Document Uploads</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FileUpload
                  label="Aadhar Card"
                  docType="aadhar_path"
                  currentPath={formData.aadhar_path}
                  onUploaded={(path) => updateField('aadhar_path', path)}
                />

                <FileUpload
                  label="PAN Card"
                  docType="pan_path"
                  currentPath={formData.pan_path}
                  onUploaded={(path) => updateField('pan_path', path)}
                />

                <FileUpload
                  label="Security Cheque"
                  docType="cheque_path"
                  currentPath={formData.cheque_path}
                  onUploaded={(path) => updateField('cheque_path', path)}
                />

                <FileUpload
                  label="Electricity Bill"
                  docType="electricity_bill_path"
                  currentPath={formData.electricity_bill_path}
                  onUploaded={(path) => updateField('electricity_bill_path', path)}
                />

                <FileUpload
                  label="Tenant Photo"
                  docType="tenant_photo_path"
                  currentPath={formData.tenant_photo_path}
                  onUploaded={(path) => updateField('tenant_photo_path', path)}
                />

                <FileUpload
                  label="Scooty Handover Photo"
                  docType="scooty_photo_path"
                  currentPath={formData.scooty_photo_path}
                  onUploaded={(path) => updateField('scooty_photo_path', path)}
                />

                <FileUpload
                  label="Rent Agreement"
                  docType="rent_agreement_path"
                  currentPath={formData.rent_agreement_path}
                  onUploaded={(path) => updateField('rent_agreement_path', path)}
                />
                <FileUpload
                  label="Scooty Insurance Document"
                  docType="scooty_insurance_path"
                  currentPath={formData.scooty_insurance_path}
                  onUploaded={(path) => updateField('scooty_insurance_path', path)}
                />
                <FileUpload
                  label="Rider Insurance Document"
                  docType="rider_insurance_path"
                  currentPath={formData.rider_insurance_path}
                  onUploaded={(path) => updateField('rider_insurance_path', path)}
                />
                <FileUpload
                  label="Rider License"
                  docType="rider_license_path"
                  currentPath={formData.rider_license_path}
                  onUploaded={(path) => updateField('rider_license_path', path)}
                />
                <FileUpload
                  label="AMC Document"
                  docType="amc_doc_path"
                  currentPath={formData.amc_doc_path}
                  onUploaded={(path) => updateField('amc_doc_path', path)}
                />
              </div>
            </div>
          )}

          {/* STEP 4: SCOOTY HARDWARE */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">EV Hardware Identification</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Unique serial numbers for vehicle tracking and compliance
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Vehicle Registration Number"
                  placeholder="e.g. DL-01EV-1234"
                  value={formData.vehicle_number}
                  onChange={(e) => updateField('vehicle_number', e.target.value)}
                  required
                />

                <Input
                  label="Chassis Number"
                  placeholder="e.g. CHSS-882190"
                  value={formData.chassis_no}
                  onChange={(e) => updateField('chassis_no', e.target.value)}
                  required
                />

                <Input
                  label="Motor Controller Number"
                  placeholder="e.g. MTR-49102"
                  value={formData.motor_ctrl_no}
                  onChange={(e) => updateField('motor_ctrl_no', e.target.value)}
                  required
                />

                <Input
                  label="Battery Serial Number"
                  placeholder="e.g. BAT-99120"
                  value={formData.battery_no}
                  onChange={(e) => updateField('battery_no', e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <Select
                  label="RTO Type"
                  value={formData.rto_type}
                  onChange={(e) => updateField('rto_type', e.target.value)}
                  options={RTO_TYPES}
                  required
                />

                <Select
                  label="Financer"
                  value={formData.hp_financer}
                  onChange={(e) => updateField('hp_financer', e.target.value)}
                  options={HP_FINANCERS}
                  required
                />
                {formData.hp_financer === 'other' && (
                  <Input
                    label="Custom Financer"
                    placeholder="Enter custom financer name"
                    value={formData.hp_financer_other}
                    onChange={(e) => updateField('hp_financer_other', e.target.value)}
                    required
                  />
                )}

                <Input
                  label="Date of Purchase"
                  type="date"
                  value={formData.date_of_purchase}
                  onChange={(e) => updateField('date_of_purchase', e.target.value)}
                  required
                />

                <Input
                  label="Date of Handover / Delivery"
                  type="date"
                  value={formData.date_of_delivery}
                  onChange={(e) => updateField('date_of_delivery', e.target.value)}
                  required
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Additional Notes
                </label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-smooth"
                  placeholder="Add a note (e.g., How many times the battery got replaced, how many times the controller or charger got damaged, and how often they came to us for repairs)"
                  rows={3}
                  value={formData.notes || ''}
                  onChange={(e) => updateField('notes', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* STEP 5: INSURANCE DETAILS */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Insurance Details</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mandatory vehicle and rider insurance information
                </p>
              </div>

              <div className="pt-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Scooty Insurance Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Insurance Company"
                    placeholder="e.g. ICICI Lombard"
                    value={formData.scooty_insurance_company}
                    onChange={(e) => updateField('scooty_insurance_company', e.target.value)}
                    required
                  />
                  <Input
                    label="Policy Number"
                    placeholder="e.g. POL-123456"
                    value={formData.scooty_policy_number}
                    onChange={(e) => updateField('scooty_policy_number', e.target.value)}
                    required
                  />
                  <Input
                    label="Amount (₹)"
                    type="number"
                    value={formData.scooty_insurance_amount}
                    onChange={(e) => updateField('scooty_insurance_amount', e.target.value)}
                    required
                  />
                  <Input
                    label="IDV (₹)"
                    type="number"
                    value={formData.scooty_insurance_idv}
                    onChange={(e) => updateField('scooty_insurance_idv', e.target.value)}
                    required
                  />
                  <Input
                    label="Start Date"
                    type="date"
                    value={formData.scooty_insurance_start}
                    onChange={(e) => updateField('scooty_insurance_start', e.target.value)}
                    required
                  />
                  <Input
                    label="Expiry Date"
                    type="date"
                    value={formData.scooty_policy_expiry}
                    onChange={(e) => updateField('scooty_policy_expiry', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 mt-4">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 mt-2">Rider Insurance Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Insurance Company"
                    placeholder="e.g. Bajaj Allianz"
                    value={formData.rider_insurance_company}
                    onChange={(e) => updateField('rider_insurance_company', e.target.value)}
                    required
                  />
                  <Input
                    label="Policy Number"
                    placeholder="e.g. POL-987654"
                    value={formData.rider_policy_number}
                    onChange={(e) => updateField('rider_policy_number', e.target.value)}
                    required
                  />
                  <Input
                    label="Amount (₹)"
                    type="number"
                    value={formData.rider_insurance_amount}
                    onChange={(e) => updateField('rider_insurance_amount', e.target.value)}
                    required
                  />
                  <Input
                    label="IDV (₹)"
                    type="number"
                    value={formData.rider_insurance_idv}
                    onChange={(e) => updateField('rider_insurance_idv', e.target.value)}
                    required
                  />
                  <Input
                    label="Start Date"
                    type="date"
                    value={formData.rider_insurance_start}
                    onChange={(e) => updateField('rider_insurance_start', e.target.value)}
                    required
                  />
                  <Input
                    label="Expiry Date"
                    type="date"
                    value={formData.rider_policy_expiry}
                    onChange={(e) => updateField('rider_policy_expiry', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: DOWNPAYMENT */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Financial Breakdown & Downpayment</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Booking deduction and day-1 initial payment
                </p>
              </div>

              {selectedModel && (
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-white/10 grid grid-cols-4 gap-4 text-center">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Sticker Price</span>
                    <p className="text-base font-black text-slate-900 dark:text-white">{formatCurrency(selectedModel.total_price)}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Booking Token</span>
                    <p className="text-base font-black text-emerald-600">-{formatCurrency(formData.booking_amount)}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Downpayment</span>
                    <p className="text-base font-black text-emerald-600">-{formatCurrency(formData.downpayment_paid)}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Balance to Pay</span>
                    <p className="text-base font-black text-blue-600">
                      {formatCurrency(selectedModel.total_price - Number(formData.booking_amount || 0) - Number(formData.downpayment_paid || 0))}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Booking Token Amount (₹)"
                  type="number"
                  value={formData.booking_amount}
                  onChange={(e) => updateField('booking_amount', e.target.value)}
                  required
                />

                <Input
                  label="Downpayment Paid on Delivery (₹)"
                  type="number"
                  value={formData.downpayment_paid}
                  onChange={(e) => updateField('downpayment_paid', e.target.value)}
                  required
                />

                <Select
                  label="Downpayment Mode"
                  value={formData.downpayment_mode}
                  onChange={(e) => updateField('downpayment_mode', e.target.value)}
                  options={DOWNPAYMENT_MODES}
                  required
                />

                <Input
                  label="Buyback / Early Exit Fee (₹)"
                  type="number"
                  value={formData.buyback_amount}
                  onChange={(e) => updateField('buyback_amount', e.target.value)}
                  required
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.dp_by_other}
                    onChange={(e) => updateField('dp_by_other', e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Downpayment paid by another person (sponsor / relative)</span>
                </label>

                {formData.dp_by_other && (
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <Input
                      label="Sponsor Full Name"
                      placeholder="Name"
                      value={formData.dp_other_name}
                      onChange={(e) => updateField('dp_other_name', e.target.value)}
                    />
                    <Input
                      label="Sponsor Mobile Phone"
                      placeholder="10-digit mobile number"
                      value={formData.dp_other_phone}
                      onChange={(e) => updateField('dp_other_phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      maxLength={10}
                      inputMode="numeric"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 7: REFERENCE */}
          {currentStep === 7 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Notable Reference</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  DSGMC Member, Nigam Parshad, MLA or respected community reference
                </p>
              </div>

              <div className="space-y-3">
                {formData.references.map((ref, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-1 space-y-2">
                      <Select
                        label="Reference Category"
                        value={ref.category}
                        onChange={(e) => updateReference(idx, 'category', e.target.value)}
                        options={REFERENCE_CATEGORIES}
                        required
                      />
                      {ref.category === 'other' && (
                        <Input
                          placeholder="Please specify category"
                          value={ref.customCategory || ''}
                          onChange={(e) => updateReference(idx, 'customCategory', e.target.value)}
                          required
                        />
                      )}
                    </div>
                    <Input
                      label="Full Name"
                      placeholder="Name"
                      value={ref.name}
                      onChange={(e) => updateReference(idx, 'name', e.target.value)}
                      required
                    />
                    <Input
                      label="Ward / Area"
                      placeholder="e.g. Ward 42"
                      value={ref.area}
                      onChange={(e) => updateReference(idx, 'area', e.target.value)}
                      required
                    />
                    <Input
                      label="Mobile Phone"
                      placeholder="10-digit mobile number"
                      value={ref.phone}
                      onChange={(e) => updateReference(idx, 'phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      maxLength={10}
                      inputMode="numeric"
                      required
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 8: 2 GUARANTORS */}
          {currentStep === 8 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">2 Co-Signer Guarantors</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  1 Male and 1 Female guarantor mandatory per policy
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {formData.guarantors.map((g, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Guarantor #{idx + 1} ({g.gender.toUpperCase()})
                      </span>
                    </div>

                    <Input
                      label="Full Name"
                      placeholder="Name"
                      value={g.name}
                      onChange={(e) => updateGuarantor(idx, 'name', e.target.value)}
                      required
                    />
                    <Input
                      label="Mobile Phone"
                      placeholder="10-digit mobile number"
                      value={g.phone}
                      onChange={(e) => updateGuarantor(idx, 'phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      maxLength={10}
                      inputMode="numeric"
                      required
                    />
                    <Input
                      label="Address"
                      placeholder="Residential Address"
                      value={g.address}
                      onChange={(e) => updateGuarantor(idx, 'address', e.target.value)}
                      required
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 9: INSTALLMENTS & TIMELINE */}
          {currentStep === 9 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Installment Plan & Timeline</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Collection terms: {formatCurrency(formData.installment_daily_rate)}/day over {formData.total_months}-month horizon
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Daily Rate (₹)"
                  type="number"
                  value={formData.installment_daily_rate}
                  onChange={(e) => updateField('installment_daily_rate', e.target.value)}
                />

                <Select
                  label="Collection Schedule"
                  value={formData.installment_frequency}
                  onChange={(e) => updateField('installment_frequency', e.target.value)}
                  options={[
                    { value: 'daily', label: `Daily (${formData.installment_daily_rate ? formatCurrency(formData.installment_daily_rate) : '₹0'}/day)` },
                    { value: 'weekly', label: `Weekly (${formData.installment_daily_rate ? formatCurrency(formData.installment_daily_rate * 7) : '₹0'}/wk)` },
                    { value: 'monthly', label: `Monthly (${formData.installment_daily_rate ? formatCurrency(formData.installment_daily_rate * 30) : '₹0'}/mo)` },
                  ]}
                  required
                />

                <Input
                  label="Contract Total Horizon (Months)"
                  type="number"
                  value={formData.total_months}
                  onChange={(e) => updateField('total_months', e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Contract Effective Start Date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => updateField('start_date', e.target.value)}
                />
                <Input
                  label="Expected Completion (Last Date)"
                  type="date"
                  value={(() => {
                    if (!formData.start_date) return '';
                    const d = new Date(formData.start_date);
                    if (isNaN(d.getTime())) return '';
                    d.setMonth(d.getMonth() + (Number(formData.total_months) || 24));
                    return d.toISOString().split('T')[0];
                  })()}
                  disabled
                  helperText={`Computed automatically: Start Date + ${formData.total_months || 24} months`}
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={formData.include_gst}
                    onChange={(e) => {
                      updateField('include_gst', e.target.checked);
                      if (!e.target.checked) updateField('gst_percent', 0);
                    }}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Include GST</span>
                </label>

                {formData.include_gst && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <Input
                      label="Tax Percent (%)"
                      type="number"
                      min="0"
                      value={formData.gst_percent}
                      onChange={(e) => updateField('gst_percent', parseFloat(e.target.value) || 0)}
                    />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        GST Amount (per installment)
                      </span>
                      <div className="flex items-center h-10 px-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        ₹{((formData.installment_daily_rate * (formData.gst_percent || 0)) / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!formData.installment_by_self}
                    onChange={(e) => updateField('installment_by_self', !e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Installments paid by another person / payer</span>
                </label>

                {!formData.installment_by_self && (
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <Input
                      label="Payer Full Name"
                      placeholder="Name"
                      value={formData.installment_other_name}
                      onChange={(e) => updateField('installment_other_name', e.target.value)}
                    />
                    <Input
                      label="Payer Mobile Phone"
                      placeholder="10-digit mobile number"
                      value={formData.installment_other_phone}
                      onChange={(e) => updateField('installment_other_phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      maxLength={10}
                      inputMode="numeric"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 10: AMC */}
          {currentStep === 10 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Annual Maintenance Contract (AMC)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set up AMC details for this vehicle
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="AMC Amount (₹)"
                  type="number"
                  value={formData.amc_amount}
                  onChange={(e) => updateField('amc_amount', e.target.value)}
                  required
                />
                <Input
                  label="AMC Start Date"
                  type="date"
                  value={formData.amc_start_date}
                  onChange={(e) => updateField('amc_start_date', e.target.value)}
                  required
                />
                <Input
                  label="AMC Expire Date"
                  type="date"
                  value={formData.amc_expire_date}
                  onChange={(e) => updateField('amc_expire_date', e.target.value)}
                  required
                />
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">AMC Service Log</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      updateField('amc_service_log', [
                        ...formData.amc_service_log,
                        { date: new Date().toISOString().split('T')[0], what_change: '', old_serial_no: '', new_serial_no: '', cost: '' }
                      ]);
                    }}
                  >
                    Add Service Row
                  </Button>
                </div>
                
                {formData.amc_service_log.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">No service records yet. Click add to create one.</p>
                ) : (
                  <div className="space-y-3">
                    {formData.amc_service_log.map((log, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-5 gap-3 relative group">
                        <Input
                          label="Date"
                          type="date"
                          value={log.date}
                          onChange={(e) => {
                            const newLog = [...formData.amc_service_log];
                            newLog[idx].date = e.target.value;
                            updateField('amc_service_log', newLog);
                          }}
                        />
                        <Input
                          label="What Changed"
                          placeholder="e.g. Battery Replaced"
                          value={log.what_change}
                          onChange={(e) => {
                            const newLog = [...formData.amc_service_log];
                            newLog[idx].what_change = e.target.value;
                            updateField('amc_service_log', newLog);
                          }}
                        />
                        <Input
                          label="Old Serial No."
                          placeholder="Old SN"
                          value={log.old_serial_no}
                          onChange={(e) => {
                            const newLog = [...formData.amc_service_log];
                            newLog[idx].old_serial_no = e.target.value;
                            updateField('amc_service_log', newLog);
                          }}
                        />
                        <Input
                          label="New Serial No."
                          placeholder="New SN"
                          value={log.new_serial_no}
                          onChange={(e) => {
                            const newLog = [...formData.amc_service_log];
                            newLog[idx].new_serial_no = e.target.value;
                            updateField('amc_service_log', newLog);
                          }}
                        />
                        <Input
                          label="Cost (₹)"
                          type="number"
                          placeholder="0"
                          value={log.cost}
                          onChange={(e) => {
                            const newLog = [...formData.amc_service_log];
                            newLog[idx].cost = e.target.value;
                            updateField('amc_service_log', newLog);
                          }}
                        />
                        
                        <button
                          type="button"
                          onClick={() => {
                            const newLog = [...formData.amc_service_log];
                            newLog.splice(idx, 1);
                            updateField('amc_service_log', newLog);
                          }}
                          className="absolute -top-2 -right-2 bg-white dark:bg-slate-700 text-rose-500 rounded-full p-1 border border-slate-200 dark:border-slate-600 shadow-sm md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}


          {/* Wizard Footer Controls */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-5 mt-6">
            <Button
              variant="outline"
              size="md"
              disabled={currentStep === 1 || isSubmitting}
              onClick={handlePrev}
              icon={ChevronLeft}
            >
              Previous
            </Button>

            {currentStep !== STEPS[STEPS.length - 1].id ? (
              <Button
                variant="primary"
                size="md"
                onClick={handleNext}
              >
                Continue Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                variant="success"
                size="md"
                loading={isSubmitting}
                onClick={handleSubmitClick}
              >
                Complete & Issue Rental
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Pending Documents Warning Modal */}
      <Modal
        isOpen={isPendingDocsModalOpen}
        onClose={() => setIsPendingDocsModalOpen(false)}
        title="Pending Documents Notice"
        subtitle="Some document photos have not been uploaded"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-500">
            <p className="font-bold flex items-center gap-1.5 mb-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0" />
              The following documents are not yet uploaded:
            </p>
            <ul className="list-disc list-inside space-y-0.5 ml-1 text-slate-700 dark:text-amber-200/70">
              {missingDocsList.map((doc, idx) => (
                <li key={idx}>{doc}</li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400">
            Do you want to proceed and issue this rental with documents marked as{' '}
            <span className="font-bold text-amber-700 dark:text-amber-500">pending</span>? Staff can upload them later.
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsPendingDocsModalOpen(false)}
            >
              Go Back to Upload
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => executeSubmission(true)}
            >
              Yes, Proceed
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
