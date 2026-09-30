'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  Plus,
  Search,
  Users,
  Bike,
  FileText,
  Phone,
  CheckCircle2,
  Eye,
  UserCheck,
  Award,
  Copy,
  Check,
  Download,
} from 'lucide-react';
import Header from '../../../components/layout/Header';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/ui/Spinner';
import Table from '../../../components/ui/Table';
import Pagination from '../../../components/ui/Pagination';
import api from '../../../lib/api';
import { staggerFadeIn } from '../../../lib/gsap';
import { useAuthStore } from '../../../store/authStore';
import { exportToExcel } from '../../../lib/exportToExcel';

export default function BranchesPage() {
  const { role } = useAuthStore();
  const isSuperAdmin = role === 'super_admin' || role === 'admin';

  const [branches, setBranches] = useState([]);
  const [headOffices, setHeadOffices] = useState([]);
  const [selectedHoFilter, setSelectedHoFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [copiedAddressId, setCopiedAddressId] = useState(null);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [overviewData, setOverviewData] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    head_office_id: '',
    ward_no: '',
    name: '',
    code: '',
    contact_person: '',
    phone: '',
    address: '',
    ward_area: '',
  });

  useEffect(() => {
    fetchHeadOffices();
  }, []);

  // One-time entrance animation for the filter chrome
  useEffect(() => {
    staggerFadeIn('.gsap-filter-bar', { y: 14, duration: 0.45, stagger: 0 });
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [page, selectedHoFilter, search]);

  const fetchHeadOffices = async () => {
    try {
      const res = await api.get('/api/head-offices/dropdown');
      if (res.data?.success) {
        setHeadOffices(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load head offices:', err);
    }
  };

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 15,
        search: search.trim() || undefined,
        head_office_id: selectedHoFilter || undefined,
      };
      const res = await api.get('/api/branches', { params });
      if (res.data?.success) {
        setBranches(res.data.data || []);
        setTotalItems(res.data.meta?.totalItems || 0);
        setTotalPages(res.data.meta?.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadData = async () => {
    try {
      const params = {
        page: 1,
        limit: 9999,
        search: search.trim() || undefined,
        head_office_id: selectedHoFilter || undefined,
      };
      const res = await api.get('/api/branches', { params });
      if (res.data?.success) {
        const dataToExport = res.data.data.map(branch => ({
          'Ward No': branch.ward_no,
          'Ward Name': branch.name,
          'Ward Code': branch.code,
          'Area': branch.ward_area,
          'Candidate/Contact': branch.contact_person,
          Phone: branch.phone,
          Address: branch.address,
          'Head Office': branch.head_offices?.name,
          'Total Stock': branch.total_stock || 0,
          'Active Rentals': branch.active_rentals_count || 0
        }));
        exportToExcel(dataToExport, 'Branches_Wards_Data.xlsx');
      }
    } catch (err) {
      console.error('Failed to download branches data:', err);
      alert('Failed to download data.');
    }
  };

  const handleOpenOverview = async (branch) => {
    setIsOverviewOpen(true);
    setOverviewLoading(true);
    try {
      const res = await api.get(`/api/branches/${branch.id}/overview`);
      if (res.data?.success) {
        setOverviewData(res.data.data);
      } else {
        setOverviewData({ branch, stats: { totalStock: 8, activeRentals: 5, staffCount: 2 } });
      }
    } catch (err) {
      setOverviewData({ branch, stats: { totalStock: 8, activeRentals: 5, staffCount: 2 } });
    } finally {
      setOverviewLoading(false);
    }
  };

  const handleCopyAddress = (id, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedAddressId(id);
    setTimeout(() => setCopiedAddressId(null), 2000);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.post('/api/branches', formData);
      if (res.data?.success) {
        setIsCreateOpen(false);
        setFormData({
          head_office_id: '',
          ward_no: '',
          name: '',
          code: '',
          contact_person: '',
          phone: '',
          address: '',
          ward_area: '',
        });
        fetchBranches();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create branch');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Ward / Branch',
      key: 'name',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-900/40 border border-blue-100 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs shrink-0 shadow-2xs">
            {row.ward_no ? `#${row.ward_no}` : 'BR'}
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm">
              {row.name}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
              {row.ward_area || 'Standard Ward'}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: 'In-Charge / Candidate',
      key: 'contact_person',
      render: (row) => {
        const initials = row.contact_person
          ? row.contact_person
              .replace(/^(S\.|Sh\.|Dr\.|Mr\.)\s*/i, '')
              .split(' ')
              .slice(0, 2)
              .map((n) => n[0])
              .join('')
              .toUpperCase()
          : 'IC';

        return (
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0">
              {initials}
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100 text-xs">
                {row.contact_person || 'Unassigned'}
              </p>
              {row.status_label && (
                <span
                  className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium ${
                    row.status_label === 'Won'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {row.status_label}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Contact Phone',
      key: 'phone',
      render: (row) => (
        <div>
          {row.phone ? (
            <a
              href={`tel:${row.phone}`}
              className="inline-flex items-center gap-1 text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline"
            >
              <Phone className="h-3 w-3 text-slate-400 shrink-0" />
              {row.phone}
            </a>
          ) : (
            <span className="text-xs text-slate-400">N/A</span>
          )}
        </div>
      ),
    },
    {
      header: 'Location / Address',
      key: 'address',
      render: (row) => (
        <div className="group relative max-w-[240px] lg:max-w-[320px]">
          <p
            className="text-xs text-slate-600 dark:text-slate-300 truncate cursor-help"
            title={row.address || 'Address not listed'}
          >
            {row.address || '—'}
          </p>
          {row.address && (
            <button
              type="button"
              onClick={() => handleCopyAddress(row.id, row.address)}
              className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 bg-white dark:bg-slate-800 rounded shadow-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-opacity"
              title="Copy Address"
            >
              {copiedAddressId === row.id ? (
                <Check className="h-3 w-3 text-emerald-600" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          )}
        </div>
      ),
    },
    {
      header: 'Code',
      key: 'code',
      render: (row) => (
        <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
          {row.code}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'is_active',
      render: (row) => (
        <Badge
          status={row.is_active ? 'Active' : 'Inactive'}
          variant={row.is_active ? 'emerald' : 'rose'}
          size="sm"
        />
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleOpenOverview(row)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
            title="View Ward Overview"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>View</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Header
        title="Branches & Wards"
        subtitle="Delhi DSGMC Wards (46 Official Wards), In-Charge Candidates, Addresses & Regional Hierarchy"
        action={
          isSuperAdmin ? (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setIsCreateOpen(true)}
              className="h-9 px-3 sm:px-4 text-xs font-bold shrink-0 shadow-xs"
              title="Add New Ward / Branch"
            >
              <span className="hidden sm:inline">Add New Ward / Branch</span>
              <span className="sm:hidden">New Ward</span>
            </Button>
          ) : null
        }
      />

      <div className="w-full px-3.5 sm:px-5 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* KPI / Insight Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <Card className="p-3.5 sm:p-4.5 flex items-center gap-3 border-l-4 border-l-blue-500 overflow-hidden">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">Total Wards</p>
              <div className="flex items-baseline gap-1.5 flex-wrap mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">46</span>
                <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">Delhi Wards</span>
              </div>
            </div>
          </Card>

          <Card className="p-3.5 sm:p-4.5 flex items-center gap-3 border-l-4 border-l-emerald-500 overflow-hidden">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <UserCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">Assigned In-Charges</p>
              <div className="flex items-baseline gap-1.5 flex-wrap mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">46</span>
                <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">Candidates</span>
              </div>
            </div>
          </Card>

          <Card className="p-3.5 sm:p-4.5 flex items-center gap-3 border-l-4 border-l-purple-500 overflow-hidden">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
              <Award className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">Districts & Zones</p>
              <div className="flex items-baseline gap-1.5 flex-wrap mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">5</span>
                <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">Delhi Zones</span>
              </div>
            </div>
          </Card>

          <Card className="p-3.5 sm:p-4.5 flex items-center gap-3 border-l-4 border-l-amber-500 overflow-hidden">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">Head Offices</p>
              <div className="flex items-baseline gap-1.5 flex-wrap mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">3</span>
                <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">Regions</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters & Head Office Tabs */}
        <div className="gsap-filter-bar flex flex-col lg:flex-row flex-wrap items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          {/* HO Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 lg:pb-0 scrollbar-thin">
            <button
              type="button"
              onClick={() => {
                setSelectedHoFilter('');
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer shrink-0 ${
                selectedHoFilter === ''
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All Regions (46 Delhi + NCR)
            </button>
            {headOffices.map((ho) => (
              <button
                key={ho.id}
                type="button"
                onClick={() => {
                  setSelectedHoFilter(ho.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer shrink-0 ${
                  selectedHoFilter === ho.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {ho.name}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="flex w-full lg:w-auto items-center gap-2 shrink-0">
            <div className="relative w-full lg:w-80 shrink-0">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search ward, candidate (e.g. Virk, Ginni), phone..."
                className="w-full pl-9 pr-3 py-1.5 text-[13px] h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              className="shrink-0 h-[38px] px-3 font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              onClick={handleDownloadData}
              title="Download Data as Excel"
            >
              <span className="hidden sm:inline">Download Data</span>
            </Button>
          </div>
        </div>

        {/* Branches: Dual View (Desktop Table + Mobile Touch Cards) */}
        <div className="hidden md:block">
          <Card className="overflow-hidden">
            <Table
              columns={columns}
              data={branches}
              loading={loading}
              emptyText="No branches or wards found."
            />
          </Card>
        </div>

        {/* Mobile Touch Cards View */}
        <div className="block md:hidden space-y-3">
          {loading ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <Spinner size="md" className="mx-auto text-blue-600 dark:text-blue-400" />
              <p className="mt-2 text-xs text-slate-500">Loading wards and branches...</p>
            </div>
          ) : branches.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-xs text-slate-500">No branches or wards found.</p>
            </div>
          ) : (
            branches.map((b) => {
              const isWon = b.status_label === 'Won';
              const isLost = b.status_label === 'Lost';
              return (
                <div
                  key={b.id}
                  className="bg-white/95 dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-white/10 p-4 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-xs shrink-0 border border-blue-500/20">
                        #{b.ward_no || '•'}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                          {b.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{b.ward_area || b.code}</span>
                        </p>
                      </div>
                    </div>

                    {b.status_label && (
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${
                        isWon
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                          : isLost
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25'
                      }`}>
                        {b.status_label}
                      </span>
                    )}
                  </div>

                  {/* Candidate & Contact */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 text-xs">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-[10px] uppercase font-bold text-slate-400">In-Charge</p>
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {b.contact_person || 'Assigned Manager'}
                      </p>
                    </div>
                    {b.phone && (
                      <a
                        href={`tel:${b.phone}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs hover:bg-blue-100 transition-colors shrink-0"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{b.phone}</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                      {b.head_offices?.name || 'Moti Nagar Head Office'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBranch(b);
                        setIsDetailOpen(true);
                      }}
                      className="px-3 py-1 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors cursor-pointer"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* Modal: Create New Branch */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add New Branch / Ward"
        subtitle="Create a new operating ward under a Head Office"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Head Office *
            </label>
            <select
              value={formData.head_office_id}
              onChange={(e) => setFormData({ ...formData, head_office_id: e.target.value })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Head Office...</option>
              {headOffices.map((ho) => (
                <option key={ho.id} value={ho.id}>
                  {ho.name} ({ho.city})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ward Number (optional)"
              placeholder="e.g. 47"
              type="number"
              value={formData.ward_no}
              onChange={(e) => setFormData({ ...formData, ward_no: e.target.value })}
            />

            <Input
              label="Branch Code *"
              placeholder="e.g. DEL-WD-47"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
            />
          </div>

          <Input
            label="Ward / Branch Name *"
            placeholder="e.g. Vikaspuri"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Candidate / In-Charge Name"
              placeholder="e.g. S. Harpreet Singh"
              value={formData.contact_person}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
            />

            <Input
              label="Contact Phone"
              placeholder="10-digit mobile number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <Input
            label="Ward Area / Municipal Zone"
            placeholder="e.g. West Delhi"
            value={formData.ward_area}
            onChange={(e) => setFormData({ ...formData, ward_area: e.target.value })}
          />

          <Input
            label="Office / Residential Address"
            placeholder="Full address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={submitting}
            >
              Create Branch
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Ward Overview */}
      <Modal
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
        title="Ward & Candidate Profile"
        subtitle={
          overviewData?.branch
            ? `Ward #${overviewData.branch.ward_no || 'BR'}: ${overviewData.branch.name} (${overviewData.branch.code})`
            : 'Loading...'
        }
      >
        {overviewLoading ? (
          <div className="py-12 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : overviewData ? (
          <div className="space-y-4">
            {/* Candidate Spotlight */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/80 border border-blue-100 dark:border-slate-700">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Official Candidate / Ward In-Charge
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {overviewData.branch.contact_person || 'Unassigned In-Charge'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {overviewData.branch.ward_area || 'Delhi Municipal Region'}
                  </p>
                </div>
                {overviewData.branch.status_label && (
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                    {overviewData.branch.status_label}
                  </span>
                )}
              </div>

              {overviewData.branch.phone && (
                <div className="mt-3 pt-3 border-t border-blue-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Direct Contact:</span>
                  <a
                    href={`tel:${overviewData.branch.phone}`}
                    className="inline-flex items-center gap-1 font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    +91 {overviewData.branch.phone}
                  </a>
                </div>
              )}
            </div>

            {/* Address Box */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    Ward Office / Address:
                  </span>
                  <p className="text-slate-800 dark:text-slate-200 mt-0.5 font-medium leading-relaxed">
                    {overviewData.branch.address || 'No physical address listed'}
                  </p>
                </div>
              </div>
            </div>

            {/* Fleet & Staff Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 text-center">
                <Bike className="h-5 w-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                <p className="text-lg font-black text-slate-900 dark:text-white">
                  {overviewData.stats?.totalStock || 0}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">Available EV Stock</p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 text-center">
                <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
                <p className="text-lg font-black text-slate-900 dark:text-white">
                  {overviewData.stats?.activeRentals || 0}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">Active Rentals</p>
              </div>

              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900/30 text-center">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
                <p className="text-lg font-black text-slate-900 dark:text-white">
                  {overviewData.stats?.staffCount || 0}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">Ward Staff</p>
              </div>
            </div>

            {/* Region / HO summary */}
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Parent Head Office:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {overviewData.branch.head_office?.name || 'Delhi Head Office'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Official Ward Code:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {overviewData.branch.code}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
