'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag, Phone, ArrowRight, CheckCircle2, Download } from 'lucide-react';
import Header from '../../../components/layout/Header';
import Table from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import SearchBar from '../../../components/ui/SearchBar';
import Pagination from '../../../components/ui/Pagination';
import api from '../../../lib/api';
import { formatCurrency, formatDate } from '../../../lib/constants';
import { staggerFadeIn } from '../../../lib/gsap';
import { useAuthStore } from '../../../store/authStore';
import { exportToExcel, fetchAllForExport } from '../../../lib/exportToExcel';
import { toast } from '../../../lib/toast';
import CustomExportModal from '../../../components/ui/CustomExportModal';

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCancelled, setShowCancelled] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [insuranceFilter, setInsuranceFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isCustomExportOpen, setIsCustomExportOpen] = useState(false);
  const { selectedBranch } = useAuthStore();

  useEffect(() => {
    fetchPurchases();
  }, [search, page, showCancelled, statusFilter, insuranceFilter, selectedBranch]);

  // Reset page when branch changes
  useEffect(() => {
    setPage(1);
  }, [selectedBranch]);

  // Listen to branchChange event for instant reactive refetch
  useEffect(() => {
    const handleBranchChange = () => {
      fetchPurchases();
    };
    window.addEventListener('branchChange', handleBranchChange);
    return () => window.removeEventListener('branchChange', handleBranchChange);
  }, [search, page, showCancelled, statusFilter, insuranceFilter, selectedBranch]);

  // One-time entrance for the header/filter chrome when the page first mounts.
  useEffect(() => {
    staggerFadeIn('.gsap-filter-bar', { y: 14, duration: 0.45, stagger: 0 });
  }, []);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      let query = `/api/purchases?page=${page}&limit=15`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (showCancelled) query += '&status=cancelled';
      if (statusFilter === 'pending_docs') query += '&has_pending_docs=true';
      if (statusFilter === 'completed_docs') query += '&has_pending_docs=false';
      if (insuranceFilter) query += `&insurance_status=${insuranceFilter}`;

      const branchParam = selectedBranch ? (selectedBranch.id || selectedBranch.code || selectedBranch.name) : 'all';
      query += `&branch_id=${encodeURIComponent(branchParam)}&_t=${Date.now()}`;

      const res = await api.get(query);
      if (res.data?.success) {
        setPurchases(res.data.data || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalRecords(res.data.pagination?.totalItems || 0);
      }
    } catch (err) {
      console.error('Failed to load purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  const [exporting, setExporting] = useState(false);

  const PURCHASE_EXPORT_COLUMNS = [
    'Owner Name',
    'Phone Number',
    'Ward / Branch',
    'Vehicle / Reg No',
    'Chassis No',
    'Battery No',
    'Motor No',
    'Charger No',
    'EV Model',
    'Company',
    'Total Value (₹)',
    'Downpayment Paid (₹)',
    'Payment Mode',
    'Customer Address',
    'Scooty Insurance Expiry',
    'Rider Insurance Expiry',
    'AMC Amount (₹)',
    'AMC Start Date',
    'AMC Expire Date',
    'Pending Docs',
    'Ownership Status',
    'Purchase Date',
    'Created Date'
  ];

  const fetchPurchasesForExport = async () => {
    const params = {};
    if (search) params.search = search;
    if (showCancelled) params.status = 'cancelled';
    if (statusFilter === 'pending_docs') params.has_pending_docs = 'true';
    if (statusFilter === 'completed_docs') params.has_pending_docs = 'false';
    if (insuranceFilter) params.insurance_status = insuranceFilter;

    const branchParam = selectedBranch ? (selectedBranch.id || selectedBranch.code || selectedBranch.name) : 'all';
    params.branch_id = branchParam;

    return await fetchAllForExport(api, '/api/purchases', params, 250);
  };

  const transformPurchaseRow = (row) => ({
    'Owner Name': row.name,
    'Phone Number': row.phone,
    'Ward / Branch': row.branch ? (row.branch.ward_no ? `Ward ${row.branch.ward_no}: ${row.branch.name}` : row.branch.name) : 'Central Fleet',
    'Vehicle / Reg No': row.vehicle_number || 'N/A',
    'Chassis No': row.chassis_no || 'N/A',
    'Battery No': row.battery_no || 'N/A',
    'Motor No': row.motor_no || 'N/A',
    'Charger No': row.charger_no || 'N/A',
    'EV Model': row.ev_models?.name || 'EV Scooter',
    'Company': row.ev_models?.company || 'GoSpeedy',
    'Total Value (₹)': row.total_price || 0,
    'Downpayment Paid (₹)': row.downpayment_paid || 0,
    'Payment Mode': row.downpayment_mode || 'Cash',
    'Customer Address': row.address || 'N/A',
    'Scooty Insurance Expiry': row.scooty_policy_expiry ? formatDate(row.scooty_policy_expiry) : 'N/A',
    'Rider Insurance Expiry': row.rider_policy_expiry ? formatDate(row.rider_policy_expiry) : 'N/A',
    'AMC Amount (₹)': row.amc_amount || 0,
    'AMC Start Date': row.amc_start_date ? formatDate(row.amc_start_date) : 'N/A',
    'AMC Expire Date': row.amc_expire_date ? formatDate(row.amc_expire_date) : 'N/A',
    'Pending Docs': row.has_pending_docs ? 'Yes' : 'No',
    'Ownership Status': row.status === 'direct_purchase' ? 'Direct Purchase' : 'Fully Owned',
    'Purchase Date': formatDate(row.date_of_purchase || row.updated_at || row.created_at),
    'Created Date': formatDate(row.created_at)
  });

  const handleDownloadData = () => {
    setIsCustomExportOpen(true);
  };

  const columns = [
    {
      header: 'Owner Name',
      key: 'name',
      render: (row) => (
        <div>
          <Link
            href={`/purchases/${row.id}`}
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
      header: 'EV Model Owned',
      key: 'model',
      render: (row) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {row.ev_models?.name
            ? `${row.ev_models.name}${row.ev_models.kilometres !== undefined && row.ev_models.kilometres !== null ? ` (${row.ev_models.kilometres} KM)` : ''}`
            : 'EV Scooter'}
        </span>
      ),
    },
    {
      header: 'Total Value',
      key: 'total_price',
      render: (row) => (
        <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(row.total_price)}</span>
      ),
    },
    {
      header: 'Downpayment Cleared',
      key: 'downpayment_paid',
      render: (row) => (
        <span className="text-xs font-semibold text-emerald-700">
          {formatCurrency(row.downpayment_paid)}
        </span>
      ),
    },
    {
      header: 'Purchase Date',
      key: 'updated_at',
      cellClassName: 'whitespace-nowrap',
      render: (row) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(row.updated_at)}</span>
      ),
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
      header: 'Status',
      key: 'status',
      cellClassName: 'whitespace-nowrap',
      render: (row) => (
        <Badge
          status={row.status === 'direct_purchase' ? 'Direct Purchase' : 'Fully Owned'}
          variant={row.status === 'direct_purchase' ? 'blue' : 'emerald'}
          size="sm"
        />
      ),
    },
    {
      header: 'Action',
      key: 'action',
      cellClassName: 'whitespace-nowrap',
      render: (row) => (
        <Link
          href={`/purchases/${row.id}`}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 inline-flex items-center gap-1 transition-colors"
        >
          View Ledger <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 w-full">
      <Header
        title="Purchases & Ownership"
        subtitle="Ledger of all vehicles fully paid and transferred to tenants"
        action={
          <Link href="/purchases/new">
            <Button
              variant="primary"
              size="sm"
              icon={ShoppingBag}
              className="h-9 px-3 sm:px-3.5 text-xs font-bold shrink-0 shadow-xs"
              title="Purchase EV"
            >
              <span className="hidden sm:inline">Purchase EV</span>
              <span className="sm:hidden">Buy</span>
            </Button>
          </Link>
        }
      />

      <div className="w-full px-3.5 sm:px-5 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Search Bar */}
        <div className="gsap-filter-bar flex flex-col xl:flex-row flex-wrap items-stretch xl:items-center justify-between gap-3 sm:gap-4 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 card-elevation shadow-xs dark:shadow-[0_8px_30px_rgb(0,0,0,0.35)] transition-colors">
          <div className="flex w-full xl:max-w-md xl:flex-1 min-w-0 gap-2 items-center">
            <SearchBar
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="Search owner name or phone..."
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              loading={exporting}
              className="shrink-0 h-[42px] px-3 font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              onClick={handleDownloadData}
              title="Download Complete Data as Excel"
            >
              <span className="hidden sm:inline">{exporting ? 'Exporting...' : 'Export Excel'}</span>
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
              {showCancelled ? 'Show Active' : 'Show Cancelled'}
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
          </div>
        </div>

        <Table
          columns={columns}
          data={purchases}
          loading={loading}
          emptyText="No completed purchases yet. When tenant balance reaches ₹0, contracts auto-complete here."
          minWidth="min-w-[880px]"
        />

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalRecords}
          onPageChange={setPage}
        />
      </div>

      {/* Universal Custom Export Modal */}
      <CustomExportModal
        isOpen={isCustomExportOpen}
        onClose={() => setIsCustomExportOpen(false)}
        title="Export EV Purchases Data"
        subtitle="Download fully-paid vehicle ownership and direct sale records (Excel / CSV)"
        defaultFilename="GoSpeedy_Purchases_Data"
        columns={PURCHASE_EXPORT_COLUMNS}
        dateAccessor="created_at"
        onFetchData={fetchPurchasesForExport}
        transformRow={transformPurchaseRow}
      />
    </div>
  );
}
