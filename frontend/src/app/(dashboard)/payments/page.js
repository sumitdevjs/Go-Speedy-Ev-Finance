'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  IndianRupee,
  Receipt,
  Search,
  Filter,
  Download,
  Calendar,
  Building2,
  MapPin,
  Bike,
  User,
  Clock,
  CheckCircle2,
  Phone,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  Banknote,
  RotateCcw,
} from 'lucide-react';
import Header from '../../../components/layout/Header';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import Table from '../../../components/ui/Table';
import Pagination from '../../../components/ui/Pagination';
import CustomExportModal from '../../../components/ui/CustomExportModal';
import api from '../../../lib/api';
import { formatCurrency, formatDate } from '../../../lib/constants';
import { useAuthStore } from '../../../store/authStore';

const PAYMENT_EXPORT_COLUMNS = [
  'Receipt ID',
  'Payment Date',
  'Collection Time',
  'Amount (₹)',
  'Payment Mode',
  'Customer Name',
  'Customer Phone',
  'EV Model',
  'Vehicle Number',
  'Chassis Number',
  'Ward Number',
  'Ward Name',
  'Head Office',
  'Collected By (Staff)',
  'Late Fee Paid (₹)',
  'Notes',
];

export default function PaymentsPage() {
  const { role, user, selectedBranch } = useAuthStore();
  const isSuperAdmin = role === 'super_admin' || role === 'admin';
  const isHoAdmin = role === 'ho_admin';

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('all'); // 'all', 'cash', 'online'
  const [datePreset, setDatePreset] = useState('all'); // 'all', 'today', 'this_week', 'this_month'
  const [selectedHo, setSelectedHo] = useState('');
  const [selectedWard, setSelectedWard] = useState('');

  // Dropdown options
  const [headOffices, setHeadOffices] = useState([]);
  const [branches, setBranches] = useState([]);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Export Modal
  const [isExportOpen, setIsExportOpen] = useState(false);

  useEffect(() => {
    fetchPayments();
    fetchFilterOptions();
  }, [selectedBranch, selectedHo, selectedWard, modeFilter]);

  const fetchFilterOptions = async () => {
    try {
      if (isSuperAdmin) {
        const hoRes = await api.get('/api/head-offices');
        if (hoRes.data?.success) setHeadOffices(hoRes.data.data || []);
      }
      const bRes = await api.get('/api/branches?limit=100');
      if (bRes.data?.success) setBranches(bRes.data.data || []);
    } catch (e) {
      console.error('Error fetching filter options:', e);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (selectedWard) {
        params.append('branch_id', selectedWard);
      } else if (selectedBranch) {
        params.append('branch_id', selectedBranch.id || selectedBranch.code);
      }

      if (selectedHo && isSuperAdmin) {
        params.append('head_office_id', selectedHo);
      }

      if (modeFilter !== 'all') {
        params.append('mode', modeFilter);
      }

      const res = await api.get(`/api/payments?${params.toString()}`);
      if (res.data?.success) {
        setPayments(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to format exact collection time
  const formatTime = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (e) {
      return '—';
    }
  };

  // Date Presets filter
  const dateFilteredPayments = useMemo(() => {
    if (datePreset === 'all') return payments;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return payments.filter((p) => {
      const pDate = p.payment_date || (p.created_at ? p.created_at.split('T')[0] : '');
      if (datePreset === 'today') return pDate === todayStr;

      if (datePreset === 'this_week') {
        const d = new Date(pDate);
        const diffDays = (now - d) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 7;
      }

      if (datePreset === 'this_month') {
        return pDate.slice(0, 7) === todayStr.slice(0, 7);
      }

      return true;
    });
  }, [payments, datePreset]);

  // Client search filter
  const filteredPayments = useMemo(() => {
    if (!search.trim()) return dateFilteredPayments;
    const q = search.toLowerCase();

    return dateFilteredPayments.filter((p) => {
      const customerName = p.tenant?.name?.toLowerCase() || '';
      const phone = p.tenant?.phone || '';
      const vehicle = (p.tenant?.vehicle_number || p.tenant?.chassis_no || '').toLowerCase();
      const model = (p.ev_model_name || '').toLowerCase();
      const collector = (p.collector_name || p.users?.name || '').toLowerCase();
      const ward = (p.branch?.name || '').toLowerCase();
      const wardNo = String(p.branch?.ward_no || '');
      const notes = (p.notes || '').toLowerCase();
      const id = (p.id || '').toLowerCase();

      return (
        customerName.includes(q) ||
        phone.includes(q) ||
        vehicle.includes(q) ||
        model.includes(q) ||
        collector.includes(q) ||
        ward.includes(q) ||
        wardNo.includes(q) ||
        notes.includes(q) ||
        id.includes(q)
      );
    });
  }, [dateFilteredPayments, search]);

  // Pagination calculation
  const totalItems = filteredPayments.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedPayments = filteredPayments.slice((page - 1) * pageSize, page * pageSize);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalAmount = filteredPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const cashAmount = filteredPayments
      .filter((p) => p.mode === 'cash')
      .reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const onlineAmount = filteredPayments
      .filter((p) => p.mode === 'online')
      .reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const lateFees = filteredPayments.reduce((acc, p) => acc + Number(p.late_fee_paid || 0), 0);

    return {
      totalAmount,
      cashAmount,
      onlineAmount,
      lateFees,
      count: filteredPayments.length,
    };
  }, [filteredPayments]);

  // Transform row for CSV / Excel Universal Export
  const transformPaymentExportRow = (p) => {
    const timeFormatted = formatTime(p.created_at);
    return {
      'Receipt ID': `PAY-${p.id.slice(0, 8).toUpperCase()}`,
      'Payment Date': p.payment_date || formatDate(p.created_at),
      'Collection Time': timeFormatted,
      'Amount (₹)': Number(p.amount || 0),
      'Payment Mode': (p.mode || 'cash').toUpperCase(),
      'Customer Name': p.tenant?.name || 'Customer',
      'Customer Phone': p.tenant?.phone || '—',
      'EV Model': p.ev_model_name || p.tenant?.ev_models?.name || 'EV Scooter',
      'Vehicle Number': p.tenant?.vehicle_number || 'Pending Reg',
      'Chassis Number': p.tenant?.chassis_no || '—',
      'Ward Number': p.branch?.ward_no ? `Ward #${p.branch.ward_no}` : '—',
      'Ward Name': p.branch?.name || 'Central Delhi',
      'Head Office': p.head_office?.name || 'Delhi Head Office',
      'Collected By (Staff)': p.collector_name || p.users?.name || 'Staff Operator',
      'Late Fee Paid (₹)': Number(p.late_fee_paid || 0),
      'Notes': p.notes || 'Routine installment',
    };
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 w-full">
      <Header
        title="Payment Collections Ledger"
        subtitle={
          isSuperAdmin
            ? "Global transaction logs across all Head Offices, municipal wards, and staff collectors"
            : isHoAdmin
            ? `Zonal collection logs for ${user?.head_office?.name || 'Head Office'} governed wards`
            : "Live payment collection records and time-stamped transaction receipts"
        }
        action={
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={() => setIsExportOpen(true)}
            className="h-9 px-3.5 text-xs font-bold shrink-0 shadow-xs cursor-pointer"
            title="Download Payments as Excel / CSV"
          >
            <span>Export Collections</span>
          </Button>
        }
      />

      <div className="w-full px-3.5 sm:px-5 md:px-6 py-4 sm:py-6 space-y-5">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Collections</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(metrics.totalAmount)}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {metrics.count} total transactions
            </p>
          </Card>

          <Card className="p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Cash Collections</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Banknote className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(metrics.cashAmount)}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Field cash received by operators
            </p>
          </Card>

          <Card className="p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Online / UPI</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {formatCurrency(metrics.onlineAmount)}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Direct digital bank settlements
            </p>
          </Card>

          <Card className="p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Late Fee Fines Paid</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {formatCurrency(metrics.lateFees)}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Overdue penalties recovered
            </p>
          </Card>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl shadow-xs space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search */}
            <div className="md:col-span-4 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search customer, phone, EV, collector, ward..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Mode Filter Pills */}
            <div className="md:col-span-3 flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => {
                  setModeFilter('all');
                  setPage(1);
                }}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  modeFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                All Modes
              </button>
              <button
                type="button"
                onClick={() => {
                  setModeFilter('cash');
                  setPage(1);
                }}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  modeFilter === 'cash'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Cash
              </button>
              <button
                type="button"
                onClick={() => {
                  setModeFilter('online');
                  setPage(1);
                }}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  modeFilter === 'online'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Online
              </button>
            </div>

            {/* Date Preset */}
            <div className="md:col-span-2">
              <select
                value={datePreset}
                onChange={(e) => {
                  setDatePreset(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All Dates</option>
                <option value="today">Today Only</option>
                <option value="this_week">Past 7 Days</option>
                <option value="this_month">This Month</option>
              </select>
            </div>

            {/* Head Office Selector (Super Admin Only) */}
            {isSuperAdmin && (
              <div className="md:col-span-3">
                <select
                  value={selectedHo}
                  onChange={(e) => {
                    setSelectedHo(e.target.value);
                    setSelectedWard('');
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">All Head Offices (Delhi NCR)</option>
                  {headOffices.map((ho) => (
                    <option key={ho.id} value={ho.id}>
                      {ho.name} ({ho.code || ho.city})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Transactions Table Card */}
        <Card className="overflow-hidden border border-slate-200/80 dark:border-slate-800 p-0">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-500" />
                <span>Time-Stamped Transaction Records</span>
                <span className="text-xs font-bold text-slate-400">({totalItems})</span>
              </h3>
              <p className="text-xs text-slate-500">
                Sorted by most recent collection timestamp
              </p>
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200/80 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3.5 whitespace-nowrap">Receipt & Time</th>
                  <th className="py-3 px-3 whitespace-nowrap">Customer / Phone</th>
                  <th className="py-3 px-3 whitespace-nowrap">EV Model & Plate</th>
                  <th className="py-3 px-3 whitespace-nowrap">Ward / Location</th>
                  <th className="py-3 px-3 whitespace-nowrap">Collected By</th>
                  <th className="py-3 px-3 whitespace-nowrap">Mode</th>
                  <th className="py-3 px-3.5 text-right whitespace-nowrap">Amount Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-14 text-slate-400">
                      <Spinner size="md" className="mx-auto text-blue-600 dark:text-blue-400" />
                      <p className="text-xs mt-2">Loading transactions...</p>
                    </td>
                  </tr>
                ) : paginatedPayments.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-slate-400">
                      <Receipt className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-1.5 opacity-50" />
                      <p className="font-semibold text-slate-600 dark:text-slate-300">No payment transactions found</p>
                      <p className="text-xs text-slate-400">Try adjusting your filters or date range</p>
                    </td>
                  </tr>
                ) : (
                  paginatedPayments.map((p) => {
                    const timeString = formatTime(p.created_at);
                    const isCash = p.mode === 'cash';

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Receipt & Timestamp */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                              #PAY-{p.id.slice(0, 8).toUpperCase()}
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{p.payment_date || formatDate(p.created_at)}</span>
                              <span className="text-slate-300 dark:text-slate-600">•</span>
                              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-0.5">
                                <Clock className="w-3 h-3 text-emerald-500" />
                                {timeString}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white leading-tight">
                              {p.tenant?.name || 'Customer'}
                            </p>
                            {p.tenant?.phone && (
                              <p className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                                <Phone className="w-2.5 h-2.5" />
                                <span>{p.tenant.phone}</span>
                              </p>
                            )}
                          </div>
                        </td>

                        {/* EV Model & Plate */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200 leading-tight flex items-center gap-1">
                              <Bike className="w-3 h-3 text-blue-500 shrink-0" />
                              <span>{p.ev_model_name || 'Electric Scooter'}</span>
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {p.tenant?.vehicle_number || (p.tenant?.chassis_no ? `Chassis: ${p.tenant.chassis_no.slice(-6)}` : 'Assigned EV')}
                            </p>
                          </div>
                        </td>

                        {/* Ward & HO */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200 leading-tight flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                              <span>{p.branch?.name || (p.branch?.ward_no ? `Ward #${p.branch.ward_no}` : 'Delhi Hub')}</span>
                            </p>
                            <p className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">
                              {p.head_office?.name || 'Delhi Head Office'}
                            </p>
                          </div>
                        </td>

                        {/* Collector Staff */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold">
                              {(p.collector_name || 'S')[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                                {p.collector_name || 'Staff Operator'}
                              </p>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {p.users?.role ? (p.users.role === 'branch_admin' ? 'Branch Admin' : 'Staff') : 'Collector'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Mode */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <Badge
                            status={isCash ? 'Cash' : 'Online / UPI'}
                            variant={isCash ? 'emerald' : 'blue'}
                            size="sm"
                          />
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <div className="space-y-0.5">
                            <span className="text-sm font-black text-slate-900 dark:text-white">
                              {formatCurrency(p.amount)}
                            </span>
                            {p.late_fee_paid > 0 && (
                              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                                +{formatCurrency(p.late_fee_paid)} late fee
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={setPage}
          />
        </Card>
      </div>

      {/* Universal Easy Export Modal */}
      <CustomExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Export Payment Collections Ledger"
        subtitle="Download transaction timestamps, staff collectors, ward origin, and EV details (Excel / CSV)"
        defaultFilename="GoSpeedy_Payment_Collections"
        columns={PAYMENT_EXPORT_COLUMNS}
        dateAccessor="payment_date"
        onFetchData={async () => filteredPayments}
        transformRow={transformPaymentExportRow}
      />
    </div>
  );
}
