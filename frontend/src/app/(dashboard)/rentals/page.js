'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, Plus, Phone, AlertTriangle, ArrowRight, CheckCircle2, Download } from 'lucide-react';
import Header from '../../../components/layout/Header';
import Table from '../../../components/ui/Table';
import Button from '../../../components/ui/Button';
import SearchBar from '../../../components/ui/SearchBar';
import Select from '../../../components/ui/Select';
import Badge from '../../../components/ui/Badge';
import Pagination from '../../../components/ui/Pagination';
import api from '../../../lib/api';
import { formatCurrency, formatDate } from '../../../lib/constants';
import { staggerFadeIn } from '../../../lib/gsap';
import { useAuthStore } from '../../../store/authStore';
import { exportToExcel } from '../../../lib/exportToExcel';

export default function RentalsListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCancelled, setShowCancelled] = useState(false);
  const [overdueFilter, setOverdueFilter] = useState(searchParams.get('overdue_days') || '');
  const [insuranceFilter, setInsuranceFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const { selectedBranch } = useAuthStore();

  useEffect(() => {
    fetchRentals();
  }, [search, statusFilter, overdueFilter, insuranceFilter, page, showCancelled, selectedBranch]);

  // Reset page when branch changes
  useEffect(() => {
    setPage(1);
  }, [selectedBranch]);

  // Listen to branchChange event for instant reactive refetch
  useEffect(() => {
    const handleBranchChange = () => {
      fetchRentals();
    };
    window.addEventListener('branchChange', handleBranchChange);
    return () => window.removeEventListener('branchChange', handleBranchChange);
  }, [search, statusFilter, overdueFilter, insuranceFilter, page, showCancelled, selectedBranch]);

  // One-time entrance for the header/filter chrome when the page first mounts.
  useEffect(() => {
    staggerFadeIn('.gsap-filter-bar', { y: 14, duration: 0.45, stagger: 0 });
  }, []);

  const fetchRentals = async () => {
    try {
      setLoading(true);
      let query = `/api/rentals?page=${page}&limit=15`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (showCancelled) {
        query += `&status=cancelled`;
      }
      if (statusFilter === 'pending_docs') {
        query += `&has_pending_docs=true`;
      } else if (statusFilter === 'completed_docs') {
        query += `&has_pending_docs=false`;
      }
      if (overdueFilter) query += `&overdue_days=${overdueFilter}`;
      if (insuranceFilter) query += `&insurance_status=${insuranceFilter}`;

      const branchParam = selectedBranch ? (selectedBranch.id || selectedBranch.code || selectedBranch.name) : 'all';
      query += `&branch_id=${encodeURIComponent(branchParam)}&_t=${Date.now()}`;

      const res = await api.get(query);
      if (res.data?.success) {
        setTenants(res.data.data || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalRecords(res.data.pagination?.totalItems || 0);
      }
    } catch (err) {
      console.error('Failed to load rentals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadData = async () => {
    try {
      let query = `/api/rentals?page=1&limit=9999`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (showCancelled) {
        query += `&status=cancelled`;
      }
      if (statusFilter === 'pending_docs') {
        query += `&has_pending_docs=true`;
      } else if (statusFilter === 'completed_docs') {
        query += `&has_pending_docs=false`;
      }
      if (overdueFilter) query += `&overdue_days=${overdueFilter}`;
      if (insuranceFilter) query += `&insurance_status=${insuranceFilter}`;

      const branchParam = selectedBranch ? (selectedBranch.id || selectedBranch.code || selectedBranch.name) : 'all';
      query += `&branch_id=${encodeURIComponent(branchParam)}&_t=${Date.now()}`;

      const res = await api.get(query);
      if (res.data?.success) {
        const dataToExport = res.data.data.map(row => ({
          Name: row.name,
          Phone: row.phone,
          'EV Model': row.ev_models?.name || 'EV Scooter',
          'Total Price': row.total_price,
          Downpayment: row.downpayment_paid,
          'Downpayment Mode': row.downpayment_mode || 'Cash',
          'Outstanding Balance': row.computed_balance?.outstanding || 0,
          'Days Overdue': row.computed_balance?.daysOverdue || 0,
          'Contract Status': row.status,
          'Pending Docs': row.has_pending_docs ? 'Yes' : 'No',
          Created: formatDate(row.created_at)
        }));
        exportToExcel(dataToExport, 'Rentals_Data.xlsx');
      }
    } catch (err) {
      console.error('Failed to download data:', err);
      alert('Failed to download data.');
    }
  };

  const columns = [
    {
      header: 'Tenant Name',
      key: 'name',
      render: (row) => (
        <div>
          <Link
            href={`/rentals/${row.id}`}
            className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 block"
          >
            {row.name}
          </Link>
          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
            <Phone className="h-3 w-3" /> {row.phone}
          </span>
        </div>
      ),
    },
    {
      header: 'EV Model',
      key: 'model',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-200">{row.ev_models?.name || 'EV Scooter'}</p>
          <p className="text-[11px] text-slate-400">Total: {formatCurrency(row.total_price)}</p>
        </div>
      ),
    },
    {
      header: 'Downpayment',
      key: 'downpayment_paid',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(row.downpayment_paid)}</span>
          <p className="text-[11px] text-slate-400 capitalize">{row.downpayment_mode || 'Cash'}</p>
        </div>
      ),
    },
    {
      header: 'Outstanding Balance',
      key: 'outstanding',
      render: (row) => {
        const bal = row.computed_balance;
        if (!bal) return <span className="text-xs text-slate-400">—</span>;

        if (bal.outstanding === 0) {
          return (
            <span className="inline-flex items-center text-xs font-bold text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Fully Paid
            </span>
          );
        }

        return (
          <div>
            <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(bal.outstanding)}</span>
            {bal.daysOverdue > 0 ? (
              <p className="text-[11px] font-bold text-rose-600 flex items-center">
                <AlertTriangle className="w-3 h-3 mr-0.5 shrink-0" />
                {bal.daysOverdue} days overdue
              </p>
            ) : bal.daysAdvance > 0 ? (
              <p className="text-[11px] font-semibold text-emerald-600">
                {bal.daysAdvance} days advance
              </p>
            ) : (
              <p className="text-[11px] text-slate-400">On track</p>
            )}
          </div>
        );
      },
    },
    {
      header: 'Contract Status',
      key: 'status',
      cellClassName: 'whitespace-nowrap',
      render: (row) => <Badge status={row.status} size="sm" />,
    },
    {
      header: 'Pending Docs',
      key: 'has_pending_docs',
      cellClassName: 'whitespace-nowrap',
      render: (row) =>
        row.has_pending_docs ? (
          <Badge status="Docs Pending" variant="amber" size="sm" />
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold tracking-wider uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.6)] shrink-0" />
            Verified
          </span>
        ),
    },
    {
      header: 'Created / Updated',
      key: 'dates',
      render: (row) => (
        <div>
          <p className="text-xs text-slate-800 dark:text-slate-200">C: {formatDate(row.created_at)}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">U: {formatDate(row.updated_at)}</p>
        </div>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <Link href={`/rentals/${row.id}`}>
          <Button variant="outline" size="sm">
            {row.status === 'cancelled' ? 'View' : 'View / Pay'} <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div>
      <Header
        title="EV Rentals & Tenants"
        subtitle="Live registry of active contracts, daily collections, and overdue accounts"
        action={
          <Link href="/rentals/new">
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              className="h-9 px-3 sm:px-3.5 text-xs font-bold shrink-0 shadow-xs"
              title="Issue New Rental"
            >
              <span className="hidden sm:inline">Issue New Rental</span>
              <span className="sm:hidden">New Rental</span>
            </Button>
          </Link>
        }
      />

      <div className="w-full px-3.5 sm:px-5 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Filters and Search Bar */}
        <div className="gsap-filter-bar flex flex-col xl:flex-row flex-wrap items-stretch xl:items-center justify-between gap-3 sm:gap-4 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 card-elevation shadow-xs dark:shadow-[0_8px_30px_rgb(0,0,0,0.35)] transition-colors">
          <div className="flex w-full xl:max-w-md xl:flex-1 min-w-0 gap-2 items-center">
            <SearchBar
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="Search tenant name or phone..."
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

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full xl:w-auto shrink-0">
            <Button
              variant={showCancelled ? 'primary' : 'outline'}
              size="sm"
              className="flex-1 sm:flex-initial justify-center"
              onClick={() => {
                setShowCancelled(!showCancelled);
                setPage(1);
              }}
            >
              {showCancelled ? 'Show Active Rentals' : 'Show Cancelled'}
            </Button>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="flex-1 sm:flex-initial rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 py-2 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 transition-colors"
            >
              <option value="" className="dark:bg-slate-900">All Document Statuses</option>
              <option value="pending_docs" className="dark:bg-slate-900">Pending Documents</option>
              <option value="completed_docs" className="dark:bg-slate-900">Completed Documents</option>
            </select>

            <select
              value={insuranceFilter}
              onChange={(e) => {
                setInsuranceFilter(e.target.value);
                setPage(1);
              }}
              className="flex-1 sm:flex-initial rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 py-2 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 transition-colors"
            >
              <option value="" className="dark:bg-slate-900">All Insurance</option>
              <option value="scooty_expired" className="dark:bg-slate-900">Scooty Ins. Expired</option>
              <option value="scooty_not_expired" className="dark:bg-slate-900">Scooty Ins. Not Expired</option>
              <option value="rider_expired" className="dark:bg-slate-900">Rider Ins. Expired</option>
              <option value="rider_not_expired" className="dark:bg-slate-900">Rider Ins. Not Expired</option>
            </select>

            <select
              value={overdueFilter}
              onChange={(e) => {
                setOverdueFilter(e.target.value);
                setPage(1);
              }}
              className="flex-1 sm:flex-initial rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 py-2 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 transition-colors"
            >
              <option value="" className="dark:bg-slate-900">Overdue Filter: All</option>
              <option value="1" className="dark:bg-slate-900">1+ Days Overdue</option>
              <option value="2" className="dark:bg-slate-900">2+ Days Overdue</option>
              <option value="7" className="dark:bg-slate-900">7+ Days Overdue (1+ Wk)</option>
            </select>
          </div>
        </div>

        {/* Tenant Table */}
        <Table
          columns={columns}
          data={tenants}
          loading={loading}
          emptyText="No rental records match your filter criteria."
        />

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalRecords}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
