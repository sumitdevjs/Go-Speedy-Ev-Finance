'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CalendarCheck,
  Plus,
  ArrowRight,
  XCircle,
  AlertCircle,
  Edit,
  Phone,
  ChevronDown,
  Home,
  ShoppingBag,
  Bike,
  IndianRupee,
  Calendar,
  Sparkles,
  CheckCircle2,
  Download
} from 'lucide-react';
import Header from '../../../components/layout/Header';
import Table from '../../../components/ui/Table';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Modal from '../../../components/ui/Modal';
import Badge from '../../../components/ui/Badge';
import SearchBar from '../../../components/ui/SearchBar';
import Pagination from '../../../components/ui/Pagination';
import Spinner from '../../../components/ui/Spinner';
import api from '../../../lib/api';
import { formatCurrency, formatDate } from '../../../lib/constants';
import { staggerFadeIn } from '../../../lib/gsap';
import { toast } from '../../../lib/toast';
import { confirmDialog } from '../../../lib/confirmDialog';
import { useAuthStore } from '../../../store/authStore';
import { exportToExcel } from '../../../lib/exportToExcel';

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'converted' | 'cancelled'
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [modelId, setModelId] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [bookingAmount, setBookingAmount] = useState('2000');
  const [notes, setNotes] = useState('');

  // Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState({
    id: '',
    name: '',
    phone: '',
    booking_amount: '',
    notes: '',
    modelId: '',
    customModel: '',
  });
  const [isEditing, setIsEditing] = useState(false);

  // Convert Modal (Dedicated Mobile-friendly & Overflow-proof)
  const [convertBookingData, setConvertBookingData] = useState(null);
  const { selectedBranch } = useAuthStore();

  useEffect(() => {
    fetchData();
  }, [search, page, statusFilter, selectedBranch]);

  // Reset page when branch changes
  useEffect(() => {
    setPage(1);
  }, [selectedBranch]);

  // Listen to branchChange event for instant reactive refetch
  useEffect(() => {
    const handleBranchChange = () => {
      fetchData();
    };
    window.addEventListener('branchChange', handleBranchChange);
    return () => window.removeEventListener('branchChange', handleBranchChange);
  }, [search, page, statusFilter, selectedBranch]);

  // Entrance animation for filter bar
  useEffect(() => {
    staggerFadeIn('.gsap-filter-bar', { y: 14, duration: 0.45, stagger: 0 });
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      let bookingsQuery = `/api/bookings?page=${page}&limit=15`;
      if (search) bookingsQuery += `&search=${encodeURIComponent(search)}`;
      if (statusFilter && statusFilter !== 'all') {
        bookingsQuery += `&status=${statusFilter}`;
      } else if (statusFilter === 'all') {
        bookingsQuery += `&status=all`;
      }

      const branchParam = selectedBranch ? (selectedBranch.id || selectedBranch.code || selectedBranch.name) : 'all';
      bookingsQuery += `&branch_id=${encodeURIComponent(branchParam)}&_t=${Date.now()}`;

      const [bookingsRes, modelsRes] = await Promise.all([
        api.get(bookingsQuery),
        api.get(`/api/models/dropdown?branch_id=${encodeURIComponent(branchParam)}&_t=${Date.now()}`),
      ]);

      if (bookingsRes.data?.success) {
        setBookings(bookingsRes.data.data || []);
        setTotalPages(bookingsRes.data.pagination?.totalPages || 1);
        setTotalRecords(bookingsRes.data.pagination?.totalItems || 0);
      }
      if (modelsRes.data?.success) {
        setModels(modelsRes.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadData = async () => {
    try {
      let bookingsQuery = `/api/bookings?page=1&limit=9999`;
      if (search) bookingsQuery += `&search=${encodeURIComponent(search)}`;
      if (statusFilter && statusFilter !== 'all') {
        bookingsQuery += `&status=${statusFilter}`;
      } else if (statusFilter === 'all') {
        bookingsQuery += `&status=all`;
      }

      const branchParam = selectedBranch ? (selectedBranch.id || selectedBranch.code || selectedBranch.name) : 'all';
      bookingsQuery += `&branch_id=${encodeURIComponent(branchParam)}&_t=${Date.now()}`;

      const res = await api.get(bookingsQuery);
      if (res.data?.success) {
        const dataToExport = res.data.data.map(b => ({
          'Customer Name': b.name,
          Phone: b.phone,
          'EV Model': b.models?.name || b.custom_model_name || 'N/A',
          'Booking Amount': b.booking_amount,
          Status: b.status,
          Notes: b.notes,
          'Created At': formatDate(b.created_at)
        }));
        exportToExcel(dataToExport, 'Bookings_Data.xlsx');
      }
    } catch (err) {
      console.error('Failed to download data:', err);
      alert('Failed to download data.');
    }
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !phone.trim()) {
      setError('Name and phone number are required');
      return;
    }

    if (!/^\d{10}$/.test(phone.trim())) {
      setError('Phone number must be exactly 10 digits');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/api/bookings', {
        name: name.trim(),
        phone: phone.trim(),
        ev_model_id: modelId !== 'other' ? (modelId || null) : null,
        model_name_raw: modelId === 'other' ? customModel.trim() : null,
        booking_amount: Number(bookingAmount),
        notes: notes.trim(),
      });

      if (res.data?.success) {
        setIsAddModalOpen(false);
        setName('');
        setPhone('');
        setModelId('');
        setCustomModel('');
        setBookingAmount('2000');
        setNotes('');
        toast.success('Walk-in booking recorded successfully!');
        fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = async (id) => {
    const ok = await confirmDialog({
      title: 'Cancel this booking?',
      message: 'The reserved token amount will no longer hold this model for the customer.',
      tone: 'danger',
      confirmLabel: 'Cancel Booking',
      cancelLabel: 'Keep Booking',
    });
    if (!ok) return;
    try {
      await api.patch(`/api/bookings/${id}/cancel`);
      toast.success('Booking cancelled.');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel booking');
    }
  };

  const handleEditBooking = async (e) => {
    e.preventDefault();
    if (!editData.name?.trim() || !editData.phone?.trim()) {
      toast.error('Name and phone number are required');
      return;
    }
    if (!/^\d{10}$/.test(editData.phone.trim())) {
      toast.error('Phone number must be exactly 10 digits');
      return;
    }
    try {
      setIsEditing(true);
      const res = await api.patch(`/api/bookings/${editData.id}`, {
        name: editData.name,
        phone: editData.phone,
        ev_model_id: editData.modelId !== 'other' ? (editData.modelId || null) : null,
        model_name_raw: editData.modelId === 'other' ? editData.customModel.trim() : null,
        booking_amount: Number(editData.booking_amount),
        notes: editData.notes,
      });
      if (res.data?.success) {
        setIsEditModalOpen(false);
        toast.success('Booking updated.');
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to edit booking');
    } finally {
      setIsEditing(false);
    }
  };

  // Table columns for Desktop view
  const columns = [
    {
      header: 'Customer',
      key: 'name',
      render: (row) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-white">{row.name}</p>
          <a
            href={`tel:${row.phone}`}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 mt-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="h-3 w-3" /> {row.phone}
          </a>
        </div>
      ),
    },
    {
      header: 'Reserved EV Model',
      key: 'model',
      render: (row) => (
        <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Bike className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>{row.ev_models?.name || row.model_name_raw || 'Unspecified'}</span>
        </span>
      ),
    },
    {
      header: 'Advance Token',
      key: 'booking_amount',
      render: (row) => (
        <span className="font-bold text-emerald-600 dark:text-emerald-400">
          {formatCurrency(row.booking_amount)}
        </span>
      ),
    },
    {
      header: 'Booking Date',
      key: 'booking_date',
      cellClassName: 'whitespace-nowrap',
      render: (row) => <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(row.booking_date)}</span>,
    },
    {
      header: 'Status',
      key: 'status',
      cellClassName: 'whitespace-nowrap',
      render: (row) => <Badge status={row.status} size="sm" />,
    },
    {
      header: 'Actions',
      key: 'actions',
      cellClassName: 'whitespace-nowrap',
      render: (row) => {
        if (row.status === 'pending') {
          return (
            <div className="flex items-center gap-1.5">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setConvertBookingData(row)}
                className="font-bold text-xs flex items-center gap-1 shadow-2xs py-1.5 px-3"
              >
                <span>Convert</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="p-1.5 text-slate-600 dark:text-slate-300"
                onClick={() => {
                  setEditData({
                    id: row.id,
                    name: row.name,
                    phone: row.phone,
                    booking_amount: row.booking_amount,
                    notes: row.notes || '',
                    modelId: row.ev_model_id || (row.model_name_raw ? 'other' : ''),
                    customModel: row.model_name_raw || '',
                  });
                  setIsEditModalOpen(true);
                }}
                title="Edit booking"
              >
                <Edit className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                onClick={() => handleCancelBooking(row.id)}
                title="Cancel booking"
              >
                <XCircle className="w-3.5 h-3.5" />
              </Button>
            </div>
          );
        }
        if (row.status === 'converted') {
          return (
            <Link
              href={`/rentals/${row.converted_to}`}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              View Rental <ArrowRight className="w-3 h-3" />
            </Link>
          );
        }
        return <span className="text-xs text-slate-400 italic">Cancelled</span>;
      },
    },
  ];

  return (
    <div>
      <Header
        title="Walk-in Bookings"
        subtitle="Manage token amounts and convert bookings to active rentals or direct sales"
        action={
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setIsAddModalOpen(true)}
            className="h-9 px-3 sm:px-4 text-xs font-bold shrink-0 shadow-xs"
            title="New Booking"
          >
            <span className="hidden sm:inline">+ New Booking</span>
            <span className="sm:hidden">+ Booking</span>
          </Button>
        }
      />

      <div className="w-full px-3.5 sm:px-5 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Filter bar: Search + Status Filter Pills */}
        <div className="gsap-filter-bar flex flex-col md:flex-row flex-wrap items-stretch md:items-center justify-between gap-3 bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 card-elevation shadow-xs transition-colors">
          <div className="flex w-full md:max-w-sm md:flex-1 min-w-0 gap-2 items-center">
            <SearchBar
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="Search customer name or phone..."
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              className="shrink-0 h-[42px] px-3 font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              onClick={handleDownloadData}
              title="Download Data as Excel"
            >
              <span className="hidden sm:inline">Download Data</span>
            </Button>
          </div>

          {/* Status filter tabs for 1-tap mobile filtering */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 md:pb-0 scrollbar-thin shrink-0">
            {[
              { id: 'all', label: 'All' },
              { id: 'pending', label: 'Pending' },
              { id: 'converted', label: 'Converted' },
              { id: 'cancelled', label: 'Cancelled' },
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setStatusFilter(tab.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── DESKTOP VIEW: Full Table (Hidden on Mobile) ─── */}
        <div className="hidden md:block">
          <Table
            columns={columns}
            data={bookings}
            loading={loading}
            emptyText="No bookings found. Click '+ New Booking' to record a reservation."
          />
        </div>

        {/* ─── MOBILE VIEW: Touch-Friendly Responsive Cards (Visible on Phones & Small Tablets) ─── */}
        <div className="block md:hidden space-y-3.5">
          {loading ? (
            <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Spinner size="lg" className="text-blue-600 dark:text-blue-400 mx-auto" />
              <p className="mt-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Loading bookings...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
              <CalendarCheck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No bookings found</p>
              <p className="text-xs text-slate-500 mt-1">Click '+ New Booking' above to record a customer reservation.</p>
            </div>
          ) : (
            bookings.map((row) => {
              const firstLetter = (row.name || 'C').charAt(0).toUpperCase();
              const isPending = row.status === 'pending';
              const isConverted = row.status === 'converted';

              return (
                <div
                  key={row.id}
                  className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl shadow-xs space-y-3 transition-all"
                >
                  {/* Card Header: Customer Info & Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-black text-sm flex items-center justify-center shrink-0 border border-blue-500/20">
                        {firstLetter}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{row.name}</p>
                        <a
                          href={`tel:${row.phone}`}
                          className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-1 mt-0.5"
                        >
                          <Phone className="w-3 h-3" /> {row.phone}
                        </a>
                      </div>
                    </div>
                    <Badge status={row.status} size="sm" />
                  </div>

                  {/* Card Body: Model + Token + Date */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                      <Bike className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {row.ev_models?.name || row.model_name_raw || 'Model N/A'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-xs font-black text-emerald-700 dark:text-emerald-400">
                      <IndianRupee className="w-3.5 h-3.5 shrink-0" />
                      <span>{formatCurrency(row.booking_amount)} Token</span>
                    </div>
                  </div>

                  {/* Notes & Date Row */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Booked: {formatDate(row.booking_date)}
                    </span>
                    {row.notes && (
                      <span className="truncate max-w-[150px] italic">"{row.notes}"</span>
                    )}
                  </div>

                  {/* Card Action Footer */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                    {isPending ? (
                      <div className="flex items-center gap-2">
                        {/* Primary Convert Button */}
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setConvertBookingData(row)}
                          className="flex-1 font-bold text-xs py-2 shadow-xs flex items-center justify-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Convert Booking</span>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </Button>

                        {/* Edit Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditData({
                              id: row.id,
                              name: row.name,
                              phone: row.phone,
                              booking_amount: row.booking_amount,
                              notes: row.notes || '',
                              modelId: row.ev_model_id || (row.model_name_raw ? 'other' : ''),
                              customModel: row.model_name_raw || '',
                            });
                            setIsEditModalOpen(true);
                          }}
                          className="p-2 text-slate-600 dark:text-slate-300"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>

                        {/* Cancel Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelBooking(row.id)}
                          className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Cancel"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : isConverted ? (
                      <Link
                        href={`/rentals/${row.converted_to}`}
                        className="w-full py-2 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-500/20 text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1.5 hover:bg-blue-100/60 transition-colors"
                      >
                        <span>View Rental Agreement</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <div className="text-center py-1">
                        <span className="text-xs text-slate-400 italic">Booking Cancelled</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalRecords}
          onPageChange={setPage}
        />
      </div>

      {/* ─── DEDICATED OVERFLOW-PROOF CONVERT BOOKING MODAL ─── */}
      {/* Works seamlessly on all phones (never cut off, no table clipping) */}
      <Modal
        isOpen={!!convertBookingData}
        onClose={() => setConvertBookingData(null)}
        title="Convert Walk-in Booking"
        subtitle={`Select fulfillment path for ${convertBookingData?.name || 'Customer'}`}
      >
        {convertBookingData && (
          <div className="space-y-4">
            {/* Customer Summary Box */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Customer
                </p>
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  {convertBookingData.name}
                </p>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {convertBookingData.phone}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Advance Paid
                </p>
                <p className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(convertBookingData.booking_amount || 0)}
                </p>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3 h-3" /> Auto-credited
                </span>
              </div>
            </div>

            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Choose how you want to convert this booking:
            </p>

            {/* Option 1: Convert to EV Rental Agreement */}
            <Link
              href={`/rentals/new?booking_id=${convertBookingData.id}&name=${encodeURIComponent(convertBookingData.name)}&phone=${encodeURIComponent(convertBookingData.phone)}&model_id=${convertBookingData.ev_model_id || ''}&amount=${convertBookingData.booking_amount || 0}`}
              onClick={() => setConvertBookingData(null)}
              className="group block p-4 rounded-2xl border-2 border-blue-500/30 hover:border-blue-600 bg-blue-50/30 hover:bg-blue-50/70 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 transition-all cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                  <Home className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                      Convert to EV Rental
                    </p>
                    <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    24-Month contract with daily / monthly installment schedule
                  </p>
                </div>
              </div>
            </Link>

            {/* Option 2: Direct Vehicle Purchase */}
            <Link
              href={`/purchases/new?booking_id=${convertBookingData.id}&name=${encodeURIComponent(convertBookingData.name)}&phone=${encodeURIComponent(convertBookingData.phone)}&model_id=${convertBookingData.ev_model_id || ''}&amount=${convertBookingData.booking_amount || 0}`}
              onClick={() => setConvertBookingData(null)}
              className="group block p-4 rounded-2xl border-2 border-emerald-500/30 hover:border-emerald-600 bg-emerald-50/30 hover:bg-emerald-50/70 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 transition-all cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                      Direct Purchase (Full Sale)
                    </p>
                    <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Full upfront payment, 0 installments, generate sale invoice
                  </p>
                </div>
              </div>
            </Link>

            <div className="pt-2 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConvertBookingData(null)}
                className="text-slate-500 hover:text-slate-700"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── NEW BOOKING MODAL ─── */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record Walk-in Booking"
        subtitle="Collect advance token and reserve an EV model for a customer"
      >
        <form onSubmit={handleCreateBooking} className="space-y-4" autoComplete="off">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Customer Full Name"
            placeholder="e.g. Ramesh Kumar"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Contact Phone Number"
            placeholder="10-digit mobile number"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            maxLength={10}
            inputMode="numeric"
            required
          />

          <Select
            label="Select EV Model"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            options={[
              ...models.filter((m) => m.is_active).map((m) => ({
                value: m.id,
                label: `${m.name} (${formatCurrency(m.total_price)} — Stock: ${m.stock_count})`,
              })),
              { value: 'other', label: 'Other / Future Model' },
            ]}
            placeholder="Select EV model..."
          />

          {modelId === 'other' && (
            <Input
              label="Custom / Future Model Name"
              placeholder="e.g. Speedy Eco X2 (Future)"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              required
            />
          )}

          <Input
            label="Booking Token Amount (₹)"
            type="number"
            placeholder="2000"
            value={bookingAmount}
            onChange={(e) => setBookingAmount(e.target.value)}
            required
          />

          <Input
            label="Internal Notes"
            placeholder="e.g. Delivery requested on Monday morning"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSubmitting}
            >
              Save Booking
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── EDIT BOOKING MODAL ─── */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Walk-in Booking"
      >
        <form onSubmit={handleEditBooking} className="space-y-4" autoComplete="off">
          <Input
            label="Customer Full Name"
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            required
          />
          <Input
            label="Contact Phone Number"
            placeholder="10-digit mobile number"
            value={editData.phone}
            onChange={(e) =>
              setEditData({ ...editData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })
            }
            maxLength={10}
            inputMode="numeric"
            required
          />
          <Select
            label="Select EV Model"
            value={editData.modelId}
            onChange={(e) => setEditData({ ...editData, modelId: e.target.value })}
            options={[
              ...models.filter((m) => m.is_active || editData.modelId === m.id).map((m) => ({
                value: m.id,
                label: `${m.name} (${formatCurrency(m.total_price)} — Stock: ${m.stock_count})`,
              })),
              { value: 'other', label: 'Other / Future Model' },
            ]}
            placeholder="Select EV model..."
          />

          {editData.modelId === 'other' && (
            <Input
              label="Custom / Future Model Name"
              placeholder="e.g. Speedy Eco X2 (Future)"
              value={editData.customModel}
              onChange={(e) => setEditData({ ...editData, customModel: e.target.value })}
              required
            />
          )}
          <Input
            label="Booking Token Amount (₹)"
            type="number"
            value={editData.booking_amount}
            onChange={(e) => setEditData({ ...editData, booking_amount: e.target.value })}
            required
          />
          <Input
            label="Internal Notes"
            value={editData.notes}
            onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isEditing}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
