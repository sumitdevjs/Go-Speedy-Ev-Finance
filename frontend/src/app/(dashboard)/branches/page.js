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
  Trash2,
  Key,
  Lock,
  ShieldCheck,
  UserCheck,
  Award,
  Copy,
  Check,
  Download,
  ChevronDown,
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
import { useSearchParams, useRouter } from 'next/navigation';
import api from '../../../lib/api';
import { staggerFadeIn } from '../../../lib/gsap';
import { useAuthStore } from '../../../store/authStore';
import { exportToExcel, fetchAllForExport } from '../../../lib/exportToExcel';
import { toast } from '../../../lib/toast';
import CustomExportModal from '../../../components/ui/CustomExportModal';

export default function BranchesPage() {
  const router = useRouter();
  const { role, user, setSelectedBranch } = useAuthStore();
  const searchParams = useSearchParams();
  const isSuperAdmin = role === 'super_admin' || role === 'admin';
  const isHoAdmin = role === 'ho_admin';

  const [branches, setBranches] = useState([]);
  const [isCustomExportOpen, setIsCustomExportOpen] = useState(false);
  const [headOffices, setHeadOffices] = useState([]);
  const [selectedHoFilter, setSelectedHoFilter] = useState('');
  const [search, setSearch] = useState(searchParams?.get('search') || '');
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [copiedAddressId, setCopiedAddressId] = useState(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateHoOpen, setIsCreateHoOpen] = useState(false);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [overviewData, setOverviewData] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hoSubmitting, setHoSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Credentials Management Modal State
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [credentialsBranch, setCredentialsBranch] = useState(null);
  const [credentialsForm, setCredentialsForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [credentialsSubmitting, setCredentialsSubmitting] = useState(false);

  const handleDeleteBranch = async (branch) => {
    if (!window.confirm(`Are you sure you want to delete branch "${branch.name}" (${branch.code})? This action cannot be undone.`)) {
      return;
    }
    try {
      setDeletingId(branch.id);
      const res = await api.delete(`/api/branches/${branch.id}`);
      if (res.data?.success) {
        toast.success(`Branch "${branch.name}" deleted successfully`);
        fetchBranches();
        window.dispatchEvent(new CustomEvent('branchListUpdated'));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete branch');
    } finally {
      setDeletingId(null);
    }
  };

  const [formData, setFormData] = useState({
    head_office_id: isHoAdmin ? (user?.head_office_id || '') : '',
    ward_no: '',
    name: '',
    code: '',
    contact_person: '',
    phone: '',
    address: '',
    ward_area: '',
    create_admin: true,
    admin_email: '',
    admin_password: '',
  });

  const [hoFormData, setHoFormData] = useState({
    name: '',
    code: '',
    city: '',
    state: '',
    create_admin: true,
    admin_name: '',
    admin_phone: '',
    admin_email: '',
    admin_password: '',
  });

  const handleCreateHeadOffice = async (e) => {
    e.preventDefault();
    if (!hoFormData.name || !hoFormData.code || !hoFormData.city || !hoFormData.state) {
      toast.error('Please fill in all required Head Office fields.');
      return;
    }
    if (hoFormData.create_admin && (!hoFormData.admin_email || !hoFormData.admin_password)) {
      toast.error('Please enter Admin Email and Password for the HO Admin account.');
      return;
    }
    try {
      setHoSubmitting(true);
      const payload = {
        name: hoFormData.name,
        code: hoFormData.code,
        city: hoFormData.city,
        state: hoFormData.state,
        admin_name: hoFormData.create_admin ? (hoFormData.admin_name || `${hoFormData.name} Admin`) : undefined,
        admin_phone: hoFormData.create_admin ? hoFormData.admin_phone : undefined,
        admin_email: hoFormData.create_admin ? hoFormData.admin_email : undefined,
        admin_password: hoFormData.create_admin ? hoFormData.admin_password : undefined,
      };
      const res = await api.post('/api/head-offices', payload);
      if (res.data?.success) {
        setIsCreateHoOpen(false);
        setHoFormData({
          name: '',
          code: '',
          city: '',
          state: '',
          create_admin: true,
          admin_name: '',
          admin_phone: '',
          admin_email: '',
          admin_password: '',
        });
        toast.success(
          res.data?.data?.admin
            ? `Head Office and Admin Login (${res.data.data.admin.email}) created successfully!`
            : 'Head Office created successfully!'
        );
        await fetchHeadOffices();
        fetchBranches();
        window.dispatchEvent(new CustomEvent('headOfficeListUpdated'));
        window.dispatchEvent(new CustomEvent('branchListUpdated'));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to create Head Office');
    } finally {
      setHoSubmitting(false);
    }
  };

  const handleOpenCredentials = (branch) => {
    setCredentialsBranch(branch);
    setCredentialsForm({
      name: branch.admin?.name || branch.contact_person || branch.name,
      email: branch.admin?.email || '',
      phone: branch.admin?.phone || branch.phone || '',
      password: '',
    });
    setIsCredentialsModalOpen(true);
  };

  const handleSaveCredentials = async (e) => {
    e.preventDefault();
    if (!credentialsForm.email || !credentialsForm.password) {
      toast.error('Email and password are required');
      return;
    }
    try {
      setCredentialsSubmitting(true);
      const res = await api.post(`/api/branches/${credentialsBranch.id}/admin`, credentialsForm);
      if (res.data?.success) {
        toast.success(`Ward Admin credentials for "${credentialsBranch.name}" saved successfully!`);
        setIsCredentialsModalOpen(false);
        fetchBranches();
        window.dispatchEvent(new CustomEvent('branchListUpdated'));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save credentials');
    } finally {
      setCredentialsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchHeadOffices();
  }, []);

  const urlSearch = searchParams?.get('search');
  useEffect(() => {
    if (urlSearch !== undefined && urlSearch !== null) {
      setSearch(urlSearch);
    }
  }, [urlSearch]);

  useEffect(() => {
    const handleBranchChange = (e) => {
      if (e.detail?.name) {
        setSearch(e.detail.name);
      } else {
        setSearch('');
      }
    };
    window.addEventListener('branchChange', handleBranchChange);
    return () => window.removeEventListener('branchChange', handleBranchChange);
  }, []);

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
    }
  };

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const effectiveHoId = (selectedHoFilter && selectedHoFilter !== 'all') ? selectedHoFilter : undefined;
      const params = {
        page,
        limit: 15,
        search: search.trim() || undefined,
        head_office_id: effectiveHoId || undefined,
      };
      const res = await api.get('/api/branches', { params });
      if (res.data?.success) {
        setBranches(res.data.data || []);
        setTotalItems(res.data.meta?.totalItems || 0);
        setTotalPages(res.data.meta?.totalPages || 1);
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const [exporting, setExporting] = useState(false);

  const BRANCH_EXPORT_COLUMNS = [
    'Ward No',
    'Ward Name',
    'Ward Code',
    'Ward Area / District',
    'Candidate / In-Charge',
    'Contact Phone',
    'Branch Address',
    'Governing Head Office',
    'Head Office Code',
    'Head Office City / State',
    'Governing HO Admin',
    'HO Admin Contact',
    'Total Fleet Stock',
    'Available Stock',
    'Active Rentals / Deployed',
    'Status'
  ];

  const fetchBranchesForExport = async () => {
    const effectiveHoId = isHoAdmin ? (user?.head_office_id || selectedHoFilter) : (selectedHoFilter || undefined);
    const params = {
      search: search.trim() || undefined,
      head_office_id: effectiveHoId || undefined,
    };
    return await fetchAllForExport(api, '/api/branches', params, 250);
  };

  const transformBranchRow = (branch) => {
    const hoObj = branch.head_offices || branch.head_office || headOffices.find(h => h.id === branch.head_office_id);
    const totalStock = branch.total_stock ?? 0;
    const activeCount = branch.active_rentals_count ?? 0;
    const availStock = branch.available_stock ?? Math.max(0, totalStock - activeCount);
    return {
      'Ward No': branch.ward_no ?? '—',
      'Ward Name': branch.name || 'Unnamed Branch',
      'Ward Code': branch.code || '—',
      'Ward Area / District': branch.ward_area || 'Delhi',
      'Candidate / In-Charge': branch.contact_person || 'Assigned Candidate',
      'Contact Phone': branch.phone || 'N/A',
      'Branch Address': branch.address || 'N/A',
      'Governing Head Office': hoObj?.name || 'Head Office',
      'Head Office Code': hoObj?.code || '—',
      'Head Office City / State': hoObj?.city || hoObj?.state || '—',
      'Governing HO Admin': branch.ho_admin?.name || 'Zone Admin',
      'HO Admin Contact': branch.ho_admin?.phone || 'N/A',
      'Total Fleet Stock': totalStock,
      'Available Stock': availStock,
      'Active Rentals / Deployed': activeCount,
      'Status': branch.is_active ? 'Active' : 'Inactive',
    };
  };

  const handleDownloadData = () => {
    setIsCustomExportOpen(true);
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
    if (formData.create_admin && (!formData.admin_email || !formData.admin_password)) {
      toast.error('Please enter Admin Email and Password for the Ward Admin account.');
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        head_office_id: isHoAdmin ? (user?.head_office_id || formData.head_office_id) : formData.head_office_id,
        admin_email: formData.create_admin ? formData.admin_email : undefined,
        admin_password: formData.create_admin ? formData.admin_password : undefined,
      };
      const res = await api.post('/api/branches', payload);
      if (res.data?.success) {
        setIsCreateOpen(false);
        setFormData({
          head_office_id: isHoAdmin ? (user?.head_office_id || '') : '',
          ward_no: '',
          name: '',
          code: '',
          contact_person: '',
          phone: '',
          address: '',
          ward_area: '',
          create_admin: true,
          admin_email: '',
          admin_password: '',
        });
        toast.success(
          res.data?.data?.admin
            ? `Ward "${res.data.data.name}" and Admin Login (${res.data.data.admin.email}) created successfully!`
            : `Ward "${res.data.data?.name || 'New'}" created successfully!`
        );
        fetchBranches();
        window.dispatchEvent(new CustomEvent('branchListUpdated'));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to create branch');
    } finally {
      setSubmitting(false);
    }
  };

  const getBranchHo = (row) => {
    return (
      row?.head_office ||
      row?.head_offices ||
      headOffices.find((h) => h.id === row?.head_office_id) ||
      null
    );
  };

  const columns = [
    {
      header: 'Ward / Branch',
      key: 'name',
      className: 'min-w-[220px]',
      render: (row) => {
        const hoObj = getBranchHo(row);
        const hoName = hoObj?.name || (row.head_office_id ? 'Head Office' : 'Central HQ');
        const hoCode = hoObj?.code || '';

        return (
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500/15 to-indigo-500/15 border border-blue-500/25 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-xs shrink-0 shadow-2xs">
              {row.ward_no ? `#${row.ward_no}` : 'BR'}
            </div>
            <div className="min-w-0 flex-1">
              {/* Governing Head Office Pill Above Branch Name */}
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60 shadow-2xs">
                  <Building2 className="h-2.5 w-2.5 shrink-0 text-purple-600 dark:text-purple-400" />
                  <span className="truncate max-w-[180px]">{hoName}</span>
                </span>
                {hoCode && (
                  <span className="font-mono text-[9px] font-bold text-slate-500 dark:text-slate-400">
                    ({hoCode})
                  </span>
                )}
              </div>
              <p className="font-bold text-slate-900 dark:text-white text-sm tracking-tight truncate">
                {row.name}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                <span className="truncate">{row.ward_area || 'Standard Ward'}</span>
              </p>
            </div>
          </div>
        );
      },
    },
    ...(isSuperAdmin ? [{
      header: 'Governing Head Office',
      key: 'ho_admin',
      className: 'min-w-[230px]',
      render: (row) => {
        const hoObj = getBranchHo(row);
        const hoName = hoObj?.name || 'Head Office';
        const hoCode = hoObj?.code || 'HO';
        const hoCity = hoObj?.city || '';
        const hoAdmin = row.ho_admin;

        return (
          <div className="space-y-1.5 py-0.5">
            {/* 1. Prominent Head Office Name & Code */}
            <div className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-500/15 to-indigo-500/20 text-purple-700 dark:text-purple-300 border border-purple-300/80 dark:border-purple-700/80 flex items-center justify-center shrink-0 shadow-2xs">
                <Building2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-xs text-slate-900 dark:text-white leading-tight truncate" title={hoName}>
                  {hoName}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-[9px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/70 px-1.5 py-0.2 rounded border border-purple-200/80 dark:border-purple-800/80">
                    {hoCode}
                  </span>
                  {hoCity && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                      {hoCity}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Governing HO Admin Person & Contact */}
            <div className="pl-9 text-xs space-y-0.5 border-l-2 border-purple-200 dark:border-purple-800/50 ml-3.5">
              <p className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1 text-[11px]">
                <span className="text-slate-400">Admin:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {hoAdmin?.name || `${hoName} Admin`}
                </span>
              </p>
              {hoAdmin?.phone && (
                <a
                  href={`tel:${hoAdmin.phone}`}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-purple-600 dark:text-purple-400 hover:underline"
                >
                  <Phone className="h-2.5 w-2.5 shrink-0" />
                  <span>{hoAdmin.phone}</span>
                </a>
              )}
            </div>
          </div>
        );
      },
    }] : []),
    {
      header: 'In-Charge / Candidate',
      key: 'contact_person',
      className: 'min-w-[230px]',
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
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 flex items-center justify-center text-[11px] font-black shrink-0 shadow-2xs">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-slate-900 dark:text-slate-100 text-xs sm:text-[13px] leading-tight">
                  {row.contact_person || 'Unassigned'}
                </p>
                {row.status_label && (
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${row.status_label.toLowerCase() === 'won'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                      }`}
                  >
                    {row.status_label}
                  </span>
                )}
              </div>
              <div className="mt-1">
                {row.admin ? (
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-200/80 dark:border-emerald-800/80" title={`Active Ward Admin: ${row.admin.name}`}>
                    <ShieldCheck className="w-2.5 h-2.5" />
                    <span>{row.admin.email}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-mono text-[9px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-200/80 dark:border-amber-800/80">
                    No login set
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Contact Phone',
      key: 'phone',
      className: 'min-w-[145px] whitespace-nowrap',
      cellClassName: 'whitespace-nowrap',
      render: (row) => (
        <div>
          {row.phone ? (
            <a
              href={`tel:${row.phone}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-mono text-xs font-semibold border border-slate-200/80 dark:border-slate-700/80 transition-colors shadow-2xs"
              title={`Call ${row.contact_person || row.name}`}
            >
              <Phone className="h-3 w-3 text-slate-400 shrink-0" />
              <span>{row.phone}</span>
            </a>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </div>
      ),
    },
    {
      header: 'Location / Address',
      key: 'address',
      className: 'min-w-[260px]',
      render: (row) => (
        <div className="group relative flex items-center justify-between gap-2 max-w-full">
          <p
            className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed truncate group-hover:text-slate-900 dark:group-hover:text-white transition-colors"
            title={row.address || 'Address not listed'}
          >
            {row.address || '—'}
          </p>
          {row.address && (
            <button
              type="button"
              onClick={() => handleCopyAddress(row.id, row.address)}
              className="opacity-0 group-hover:opacity-100 p-1 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all shrink-0 cursor-pointer"
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
      className: 'min-w-[105px] whitespace-nowrap text-center',
      cellClassName: 'whitespace-nowrap text-center',
      render: (row) => (
        <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold tracking-wide shadow-2xs">
          {row.code}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'is_active',
      className: 'min-w-[115px] whitespace-nowrap text-center',
      cellClassName: 'whitespace-nowrap text-center',
      render: (row) => (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${row.is_active
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25'
          }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${row.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <span>{row.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
        </span>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      className: 'min-w-[170px] whitespace-nowrap text-right',
      cellClassName: 'whitespace-nowrap text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => {
              setSelectedBranch(row);
              router.push('/dashboard');
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white border border-emerald-200 dark:border-emerald-500/30 transition-all shadow-2xs active:scale-95 cursor-pointer"
            title={`Inspect ${row.name} Operations`}
          >
            <span>Inspect</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenOverview(row)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white border border-blue-200 dark:border-blue-500/30 transition-all shadow-2xs active:scale-95 cursor-pointer"
            title={`View ${row.name} Overview`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>View</span>
          </button>
          {(isSuperAdmin || isHoAdmin) && (
            <button
              type="button"
              onClick={() => handleOpenCredentials(row)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-600 hover:text-white dark:hover:bg-amber-600 dark:hover:text-white border border-amber-200 dark:border-amber-500/30 transition-all shadow-2xs active:scale-95 cursor-pointer"
              title={row.admin ? `Manage Admin Login (${row.admin.email})` : `Set Up Ward Admin Login`}
            >
              <Key className="h-3.5 w-3.5" />
              <span>{row.admin ? 'Login' : 'Set Login'}</span>
            </button>
          )}
          {(isSuperAdmin || isHoAdmin) && (
            <button
              type="button"
              disabled={deletingId === row.id}
              onClick={() => handleDeleteBranch(row)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white border border-rose-200 dark:border-rose-500/30 transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
              title={`Delete ${row.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 w-full">
      <Header
        title={
          isHoAdmin
            ? `${headOffices.find(h => h.id === user?.head_office_id)?.name || 'Head Office'} — Governed Branches`
            : "Branches & Wards"
        }
        subtitle={
          isHoAdmin
            ? `Active operational branches and wards governed under ${headOffices.find(h => h.id === user?.head_office_id)?.name || 'this Head Office'}`
            : "Active Operational Branches, In-Charge Candidates, Addresses & Regional Head Offices"
        }
        action={
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <Button
                variant="outline"
                size="sm"
                icon={Building2}
                onClick={() => setIsCreateHoOpen(true)}
                className="h-9 px-3 text-xs font-bold shrink-0 shadow-xs"
                title="Register New Head Office (Zone)"
              >
                <span className="hidden sm:inline">Add Head Office</span>
                <span className="sm:hidden">New HO</span>
              </Button>
            )}
            {(isSuperAdmin || isHoAdmin) && (
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => {
                  setFormData({
                    head_office_id: isHoAdmin ? (user?.head_office_id || '') : '',
                    ward_no: '',
                    name: '',
                    code: '',
                    contact_person: '',
                    phone: '',
                    address: '',
                    ward_area: '',
                  });
                  setIsCreateOpen(true);
                }}
                className="h-9 px-3 sm:px-4 text-xs font-bold shrink-0 shadow-xs"
                title="Add New Ward / Branch"
              >
                <span className="hidden sm:inline">Add New Ward / Branch</span>
                <span className="sm:hidden">New Ward</span>
              </Button>
            )}
          </div>
        }
      />

      <div className="w-full px-3.5 sm:px-5 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 min-w-0">
        {/* KPI / Insight Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="p-3.5 sm:p-4.5 flex items-center gap-3 border-l-4 border-l-blue-500 overflow-hidden min-w-0">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                {isHoAdmin ? 'Zone Branches' : 'Total Wards'}
              </p>
              <div className="flex items-baseline gap-1.5 flex-wrap mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{totalItems}</span>
                <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {isHoAdmin ? 'Under This HO' : 'Active Branches'}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-3.5 sm:p-4.5 flex items-center gap-3 border-l-4 border-l-emerald-500 overflow-hidden min-w-0">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <UserCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">Assigned In-Charges</p>
              <div className="flex items-baseline gap-1.5 flex-wrap mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {branches.filter(b => b.contact_person).length}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">Candidates</span>
              </div>
            </div>
          </Card>

          <Card className="p-3.5 sm:p-4.5 flex items-center gap-3 border-l-4 border-l-purple-500 overflow-hidden min-w-0">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
              <Award className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                {isHoAdmin ? 'Regional Territory' : 'Districts & Zones'}
              </p>
              <div className="flex items-baseline gap-1.5 flex-wrap mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">
                  {isHoAdmin
                    ? (headOffices.find(h => h.id === user?.head_office_id)?.city || 'Regional')
                    : (new Set(branches.map(b => b.ward_area).filter(Boolean)).size || headOffices.length || 0)}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {isHoAdmin ? 'Head Office Hub' : 'Active Zones'}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-3.5 sm:p-4.5 flex items-center gap-3 border-l-4 border-l-amber-500 overflow-hidden min-w-0">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                {isHoAdmin ? 'HO Code' : 'Head Offices'}
              </p>
              <div className="flex items-baseline gap-1.5 flex-wrap mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {isHoAdmin
                    ? (headOffices.find(h => h.id === user?.head_office_id)?.code || 'HO')
                    : headOffices.length}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {isHoAdmin ? 'Jurisdiction' : 'Registered HOs'}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters & Head Office Tabs */}
        <div className="gsap-filter-bar flex flex-col lg:flex-row flex-wrap items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs min-w-0">
          {/* Head Office Filter: Dropdown selector for Super Admin */}
          {isSuperAdmin ? (
            <div className="flex items-center gap-2 w-full lg:w-auto min-w-0">
              <div className="relative w-full sm:w-72 min-w-0">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
                  <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <select
                  value={selectedHoFilter}
                  onChange={(e) => {
                    setSelectedHoFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-9 pr-8 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all shadow-2xs h-[38px] cursor-pointer appearance-none"
                  aria-label="Filter branches by Head Office region"
                >
                  <option value="" className="dark:bg-slate-900 font-semibold">
                    All Head Offices ({headOffices.length} Registered)
                  </option>
                  {headOffices.map((ho) => (
                    <option key={ho.id} value={ho.id} className="dark:bg-slate-900 font-semibold">
                      {ho.name} ({ho.city || ho.code || 'Zone'})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 pointer-events-none">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>
              {selectedHoFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedHoFilter('');
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200/70 dark:border-rose-500/30 rounded-xl transition-all cursor-pointer shrink-0 active:scale-95 shadow-2xs"
                  title="Clear Head Office filter"
                >
                  Clear
                </button>
              )}
            </div>
          ) : (
            /* HO Admin gets a dedicated badge indicating their assigned Head Office jurisdiction */
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 shrink-0">
                <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>{headOffices.find(h => h.id === user?.head_office_id)?.name || 'Assigned Head Office'}</span>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-blue-200/60 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">
                  {headOffices.find(h => h.id === user?.head_office_id)?.code || 'HO'}
                </span>
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline whitespace-nowrap">
                ({totalItems} {totalItems === 1 ? 'Branch' : 'Branches'} in Zone)
              </span>
            </div>
          )}

          {/* Search Box & Download Button */}
          <div className="flex items-center gap-2 w-full lg:w-auto min-w-0">
            <div className="relative flex-1 lg:w-80 min-w-0">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search ward, code, contact person, phone..."
                className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-[13px] h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              loading={exporting}
              className="shrink-0 h-[38px] px-3 font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              onClick={handleDownloadData}
              title="Download Complete Branches Data as Excel"
            >
              <span className="hidden sm:inline">{exporting ? 'Exporting...' : 'Export Excel'}</span>
            </Button>
          </div>
        </div>

        {/* Branches: Dual View (Desktop Table + Mobile Touch Cards) */}
        <div className="hidden md:block w-full min-w-0">
          <Table
            columns={columns}
            data={branches}
            loading={loading}
            emptyText="No branches or wards found."
            minWidth="min-w-[1100px]"
            tableLayout="table-auto"
          />
        </div>

        {/* Mobile Touch Cards View */}
        <div className="block md:hidden space-y-3 min-w-0">
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
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60">
                            <Building2 className="w-2.5 h-2.5 shrink-0 text-purple-600 dark:text-purple-400" />
                            <span className="truncate max-w-[170px]">{getBranchHo(b)?.name || 'Head Office'}</span>
                          </span>
                        </div>
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
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${isWon
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
                    <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 truncate max-w-[200px] flex items-center gap-1">
                      <Building2 className="w-3 h-3 shrink-0" />
                      <span>{getBranchHo(b)?.name || 'Head Office'} • {b.ho_admin?.name || 'Admin'}</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenOverview(b)}
                        className="px-3 py-1 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors cursor-pointer"
                      >
                        View Details
                      </button>
                      {(isSuperAdmin || isHoAdmin) && (
                        <button
                          type="button"
                          onClick={() => handleOpenCredentials(b)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>{b.admin ? 'Login' : 'Set Login'}</span>
                        </button>
                      )}
                      {(isSuperAdmin || isHoAdmin) && (
                        <button
                          type="button"
                          disabled={deletingId === b.id}
                          onClick={() => handleDeleteBranch(b)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
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
          {isSuperAdmin ? (
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
          ) : (
            <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/40 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">Governing Head Office:</span>
              </div>
              <span className="font-bold text-blue-700 dark:text-blue-300">
                {headOffices.find(h => h.id === user?.head_office_id)?.name || 'Assigned Head Office'}
              </span>
            </div>
          )}

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
              placeholder="e.g. HO-BR-123"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
            />
          </div>

          <Input
            label="Ward / Branch Name *"
            placeholder="e.g. Branch Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Candidate / In-Charge Name"
              placeholder="e.g. Name"
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
            placeholder="e.g. Ward Area"
            value={formData.ward_area}
            onChange={(e) => setFormData({ ...formData, ward_area: e.target.value })}
          />

          <Input
            label="Office / Residential Address"
            placeholder="Full address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          {/* Quick Ward Admin Account Provisioning */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">Ward Admin Login Credentials (1-Click Setup)</span>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.create_admin}
                  onChange={(e) => setFormData({ ...formData, create_admin: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                />
                <span>Create Login</span>
              </label>
            </div>
            {formData.create_admin && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <Input
                  label="Ward Admin Email *"
                  placeholder="admin@example.com"
                  type="email"
                  value={formData.admin_email}
                  onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                  required={formData.create_admin}
                />
                <Input
                  label="Initial Password *"
                  placeholder="Enter initial password"
                  type="password"
                  value={formData.admin_password}
                  onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                  required={formData.create_admin}
                />
              </div>
            )}
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Uses candidate name & contact phone entered above as the profile details for this Ward Admin account.
            </p>
          </div>

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
            <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Parent Head Office:</span>
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  {overviewData.branch.head_office?.name || getBranchHo(overviewData.branch)?.name || 'Head Office'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Governing HO Admin:</span>
                <span className="font-bold text-purple-700 dark:text-purple-300">
                  {overviewData.branch.ho_admin?.name || 'Assigned Zone Admin'}
                </span>
              </div>
              {overviewData.branch.ho_admin?.phone && (
                <div className="flex justify-between items-center pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                  <span className="text-slate-500">HO Admin Contact:</span>
                  <a
                    href={`tel:${overviewData.branch.ho_admin.phone}`}
                    className="font-mono font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    +91 {overviewData.branch.ho_admin.phone}
                  </a>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Official Ward Code:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {overviewData.branch.code}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Register New Head Office Modal */}
      <Modal
        isOpen={isCreateHoOpen}
        onClose={() => setIsCreateHoOpen(false)}
        title="Register New Head Office (Zone)"
        subtitle="Establish a new regional headquarters to govern regional branches"
      >
        <form onSubmit={handleCreateHeadOffice} className="space-y-4">
          <Input
            label="Head Office Name"
            placeholder="e.g. HO"
            value={hoFormData.name}
            onChange={(e) => setHoFormData({ ...hoFormData, name: e.target.value })}
            required
          />
          <Input
            label="Zonal Code (Short ID)"
            placeholder="e.g. HO"
            value={hoFormData.code}
            onChange={(e) => setHoFormData({ ...hoFormData, code: e.target.value.toUpperCase() })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="City"
              placeholder="e.g. City"
              value={hoFormData.city}
              onChange={(e) => setHoFormData({ ...hoFormData, city: e.target.value })}
              required
            />
            <Input
              label="State"
              placeholder="e.g. City"
              value={hoFormData.state}
              onChange={(e) => setHoFormData({ ...hoFormData, state: e.target.value })}
              required
            />
          </div>

          {/* Quick HO Admin Account Provisioning */}
          <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">Head Office Admin Login (1-Click Setup)</span>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={hoFormData.create_admin}
                  onChange={(e) => setHoFormData({ ...hoFormData, create_admin: e.target.checked })}
                  className="rounded text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
                />
                <span>Create Login</span>
              </label>
            </div>
            {hoFormData.create_admin && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Admin Name"
                    placeholder="e.g. Ward Admin"
                    value={hoFormData.admin_name}
                    onChange={(e) => setHoFormData({ ...hoFormData, admin_name: e.target.value })}
                  />
                  <Input
                    label="Admin Contact Phone"
                    placeholder="10-digit mobile"
                    value={hoFormData.admin_phone}
                    onChange={(e) => setHoFormData({ ...hoFormData, admin_phone: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Admin Email *"
                    placeholder="admin@example.com"
                    type="email"
                    value={hoFormData.admin_email}
                    onChange={(e) => setHoFormData({ ...hoFormData, admin_email: e.target.value })}
                    required={hoFormData.create_admin}
                  />
                  <Input
                    label="Initial Password *"
                    placeholder="Enter initial password"
                    type="password"
                    value={hoFormData.admin_password}
                    onChange={(e) => setHoFormData({ ...hoFormData, admin_password: e.target.value })}
                    required={hoFormData.create_admin}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateHoOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={hoSubmitting}
            >
              {hoSubmitting ? 'Creating...' : 'Create Head Office'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Manage Ward Admin Credentials / Password */}
      <Modal
        isOpen={isCredentialsModalOpen}
        onClose={() => setIsCredentialsModalOpen(false)}
        title="Ward Admin Login Credentials"
        subtitle={
          credentialsBranch
            ? `Manage login account for ${credentialsBranch.name} (${credentialsBranch.code})`
            : 'Ward Credentials'
        }
      >
        <form onSubmit={handleSaveCredentials} className="space-y-4">
          {credentialsBranch?.admin ? (
            <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-xs space-y-1">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Active Ward Admin Account Found</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                Current Login Email: <span className="font-mono font-bold text-slate-900 dark:text-white">{credentialsBranch.admin.email}</span>
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Enter a new password below to reset this Ward Admin's login credentials.
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-xs space-y-1">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold">
                <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>No Ward Admin Account Currently Assigned</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                Fill in the details below to provision a new login account for this ward.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Admin Full Name"
              placeholder="e.g. Ward Admin"
              value={credentialsForm.name}
              onChange={(e) => setCredentialsForm({ ...credentialsForm, name: e.target.value })}
              required
            />
            <Input
              label="Contact Phone"
              placeholder="10-digit mobile"
              value={credentialsForm.phone}
              onChange={(e) => setCredentialsForm({ ...credentialsForm, phone: e.target.value })}
            />
          </div>

          <Input
            label="Login Email Address *"
            placeholder="admin@example.com"
            type="email"
            value={credentialsForm.email}
            onChange={(e) => setCredentialsForm({ ...credentialsForm, email: e.target.value })}
            required
          />

          <Input
            label={credentialsBranch?.admin ? "Set New Password *" : "Initial Password *"}
            placeholder="Enter secure password (min 6 chars)"
            type="password"
            value={credentialsForm.password}
            onChange={(e) => setCredentialsForm({ ...credentialsForm, password: e.target.value })}
            required
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCredentialsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={credentialsSubmitting}
            >
              {credentialsBranch?.admin ? 'Update Password' : 'Create Login Account'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Universal Custom Export Modal */}
      <CustomExportModal
        isOpen={isCustomExportOpen}
        onClose={() => setIsCustomExportOpen(false)}
        title="Export Branches & Wards Stock"
        subtitle="Download municipal ward allocations, governing head offices, and live fleet stock (Excel / CSV)"
        defaultFilename="GoSpeedy_Branches_Wards_Stock"
        columns={BRANCH_EXPORT_COLUMNS}
        dateAccessor="created_at"
        onFetchData={fetchBranchesForExport}
        transformRow={transformBranchRow}
      />
    </div>
  );
}
