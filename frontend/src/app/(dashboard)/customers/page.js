'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Bike,
  Building,
  Eye,
  Download,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  MapPin,
  Calendar,
  CreditCard,
  UserCheck,
  ArrowRight
} from 'lucide-react';
import Header from '../../../components/layout/Header';
import Table from '../../../components/ui/Table';
import Button from '../../../components/ui/Button';
import SearchBar from '../../../components/ui/SearchBar';
import Badge from '../../../components/ui/Badge';
import Pagination from '../../../components/ui/Pagination';
import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/ui/Spinner';
import Card from '../../../components/ui/Card';
import api from '../../../lib/api';
import { formatCurrency, formatDate } from '../../../lib/constants';
import { staggerFadeIn } from '../../../lib/gsap';
import { useAuthStore } from '../../../store/authStore';
import { exportToExcel } from '../../../lib/exportToExcel';
import { toast } from '../../../lib/toast';
import AddPenaltyModal from '../../../components/penalties/AddPenaltyModal';

export default function CustomersPage() {
  const { user, role, selectedBranch, setSelectedBranch } = useAuthStore();
  const isSuperAdmin = role === 'super_admin' || (role === 'admin' && !user?.ward_area);

  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState({
    total_customers: 0,
    active_renters: 0,
    overdue_defaulters: 0,
    completed_customers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // 360 Profile Modal State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Penalty Modal State
  const [penaltyModalTarget, setPenaltyModalTarget] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, [search, statusFilter, selectedBranch]);

  // Reset page when branch or filter changes
  useEffect(() => {
    setPage(1);
  }, [selectedBranch, statusFilter]);

  // Listen to universal branchChange event
  useEffect(() => {
    const handleBranchChange = () => fetchCustomers();
    window.addEventListener('branchChange', handleBranchChange);
    return () => window.removeEventListener('branchChange', handleBranchChange);
  }, [selectedBranch]);

  // GSAP animation entrance
  useEffect(() => {
    if (!loading) {
      staggerFadeIn('.gsap-admin-kpi', { stagger: 0.08, y: 15, duration: 0.5, hover: true });
      staggerFadeIn('.gsap-filter-bar', { y: 14, duration: 0.45 });
    }
  }, [loading]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

      const branchParam = selectedBranch ? (selectedBranch.id || selectedBranch.code || selectedBranch.name) : 'all';
      params.append('branch_id', branchParam);
      params.append('_t', Date.now().toString());

      const res = await api.get(`/api/customers?${params.toString()}`);
      if (res.data?.success) {
        setCustomers(res.data.data || []);
        if (res.data.summary) setSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleViewCustomer = async (cust) => {
    setSelectedCustomer(cust);
    setActiveTab('overview');
    try {
      setLoadingDetails(true);
      const res = await api.get(`/api/customers/${cust.id}`);
      if (res.data?.success) {
        setCustomerDetails(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching customer details:', err);
      toast.error('Failed to load 360 profile');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleWaivePenalty = async (penaltyId) => {
    if (!confirm('Are you sure you want to waive this penalty fine?')) return;
    try {
      const res = await api.post(`/api/penalties/${penaltyId}/waive`, {
        reason: 'Waived by Super Admin from 360 Profile',
      });
      if (res.data?.success) {
        toast.success('Penalty fine waived successfully!');
        if (selectedCustomer) handleViewCustomer(selectedCustomer);
        fetchCustomers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to waive penalty');
    }
  };

  const handleExportData = () => {
    if (customers.length === 0) return toast.error('No customers to export');
    const dataToExport = customers.map((c) => ({
      'Customer Name': c.name,
      Phone: c.phone,
      'Ward / Branch': c.branch?.name || 'Head Office',
      'Active Contracts': c.active_contract_count,
      'Contract Status': c.status,
      'Total Amount Paid': c.total_paid,
      'Principal Due': c.net_outstanding,
      'Days Overdue': c.max_days_overdue,
      'Late Fees & Fines': c.total_late_fee,
      'Net Amount Due': c.net_total_due,
      'Active Bike': c.contracts?.[0]?.vehicle_number || 'N/A',
      'EV Model': c.contracts?.[0]?.model_name || 'EV Scooter',
    }));
    exportToExcel(dataToExport, `GoSpeedy_Customer_Directory_${new Date().toISOString().split('T')[0]}`);
  };

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(customers.length / pageSize));
  const paginatedCustomers = customers.slice((page - 1) * pageSize, page * pageSize);

  // Table Columns (Clean, matching the rest of the application)
  const columns = [
    {
      header: 'Customer & Contact',
      key: 'customer',
      render: (row) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-white text-sm">{row.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono mt-0.5">
            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
            {row.phone}
          </p>
        </div>
      ),
    },
    {
      header: 'Active Bike & Ward',
      key: 'vehicle',
      render: (row) => {
        const active = row.contracts?.[0];
        return (
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
              <Bike className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              {active?.vehicle_number || 'N/A'}
            </p>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {active?.model_name || 'EV Scooter'} • {row.branch?.name || 'Head Office'}
            </p>
          </div>
        );
      },
    },
    {
      header: 'Financial Status',
      key: 'financials',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
            Paid: {formatCurrency(row.total_paid)}
          </span>
          <p className="text-[11px] text-slate-400">
            Principal: {formatCurrency(row.net_outstanding)}
          </p>
        </div>
      ),
    },
    {
      header: 'Overdue & Late Fees',
      key: 'overdue',
      render: (row) => {
        if (row.max_days_overdue > 0) {
          return (
            <div>
              <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center">
                <AlertTriangle className="w-3.5 h-3.5 mr-1 shrink-0" />
                {row.max_days_overdue}d Overdue
              </p>
              <p className="text-[11px] text-slate-400">
                Fees: {formatCurrency(row.total_late_fee)}
              </p>
            </div>
          );
        }
        return (
          <span className="inline-flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 shrink-0" /> Up to date
          </span>
        );
      },
    },
    {
      header: 'Net Total Due',
      key: 'net_due',
      render: (row) => (
        <div>
          <span className={`font-black text-sm ${row.net_total_due > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {formatCurrency(row.net_total_due)}
          </span>
          {row.manual_penalties > 0 && (
            <p className="text-[10px] font-semibold text-rose-500">
              incl. {formatCurrency(row.manual_penalties)} fine
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex items-center gap-1.5 justify-start">
          {isSuperAdmin && row.max_days_overdue > 0 && (
            <Button
              variant="danger"
              size="sm"
              icon={ShieldAlert}
              onClick={(e) => {
                e.stopPropagation();
                setPenaltyModalTarget(row);
              }}
              className="h-8 px-2.5 text-xs font-bold"
              title="Add Custom Penalty"
            >
              <span className="hidden sm:inline">Add Penalty</span>
              <span className="sm:hidden">Penalty</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            icon={Eye}
            onClick={() => handleViewCustomer(row)}
            className="h-8 px-2.5 text-xs font-semibold"
          >
            360° Profile
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 w-full">
      <Header
        title="Customer Directory & 360° Ledger"
        subtitle="Unified customer ledger, KYC documentation, contract histories, and penalty fine management"
        action={
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={handleExportData}
            className="h-9 px-3 sm:px-3.5 text-xs font-semibold shrink-0 shadow-xs border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            title="Download Customer Directory as Excel"
          >
            <span className="hidden sm:inline">Export Directory</span>
            <span className="sm:hidden">Export</span>
          </Button>
        }
      />

      <div className="w-full px-3.5 sm:px-5 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Ward Filter Banner (Matches Dashboard exactly) */}
        {selectedBranch && (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300">
            <div className="flex items-center gap-2.5 min-w-0">
              <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold truncate">
                  Filtered View: {selectedBranch.ward_no ? `Ward ${selectedBranch.ward_no}: ${selectedBranch.name}` : selectedBranch.name}
                </p>
                <p className="text-[10px] sm:text-xs text-blue-600/80 dark:text-blue-400/80 truncate">
                  Showing customer contracts registered in this specific ward.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedBranch(null)}
              className="px-3 py-1 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all shrink-0 cursor-pointer shadow-2xs"
            >
              All Wards
            </button>
          </div>
        )}

        {/* Top 4 KPI Cards (Matching Dashboard exactly) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
          {/* Card 1: Total Customers */}
          <div className="gsap-admin-kpi rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl p-4 sm:p-5 card-elevation shadow-xs dark:shadow-[0_8px_30px_rgb(0,0,0,0.35)] flex items-center justify-between transition-all relative overflow-hidden">
            <div className="min-w-0 flex-1 pr-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                Total Customers
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 truncate">
                {loading ? <Spinner size="sm" /> : summary.total_customers}
              </h3>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-1 truncate">
                Deduplicated phone registry
              </p>
            </div>
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
            </div>
          </div>

          {/* Card 2: Active Renters */}
          <div className="gsap-admin-kpi rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl p-4 sm:p-5 card-elevation shadow-xs dark:shadow-[0_8px_30px_rgb(0,0,0,0.35)] flex items-center justify-between transition-all relative overflow-hidden">
            <div className="min-w-0 flex-1 pr-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                Active Renters
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 truncate">
                {loading ? <Spinner size="sm" /> : summary.active_renters}
              </h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 truncate">
                Ongoing vehicle rentals
              </p>
            </div>
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <UserCheck className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
            </div>
          </div>

          {/* Card 3: Overdue Defaulters */}
          <div className="gsap-admin-kpi rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl p-4 sm:p-5 card-elevation shadow-xs dark:shadow-[0_8px_30px_rgb(0,0,0,0.35)] flex items-center justify-between transition-all relative overflow-hidden">
            <div className="min-w-0 flex-1 pr-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                Overdue Defaulters
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 truncate">
                {loading ? <Spinner size="sm" /> : summary.overdue_defaulters}
              </h3>
              <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 font-medium mt-1 truncate">
                Require recovery action
              </p>
            </div>
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
            </div>
          </div>

          {/* Card 4: Completed / Sold */}
          <div className="gsap-admin-kpi rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl p-4 sm:p-5 card-elevation shadow-xs dark:shadow-[0_8px_30px_rgb(0,0,0,0.35)] flex items-center justify-between transition-all relative overflow-hidden">
            <div className="min-w-0 flex-1 pr-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                Completed / Sold
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 truncate">
                {loading ? <Spinner size="sm" /> : summary.completed_customers}
              </h3>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-1 truncate">
                100% payments settled
              </p>
            </div>
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
            </div>
          </div>
        </div>

        {/* Filter and Search Bar (Matching Rentals page exactly) */}
        <div className="gsap-filter-bar flex flex-col xl:flex-row flex-wrap items-stretch xl:items-center justify-between gap-3 sm:gap-4 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 card-elevation shadow-xs dark:shadow-[0_8px_30px_rgb(0,0,0,0.35)] transition-colors">
          <div className="flex w-full xl:max-w-md xl:flex-1 min-w-0 gap-2 items-center">
            <SearchBar
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="Search customer name, phone, bike number..."
              className="flex-1"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full xl:w-auto shrink-0">
            {['all', 'active', 'overdue', 'completed'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setStatusFilter(tab);
                  setPage(1);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab === 'all' ? 'All Customers' : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Main Customers Table (Matching the project's standard Table component) */}
        <Table
          columns={columns}
          data={paginatedCustomers}
          loading={loading}
          emptyText="No customer records found matching the search criteria"
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pt-2">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* 360° Customer Profile Modal (Uses Modal.jsx with smooth portals & clean typography) */}
      <Modal
        isOpen={Boolean(selectedCustomer)}
        onClose={() => {
          setSelectedCustomer(null);
          setCustomerDetails(null);
        }}
        title={selectedCustomer?.name || 'Customer 360° Profile'}
        subtitle={`Phone: ${selectedCustomer?.phone} • ${selectedCustomer?.branch?.name || 'Head Office'}`}
        maxWidth="max-w-4xl"
      >
        <div className="p-5 space-y-5">
          {/* Sub Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-bold uppercase tracking-wider">
            {['overview', 'contracts', 'ledger', 'penalties', 'kyc'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`pb-3 border-b-2 transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {tab === 'ledger' ? 'Payment Ledger' : tab === 'penalties' ? 'Penalties & Fines' : tab}
              </button>
            ))}
          </div>

          {loadingDetails ? (
            <div className="py-16 text-center text-slate-500">
              <Spinner size="md" className="mx-auto mb-2" />
              <p className="text-xs font-semibold">Loading complete customer ledger...</p>
            </div>
          ) : customerDetails ? (
            <div>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Total Collected</span>
                      <h4 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                        {formatCurrency(customerDetails.payments?.reduce((s, p) => s + Number(p.amount), 0) || 0)}
                      </h4>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Principal Due</span>
                      <h4 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                        {formatCurrency(customerDetails.balance?.outstanding || 0)}
                      </h4>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Late Fees & Fines</span>
                      <h4 className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1">
                        {formatCurrency(customerDetails.balance?.totalLateFee || 0)}
                      </h4>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Net Total Due</span>
                      <h4 className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1">
                        {formatCurrency(customerDetails.balance?.netTotalDue || 0)}
                      </h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card title="Customer Profile" className="p-4 sm:p-5">
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                          <span className="text-slate-500">Full Name:</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{customerDetails.profile.name}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                          <span className="text-slate-500">Mobile Phone:</span>
                          <span className="font-semibold text-slate-900 dark:text-white font-mono">{customerDetails.profile.phone}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                          <span className="text-slate-500">Ward / Branch:</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{customerDetails.profile.branch?.name || 'Head Office'}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-500">Address:</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{customerDetails.profile.address || 'Delhi NCR'}</span>
                        </div>
                      </div>
                    </Card>

                    <Card title="Guarantor & Emergency Contact" className="p-4 sm:p-5">
                      <div className="space-y-2 text-xs">
                        {customerDetails.profile.guarantors && customerDetails.profile.guarantors.length > 0 ? (
                          customerDetails.profile.guarantors.map((g, i) => (
                            <div key={i} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                              <span className="font-semibold text-slate-900 dark:text-white">{g.name || 'Guarantor'}</span>
                              <span className="text-slate-500 font-mono">{g.phone}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-400 italic py-2">No guarantor recorded on contract.</p>
                        )}
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {/* TAB 2: CONTRACTS */}
              {activeTab === 'contracts' && (
                <div className="space-y-3">
                  {customerDetails.contracts?.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                          🛵 {c.vehicle_number || 'N/A'} • {c.ev_models?.name || 'EV Scooter'}
                          <Badge status={c.status} size="sm" />
                        </div>
                        <p className="text-xs text-slate-500">
                          Start Date: {formatDate(c.start_date)} • Sticker Price: {formatCurrency(c.total_price)} • Rate: {formatCurrency(c.installment_daily_rate)}/day
                        </p>
                      </div>
                      <Link href={`/rentals/${c.id}`}>
                        <Button variant="outline" size="sm" icon={ExternalLink}>
                          Open Contract
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 3: PAYMENT LEDGER */}
              {activeTab === 'ledger' && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Mode</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Late Fee Paid</th>
                        <th className="px-4 py-3">Collected By</th>
                        <th className="px-4 py-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {customerDetails.payments?.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-400">
                            No payments recorded yet.
                          </td>
                        </tr>
                      ) : (
                        customerDetails.payments?.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-4 py-2.5 font-mono">{formatDate(p.payment_date)}</td>
                            <td className="px-4 py-2.5 capitalize font-semibold">{p.mode}</td>
                            <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">{formatCurrency(p.amount)}</td>
                            <td className="px-4 py-2.5 text-slate-500">{formatCurrency(p.late_fee_paid || 0)}</td>
                            <td className="px-4 py-2.5 text-slate-500">{p.users?.name || 'Staff'}</td>
                            <td className="px-4 py-2.5 text-slate-500">{p.notes || '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 4: PENALTIES & FINES */}
              {activeTab === 'penalties' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      Levied Penalties & Overdue Charges
                    </h4>
                    {isSuperAdmin && (
                      <Button
                        variant="danger"
                        size="sm"
                        icon={ShieldAlert}
                        onClick={() => setPenaltyModalTarget(selectedCustomer)}
                      >
                        + Add Custom Penalty
                      </Button>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Reason / Description</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Authorized By</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                        {customerDetails.penalties?.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-8 text-slate-400">
                              No penalties levied on this customer.
                            </td>
                          </tr>
                        ) : (
                          customerDetails.penalties?.map((pen) => (
                            <tr key={pen.penalty_id || pen.audit_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="px-4 py-3 font-mono">{pen.penalty_date || formatDate(pen.created_at)}</td>
                              <td className="px-4 py-3">
                                <div className="font-semibold text-slate-900 dark:text-white">{pen.reason}</div>
                                {pen.notes && <div className="text-slate-400 text-[11px]">{pen.notes}</div>}
                              </td>
                              <td className="px-4 py-3 font-bold text-rose-600 dark:text-rose-400">
                                {formatCurrency(pen.amount)}
                              </td>
                              <td className="px-4 py-3">
                                <Badge
                                  status={pen.status}
                                  variant={pen.status === 'unpaid' ? 'rose' : pen.status === 'waived' ? 'slate' : 'emerald'}
                                  size="sm"
                                />
                              </td>
                              <td className="px-4 py-3 text-slate-500">
                                {pen.created_by_name || 'Super Admin'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {isSuperAdmin && pen.status === 'unpaid' && (
                                  <button
                                    type="button"
                                    onClick={() => handleWaivePenalty(pen.penalty_id)}
                                    className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                                  >
                                    Waive Penalty
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: KYC DOCUMENTS */}
              {activeTab === 'kyc' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { title: 'Aadhaar Card', path: customerDetails.profile.aadhar_path },
                    { title: 'PAN Card', path: customerDetails.profile.pan_path },
                    { title: 'Electricity Bill', path: customerDetails.profile.electricity_bill_path },
                    { title: 'Rider Driving License', path: customerDetails.profile.rider_license_path },
                  ].map((doc, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
                      <div>
                        <h5 className="font-bold text-slate-900 dark:text-white text-xs">{doc.title}</h5>
                        <p className="text-[11px] text-slate-400">
                          {doc.path ? 'Document uploaded & on file' : 'Pending upload'}
                        </p>
                      </div>
                      {doc.path ? (
                        <a
                          href={doc.path}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 shadow-2xs"
                        >
                          View Doc <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <Badge status="Missing" variant="rose" size="sm" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </Modal>

      {/* Add Penalty Modal */}
      {penaltyModalTarget && (
        <AddPenaltyModal
          isOpen={Boolean(penaltyModalTarget)}
          target={penaltyModalTarget}
          onClose={() => setPenaltyModalTarget(null)}
          onSuccess={() => {
            fetchCustomers();
            if (selectedCustomer) handleViewCustomer(selectedCustomer);
          }}
        />
      )}
    </div>
  );
}
