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
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import Header from '../../../../components/layout/Header';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import FileUpload from '../../../../components/ui/FileUpload';
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
  { id: 5, name: 'Downpayment', icon: IndianRupee },
  { id: 6, name: 'References', icon: Users2 },
  { id: 7, name: 'Guarantors', icon: ShieldAlert },
  { id: 8, name: 'Installments', icon: Calendar },
];

export default function NewPurchaseWizardPage() {
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
  const isDirectPurchase = true;
  const STEPS = ALL_STEPS.filter(s => s.id !== 5 && s.id !== 8);
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

    // Step 4: Scooty Hardware
    chassis_no: '',
    motor_ctrl_no: '',
    battery_no: '',
    rto_type: 'rto',
    hp_financer: 'go_speedy',
    date_of_purchase: new Date().toISOString().split('T')[0],
    date_of_delivery: new Date().toISOString().split('T')[0],

    // Step 5: Financial & Downpayment
    booking_amount: Number(searchParams.get('amount') || 0),
    downpayment_paid: 10000,
    downpayment_mode: 'cash',
    dp_by_other: false,
    dp_other_name: '',
    dp_other_phone: '',

    // Step 6: 3 References
    references: [
      { category: '', name: '', area: '', phone: '' },
    ],

    // Step 7: 2 Guarantors (1 Male + 1 Female mandatory)
    guarantors: [
      { gender: 'male', name: '', address: '', phone: '' },
      { gender: 'female', name: '', address: '', phone: '' },
    ],

    // Step 8: Installments & Timeline
    installment_daily_rate: 250,
    installment_frequency: 'daily',
    installment_by_self: true,
    installment_other_name: '',
    installment_other_phone: '',
    start_date: new Date().toISOString().split('T')[0],
    total_months: 24,

    // Optional booking linkage
    booking_id: searchParams.get('booking_id') || '',
  });

  // Load models & draft
  useEffect(() => {
    api.get('/api/models').then((res) => {
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

  const clearDraft = () => {
    if (confirm('Discard draft and start over?')) {
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
      if (!formData.chassis_no.trim() || !formData.motor_ctrl_no.trim() || !formData.battery_no.trim() || !formData.rto_type || !formData.hp_financer || !formData.date_of_purchase || !formData.date_of_delivery) {
        setErrorMessage('All hardware and registration details are required');
        return false;
      }
    }
    if (step === 5) {
      if (formData.booking_amount === '' || formData.downpayment_paid === '' || !formData.downpayment_mode) {
        setErrorMessage('All downpayment details are required');
        return false;
      }
    }
    if (step === 6) {
      const missingRef = formData.references.some(r => !r.category || !r.name.trim() || !r.area.trim() || !r.phone.trim());
      if (missingRef) {
        setErrorMessage('All reference details are required');
        return false;
      }
      const invalidRefPhone = formData.references.some(r => !/^\d{10}$/.test(r.phone.trim()));
      if (invalidRefPhone) {
        setErrorMessage('All reference phone numbers must be exactly 10 digits');
        return false;
      }
    }
    if (step === 7) {
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
    if (step === 8 && !isDirectPurchase) {
      if (formData.installment_daily_rate === '' || !formData.installment_frequency || formData.start_date === '' || formData.total_months === '') {
        setErrorMessage('All installment details are required');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      const currentIndex = STEPS.findIndex(s => s.id === currentStep);
      if (currentIndex < STEPS.length - 1) {
        setCurrentStep(STEPS[currentIndex + 1].id);
      }
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

    // Check missing documents
    const docLabels = [
      { key: 'aadhar_path', label: 'Aadhar Card Photo' },
      { key: 'pan_path', label: 'PAN Card Photo' },
      { key: 'cheque_path', label: 'Bank Cheque Photo' },
      { key: 'electricity_bill_path', label: 'Electricity Bill Photo' },
      { key: 'tenant_photo_path', label: 'Buyer Profile Photo' },
      { key: 'scooty_photo_path', label: 'Scooty Handover Photo' },
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
      const { booking_id, isDirectPurchase: _, ...restFormData } = formData;
      const payload = {
        ...restFormData,
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
        title="New Direct Purchase"
        subtitle="6-Step fast registration wizard with draft autosave"
        action={
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" icon={RotateCcw} onClick={clearDraft}>
              Discard Draft
            </Button>
          </div>
        }
      />

      <div className="p-8 max-w-5xl mx-auto space-y-6">
        {/* Step Progress Pills */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 card-elevation overflow-x-auto">
          <div className="flex items-center justify-between min-w-[700px]">
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
                    className={`flex items-center gap-2 text-xs font-semibold py-1.5 px-3 rounded-lg transition-smooth ${
                      isCurrent
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isDone
                        ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                    <span>
                      {s.id}. {s.name}
                    </span>
                  </button>

                  {idx < STEPS.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 ${
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
                <h3 className="text-base font-bold text-slate-900">Select EV Scooter Model</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose from models currently available in Delhi hubs
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {models.map((m) => {
                  const selected = formData.ev_model_id === m.id;
                  const inStock = (m.stock_count || 0) > 0;

                  return (
                    <div
                      key={m.id}
                      onClick={() => inStock && updateField('ev_model_id', m.id)}
                      className={`p-4 rounded-xl border-2 transition-smooth cursor-pointer ${
                        selected
                          ? 'border-blue-600 bg-blue-50/40 shadow-sm'
                          : inStock
                          ? 'border-slate-200 hover:border-slate-300 bg-white'
                          : 'border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{m.name}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                            inStock
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {m.stock_count} in stock
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{m.company} • {m.ward}</p>
                      <p className="text-sm font-black text-blue-600 mt-3">
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
                <h3 className="text-base font-bold text-slate-900">Buyer Personal Details</h3>
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
                  onChange={(e) => updateField('phone', e.target.value)}
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
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
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
                <h3 className="text-base font-bold text-slate-900">Document Uploads</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Auto-compressed to WebP ≤ 300KB and saved to private storage
                </p>
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
                  label="Buyer Photo"
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
              </div>
            </div>
          )}

          {/* STEP 4: SCOOTY HARDWARE */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">EV Hardware Identification</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Unique serial numbers for vehicle tracking and compliance
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  label="HP Financer"
                  value={formData.hp_financer}
                  onChange={(e) => updateField('hp_financer', e.target.value)}
                  options={HP_FINANCERS}
                  required
                />

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
            </div>
          )}

          {/* STEP 5: DOWNPAYMENT */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Financial Breakdown & Downpayment</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Booking deduction and day-1 initial payment
                </p>
              </div>

              {selectedModel && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Sticker Price</span>
                    <p className="text-base font-black text-slate-900">{formatCurrency(selectedModel.total_price)}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Advance Booking</span>
                    <p className="text-base font-black text-emerald-600">-{formatCurrency(formData.booking_amount)}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Contract Net</span>
                    <p className="text-base font-black text-blue-600">
                      {formatCurrency(selectedModel.total_price - formData.booking_amount)}
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
                />

                <Input
                  label="Downpayment Paid on Delivery (₹)"
                  type="number"
                  value={formData.downpayment_paid}
                  onChange={(e) => updateField('downpayment_paid', e.target.value)}
                />

                <Select
                  label="Downpayment Mode"
                  value={formData.downpayment_mode}
                  onChange={(e) => updateField('downpayment_mode', e.target.value)}
                  options={DOWNPAYMENT_MODES}
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
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
                      placeholder="Phone"
                      value={formData.dp_other_phone}
                      onChange={(e) => updateField('dp_other_phone', e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 6: 3 REFERENCES */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">3 Notable References</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  DSGMC Member, Nigam Parshad, MLA or respected community references
                </p>
              </div>

              <div className="space-y-3">
                {formData.references.map((ref, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <Select
                      label={`Reference #${idx + 1} Category`}
                      value={ref.category}
                      onChange={(e) => updateReference(idx, 'category', e.target.value)}
                      options={REFERENCE_CATEGORIES}
                      required
                    />
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
                      placeholder="Phone"
                      value={ref.phone}
                      onChange={(e) => updateReference(idx, 'phone', e.target.value)}
                      required
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 7: 2 GUARANTORS */}
          {currentStep === 7 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">2 Co-Signer Guarantors</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  1 Male and 1 Female guarantor mandatory per policy
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {formData.guarantors.map((g, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
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
                      placeholder="10-digit number"
                      value={g.phone}
                      onChange={(e) => updateGuarantor(idx, 'phone', e.target.value)}
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

          {/* STEP 8: INSTALLMENTS & TIMELINE */}
          {currentStep === 8 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Installment Plan & Timeline</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Standard collection terms: ₹250/day over 24-month horizon
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Daily Rate (₹)"
                  type="number"
                  value={formData.installment_daily_rate}
                  onChange={(e) => updateField('installment_daily_rate', e.target.value)}
                  required
                />

                <Select
                  label="Collection Schedule"
                  value={formData.installment_frequency}
                  onChange={(e) => updateField('installment_frequency', e.target.value)}
                  options={INSTALLMENT_FREQUENCIES}
                />

                <Input
                  label="Contract Total Horizon (Months)"
                  type="number"
                  value={formData.total_months}
                  onChange={(e) => updateField('total_months', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Contract Effective Start Date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => updateField('start_date', e.target.value)}
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
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
                      placeholder="Phone"
                      value={formData.installment_other_phone}
                      onChange={(e) => updateField('installment_other_phone', e.target.value)}
                    />
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
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
            <p className="font-bold flex items-center gap-1.5 mb-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              The following documents are not yet uploaded:
            </p>
            <ul className="list-disc list-inside space-y-0.5 ml-1 text-slate-700">
              {missingDocsList.map((doc, idx) => (
                <li key={idx}>{doc}</li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-slate-600">
            Do you want to proceed and issue this rental with documents marked as{' '}
            <span className="font-bold text-amber-700">pending</span>? Staff can upload them later.
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
