'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarCheck, Plus, ArrowRight, XCircle, AlertCircle, Edit } from 'lucide-react';
import Header from '../../../components/layout/Header';
import Table from '../../../components/ui/Table';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Modal from '../../../components/ui/Modal';
import Badge from '../../../components/ui/Badge';
import SearchBar from '../../../components/ui/SearchBar';
import Pagination from '../../../components/ui/Pagination';
import api from '../../../lib/api';
import { formatCurrency, formatDate } from '../../../lib/constants';
import { staggerFadeIn } from '../../../lib/gsap';
import { toast } from '../../../lib/toast';
import { confirmDialog } from '../../../lib/confirmDialog';

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
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
  const [editData, setEditData] = useState({ id: '', name: '', phone: '', booking_amount: '', notes: '', modelId: '', customModel: '' });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [search, page]);

  // One-time entrance for the header/filter chrome when the page first mounts.
  useEffect(() => {
    staggerFadeIn('.gsap-filter-bar', { y: 14, duration: 0.45, stagger: 0 });
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      let bookingsQuery = `/api/bookings?page=${page}&limit=15`;
      if (search) bookingsQuery += `&search=${encodeURIComponent(search)}`;

      const [bookingsRes, modelsRes] = await Promise.all([
        api.get(bookingsQuery),
        api.get('/api/models'),
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

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !phone.trim()) {
      setError('Name and phone number are required');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/api/bookings', {
        name: name.trim(),
        phone: phone.trim(),
        ev_model_id: modelId !== 'other' ? (modelId || null) : null,
        model_name_raw: modelId === 'other' ? customModel.trim() : null,
        booking_amount: Number(bookingAmount || 0),
        notes: notes.trim() || null,
      });

      if (res.data?.success) {
        setIsAddModalOpen(false);
        setName('');
        setPhone('');
        setNotes('');
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

  const columns = [
    {
      header: 'Customer',
      key: 'name',
      render: (row) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-white">{row.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{row.phone}</p>
        </div>
      ),
    },
    {
      header: 'Reserved EV Model',
      key: 'model',
      render: (row) => (
        <span className="font-medium text-slate-800 dark:text-slate-200">
          {row.ev_models?.name || row.model_name_raw || 'Unspecified'}
        </span>
      ),
    },
    {
      header: 'Advance Token',
      key: 'booking_amount',
      render: (row) => (
        <span className="font-bold text-emerald-600">{formatCurrency(row.booking_amount)}</span>
      ),
    },
    {
      header: 'Booking Date',
      key: 'booking_date',
      render: (row) => <span className="text-xs text-slate-500">{formatDate(row.booking_date)}</span>,
    },
    {
      header: 'Updated Date',
      key: 'updated_at',
      render: (row) => <span className="text-xs text-slate-500">{formatDate(row.updated_at)}</span>,
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => <Badge status={row.status} size="sm" />,
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => {
        if (row.status === 'pending') {
          return (
            <div className="flex items-center gap-2">
              <Link
                href={`/rentals/new?booking_id=${row.id}&name=${encodeURIComponent(
                  row.name
                )}&phone=${encodeURIComponent(row.phone)}&model_id=${row.ev_model_id || ''}&amount=${
                  row.booking_amount || 0
                }`}
              >
                <Button variant="primary" size="sm">
                  Convert <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
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
                    customModel: row.model_name_raw || ''
                  });
                  setIsEditModalOpen(true);
                }}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-rose-600 hover:bg-rose-50"
                onClick={() => handleCancelBooking(row.id)}
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
          );
        }
        if (row.status === 'converted') {
          return (
            <Link
              href={`/rentals/${row.converted_to}`}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View Rental →
            </Link>
          );
        }
        return <span className="text-xs text-slate-400">No actions</span>;
      },
    },
  ];

  return (
    <div>
      <Header
        title="Walk-in Bookings"
        subtitle="Manage token amounts and convert bookings to active rentals"
        action={
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setIsAddModalOpen(true)}
          >
            <span className="hidden sm:inline">New Booking</span>
            <span className="sm:hidden">New</span>
          </Button>
        }
      />

      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Search Bar */}
        <div className="gsap-filter-bar flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 card-elevation shadow-xs dark:shadow-[0_8px_30px_rgb(0,0,0,0.35)] transition-colors">
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search customer name or phone..."
            className="w-full sm:max-w-md sm:flex-1 sm:min-w-0"
          />
        </div>

        <Table
          columns={columns}
          data={bookings}
          loading={loading}
          emptyText="No bookings found. Click 'New Booking' to record a reservation."
        />

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalRecords}
          onPageChange={setPage}
        />
      </div>

      {/* New Booking Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record Walk-in Booking"
        subtitle="Collect advance token and reserve an EV model for a customer"
      >
        <form onSubmit={handleCreateBooking} className="space-y-4">
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
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          <Select
            label="Select EV Model"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            options={[
              ...models.map((m) => ({
                value: m.id,
                label: `${m.name} (${formatCurrency(m.total_price)} — Stock: ${m.stock_count})`,
              })),
              { value: 'other', label: 'Other / Future Model' }
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

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
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

      {/* Edit Booking Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Walk-in Booking"
      >
        <form onSubmit={handleEditBooking} className="space-y-4">
          <Input
            label="Customer Full Name"
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            required
          />
          <Input
            label="Contact Phone Number"
            value={editData.phone}
            onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
            required
          />
          <Select
            label="Select EV Model"
            value={editData.modelId}
            onChange={(e) => setEditData({ ...editData, modelId: e.target.value })}
            options={[
              ...models.map((m) => ({
                value: m.id,
                label: `${m.name} (${formatCurrency(m.total_price)} — Stock: ${m.stock_count})`,
              })),
              { value: 'other', label: 'Other / Future Model' }
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

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
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
