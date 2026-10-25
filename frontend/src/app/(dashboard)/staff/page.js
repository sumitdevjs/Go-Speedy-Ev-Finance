'use client';

import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, Key, UserX, AlertCircle, Pencil, MapPin, Building2, Download, CheckCircle2, FileText, RotateCcw, Filter, Shield } from 'lucide-react';
import Header from '../../../components/layout/Header';
import Table from '../../../components/ui/Table';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Modal from '../../../components/ui/Modal';
import Badge from '../../../components/ui/Badge';
import Pagination from '../../../components/ui/Pagination';
import SearchBar from '../../../components/ui/SearchBar';
import FileUpload from '../../../components/ui/FileUpload';
import ProtectedRoute from '../../../components/layout/ProtectedRoute';
import api from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import { formatDate } from '../../../lib/constants';
import { toast } from '../../../lib/toast';
import { confirmDialog } from '../../../lib/confirmDialog';
import { staggerFadeIn } from '../../../lib/gsap';
import { exportToExcel, fetchAllForExport } from '../../../lib/exportToExcel';
import CustomExportModal from '../../../components/ui/CustomExportModal';

const ROLE_OPTIONS = [
  { value: 'staff', label: 'Staff / Field Operator (Ward Fleet & Collections)' },
  { value: 'branch_admin', label: 'Branch Admin (Ward Manager)' },
  { value: 'ho_admin', label: 'Head Office Admin (City Hub Manager)' },
  { value: 'super_admin', label: 'Super Admin (Global Master Control)' },
];

export default function StaffPage() {
  const { user: currentUser, role: currentRole, selectedBranch } = useAuthStore();
  const isSuperAdmin = currentRole === 'super_admin' || currentRole === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'admin';
  const isHoAdmin = currentRole === 'ho_admin' || currentUser?.role === 'ho_admin';
  const isBranchAdmin = currentRole === 'branch_admin' || currentUser?.role === 'branch_admin';
  const roleOptions = isHoAdmin
    ? ROLE_OPTIONS.filter((o) => o.value === 'staff' || o.value === 'branch_admin')
    : ROLE_OPTIONS;

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('true');
  const [selectedHoFilter, setSelectedHoFilter] = useState(isHoAdmin ? (currentUser?.head_office_id || '') : '');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState(selectedBranch?.id || '');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isCustomExportOpen, setIsCustomExportOpen] = useState(false);

  const [headOffices, setHeadOffices] = useState([]);
  const [branches, setBranches] = useState([]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [wardArea, setWardArea] = useState('');
  const [headOfficeId, setHeadOfficeId] = useState(isHoAdmin ? (currentUser?.head_office_id || '') : '');
  const [branchId, setBranchId] = useState('');
  const [verificationDoc, setVerificationDoc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [editingStaff, setEditingStaff] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('staff');
  const [editWardArea, setEditWardArea] = useState('');
  const [editHeadOfficeId, setEditHeadOfficeId] = useState('');
  const [editBranchId, setEditBranchId] = useState('');
  const [editVerificationDoc, setEditVerificationDoc] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  const [passwordModalUser, setPasswordModalUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState('');

  const fetchDropdowns = async () => {
    try {
      const [hoRes, brRes] = await Promise.all([
        api.get(`/api/head-offices/dropdown?t=${Date.now()}`).catch(() => ({ data: { data: [] } })),
        api.get(`/api/branches/dropdown?t=${Date.now()}`).catch(() => ({ data: { data: [] } })),
      ]);
      if (hoRes.data?.success) setHeadOffices(hoRes.data.data || []);
      if (brRes.data?.success) setBranches(brRes.data.data || []);
    } catch (err) {}
  };

  useEffect(() => {
    fetchDropdowns();

    const handleListUpdates = () => {
      fetchDropdowns();
    };

    window.addEventListener('branchListUpdated', handleListUpdates);
    window.addEventListener('headOfficeListUpdated', handleListUpdates);
    return () => {
      window.removeEventListener('branchListUpdated', handleListUpdates);
      window.removeEventListener('headOfficeListUpdated', handleListUpdates);
    };
  }, []);

  useEffect(() => {
    if (isAddModalOpen || editingStaff) {
      fetchDropdowns();
    }
  }, [isAddModalOpen, editingStaff]);

  useEffect(() => {
    if (isHoAdmin && currentUser?.head_office_id) {
      setSelectedHoFilter(currentUser.head_office_id);
    }
  }, [isHoAdmin, currentUser?.head_office_id]);

  useEffect(() => {
    const handleBranchChange = (e) => {
      if (e.detail?.id) {
        setSelectedBranchFilter(e.detail.id);
        if (e.detail.head_office_id && !isHoAdmin) {
          setSelectedHoFilter(e.detail.head_office_id);
        }
      } else {
        setSelectedBranchFilter('');
      }
      setPage(1);
    };
    window.addEventListener('branchChange', handleBranchChange);
    return () => window.removeEventListener('branchChange', handleBranchChange);
  }, [isHoAdmin]);

  useEffect(() => {
    fetchStaff();
  }, [search, activeFilter, selectedHoFilter, selectedBranchFilter, roleFilter, page, selectedBranch]);

  useEffect(() => {
    staggerFadeIn('.gsap-filter-bar', { y: 14, duration: 0.45, stagger: 0 });
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      let query = `/api/staff?page=${page}&limit=15`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (activeFilter !== '') query += `&is_active=${activeFilter}`;
      if (selectedHoFilter) query += `&head_office_id=${encodeURIComponent(selectedHoFilter)}`;
      if (selectedBranchFilter) query += `&branch_id=${encodeURIComponent(selectedBranchFilter)}`;
      if (roleFilter) query += `&role=${encodeURIComponent(roleFilter)}`;

      const res = await api.get(query);
      if (res.data?.success) {
        setStaffList(res.data.data || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalRecords(res.data.pagination?.totalItems || 0);
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const STAFF_EXPORT_COLUMNS = [
    'Staff Name',
    'Phone Number',
    'Email Address',
    'Role',
    'System Role Code',
    'Head Office / Zone',
    'Head Office City',
    'Assigned Branch / Ward',
    'Ward Number',
    'Branch Code',
    'Ward Area / Location',
    'Verification Document',
    'Account Status',
    'Created On',
    'Last Updated'
  ];

  const fetchStaffForExport = async () => {
    const params = {};
    if (search) params.search = search;
    if (activeFilter !== '') params.is_active = activeFilter;
    if (selectedHoFilter) params.head_office_id = selectedHoFilter;
    if (selectedBranchFilter) params.branch_id = selectedBranchFilter;
    if (roleFilter) params.role = roleFilter;
    return await fetchAllForExport(api, '/api/staff', params, 250);
  };

  const transformStaffRow = (user) => {
    const hoName = user.head_offices?.name
      ? `${user.head_offices.name}${user.head_offices.city ? ` (${user.head_offices.city})` : ''}`
      : '—';
    const branchLabel = user.branches
      ? (user.branches.ward_no ? `Ward ${user.branches.ward_no}: ${user.branches.name}` : user.branches.name)
      : (user.ward_area ? `${user.ward_area} Ward` : '—');

    return {
      'Staff Name': user.name || '—',
      'Phone Number': user.phone || '—',
      'Email Address': user.email || '—',
      'Role': user.display_role || ROLE_OPTIONS.find((r) => r.value === user.role)?.label || user.role,
      'System Role Code': user.role || '—',
      'Head Office / Zone': hoName,
      'Head Office City': user.head_offices?.city || '—',
      'Assigned Branch / Ward': branchLabel,
      'Ward Number': user.branches?.ward_no || '—',
      'Branch Code': user.branches?.code || '—',
      'Ward Area / Location': user.branches?.ward_area || user.ward_area || '—',
      'Verification Document': user.verification_doc || 'Not provided',
      'Account Status': user.is_active ? 'Active' : 'Deactivated',
      'Created On': formatDate(user.created_at),
      'Last Updated': formatDate(user.updated_at),
      created_at: user.created_at,
    };
  };

  const filteredBranches = branches.filter((b) => {
    if (isHoAdmin) {
      return b.head_office_id === currentUser?.head_office_id;
    }
    if (!selectedHoFilter) return true;
    return b.head_office_id === selectedHoFilter;
  });

  const handleHoFilterChange = (hoId) => {
    setSelectedHoFilter(hoId);
    setPage(1);
    if (hoId && selectedBranchFilter) {
      const match = branches.find((b) => b.id === selectedBranchFilter);
      if (match && match.head_office_id !== hoId) {
        setSelectedBranchFilter('');
      }
    }
  };

  const handleBranchFilterChange = (brId) => {
    setSelectedBranchFilter(brId);
    setPage(1);
    if (brId && !selectedHoFilter && !isHoAdmin) {
      const match = branches.find((b) => b.id === brId);
      if (match?.head_office_id) {
        setSelectedHoFilter(match.head_office_id);
      }
    }
  };

  const hasActiveFilters = Boolean(
    search ||
    activeFilter !== 'true' ||
    (selectedHoFilter && !isHoAdmin) ||
    selectedBranchFilter ||
    roleFilter
  );

  const handleResetFilters = () => {
    setSearch('');
    setActiveFilter('true');
    if (!isHoAdmin) setSelectedHoFilter('');
    setSelectedBranchFilter('');
    setRoleFilter('');
    setPage(1);
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !phone.trim() || !email.trim() || !password) {
      setError('Name, phone, email, and password are required');
      return;
    }

    if (!/^\d{10}$/.test(phone.trim())) {
      setError('Phone number must be exactly 10 digits');
      return;
    }
    
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;
    if (!passwordRegex.test(password)) {
      setError('Password must be at least 6 characters, contain 1 uppercase, 1 number, and 1 special character.');
      return;
    }

    try {
      setIsSubmitting(true);
      const effectiveHoId = isHoAdmin ? (currentUser?.head_office_id || null) : (headOfficeId || null);
      const res = await api.post('/api/staff', {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        password,
        role,
        ward_area: wardArea.trim() || null,
        head_office_id: effectiveHoId,
        branch_id: branchId || null,
        verification_doc: verificationDoc.trim() || null,
      });

      if (res.data?.success) {
        setIsAddModalOpen(false);
        setName('');
        setPhone('');
        setEmail('');
        setPassword('');
        setWardArea('');
        setHeadOfficeId('');
        setBranchId('');
        setVerificationDoc('');
        toast.success('Staff member registered.');
        fetchStaff();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create staff member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (staffMember) => {
    setEditingStaff(staffMember);
    setEditName(staffMember.name || '');
    setEditPhone(staffMember.phone || '');
    setEditEmail(staffMember.email || '');
    setEditRole(staffMember.role || 'staff');
    setEditWardArea(staffMember.ward_area || '');
    setEditHeadOfficeId(staffMember.head_office_id || '');
    setEditBranchId(staffMember.branch_id || '');
    setEditVerificationDoc(staffMember.verification_doc || '');
    setEditError('');
  };

  const isEditingSelf = editingStaff?.id === currentUser?.id;

  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    setEditError('');

    const isSelfWardAdmin = isEditingSelf && isBranchAdmin;

    if (isSelfWardAdmin) {
      try {
        setEditSubmitting(true);
        const res = await api.patch(`/api/staff/${editingStaff.id}`, {
          verification_doc: editVerificationDoc.trim() || null,
        });
        if (res.data?.success) {
          setEditingStaff(null);
          toast.success('Your verification document has been updated.');
          fetchStaff();
        }
      } catch (err) {
        setEditError(err.response?.data?.message || 'Failed to update document');
      } finally {
        setEditSubmitting(false);
      }
      return;
    }

    if (!editName.trim() || !editPhone.trim() || !editEmail.trim()) {
      setEditError('Name, phone, and email are required');
      return;
    }

    if (!/^\d{10}$/.test(editPhone.trim())) {
      setEditError('Phone number must be exactly 10 digits');
      return;
    }

    try {
      setEditSubmitting(true);
      const effectiveHoId = isHoAdmin ? (currentUser?.head_office_id || null) : (editHeadOfficeId || null);
      const payload = {
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim() || null,
        ward_area: editWardArea.trim() || null,
        head_office_id: effectiveHoId,
        branch_id: editBranchId || null,
        verification_doc: editVerificationDoc.trim() || null,
      };
      if (!isEditingSelf) {
        payload.role = editRole;
      }

      const res = await api.patch(`/api/staff/${editingStaff.id}`, payload);
      if (res.data?.success) {
        setEditingStaff(null);
        toast.success(`${editName.trim()}'s details updated.`);
        fetchStaff();
      }
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update staff member');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleToggleDeactivate = async (staffMember) => {
    if (staffMember.id === currentUser?.id) {
      toast.warning('You cannot deactivate your own account.');
      return;
    }

    const action = staffMember.is_active ? 'deactivate' : 'activate';
    const ok = await confirmDialog({
      title: `${action === 'deactivate' ? 'Deactivate' : 'Activate'} ${staffMember.name}?`,
      message:
        action === 'deactivate'
          ? 'They will immediately lose access to the dashboard.'
          : 'They will regain access to the dashboard.',
      tone: action === 'deactivate' ? 'danger' : 'default',
      confirmLabel: action === 'deactivate' ? 'Deactivate' : 'Activate',
    });
    if (!ok) return;

    try {
      if (staffMember.is_active) {
        await api.patch(`/api/staff/${staffMember.id}/deactivate`, { is_active: false });
      } else {
        await api.patch(`/api/staff/${staffMember.id}/deactivate`, { is_active: true });
      }
      toast.success(`${staffMember.name} ${action === 'deactivate' ? 'deactivated' : 'activated'}.`);
      fetchStaff();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} account`);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;
    if (!newPassword || !passwordRegex.test(newPassword)) {
      setResetError('Password must be at least 6 characters, contain 1 uppercase, 1 number, and 1 special character.');
      return;
    }

    try {
      setResetSubmitting(true);
      await api.patch(`/api/staff/${passwordModalUser.id}/password`, {
        password: newPassword,
      });
      setPasswordModalUser(null);
      setNewPassword('');
      toast.success('Password updated successfully.');
    } catch (err) {
      setResetError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setResetSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Staff Name',
      key: 'name',
      render: (row) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-white">{row.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{row.email || 'No email'}</p>
        </div>
      ),
    },
    {
      header: 'Mobile Phone',
      key: 'phone',
      render: (row) => <span className="font-semibold text-slate-700 dark:text-slate-300">{row.phone}</span>,
    },
    {
      header: 'System Role',
      key: 'role',
      render: (row) => {
        const isMaster = row.role === 'super_admin' || (row.role === 'admin' && !row.ward_area);
        if (isMaster) {
          return <Badge status="Super Admin" variant="purple" size="sm" />;
        }
        if (row.role === 'ho_admin' || row.display_role === 'Head Office Admin') {
          return <Badge status="Head Office Admin" variant="indigo" size="sm" />;
        }
        if (row.role === 'staff' || row.display_role === 'Staff') {
          return <Badge status="Staff" variant="slate" size="sm" />;
        }
        return <Badge status="Ward Admin" variant="blue" size="sm" />;
      },
    },
    {
      header: 'Assigned Branch / Ward',
      key: 'branch',
      render: (row) => {
        const isMaster = row.role === 'super_admin' || (row.role === 'admin' && !row.ward_area);
        if (isMaster) {
          return (
            <div className="flex items-center gap-1.5 font-semibold text-xs text-indigo-400">
              <MapPin className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <span>All Wards (Global Master)</span>
            </div>
          );
        }
        if (row.role === 'ho_admin' || row.display_role === 'Head Office Admin') {
          const hoName = row.head_offices?.name || row.head_office?.name || headOffices.find(h => h.id === row.head_office_id)?.name || 'Head Office';
          return (
            <div className="flex items-center gap-1.5 font-semibold text-xs text-indigo-600 dark:text-indigo-400">
              <Building2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>{hoName} (Zone HQ)</span>
            </div>
          );
        }
        const branchLabel = row.branches
          ? (row.branches.ward_no ? `Ward ${row.branches.ward_no}: ${row.branches.name}` : row.branches.name)
          : (row.ward_area ? `${row.ward_area} Ward` : 'Central Branch');
        return (
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800 dark:text-slate-200">
              <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>{branchLabel}</span>
            </div>
            {row.branches?.ward_area && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-5">
                {row.branches.ward_area}
              </p>
            )}
          </div>
        );
      },
    },
    {
      header: 'Verification Document',
      key: 'verification_doc',
      render: (row) => (
        <div>
          {row.verification_doc ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="truncate max-w-[140px]">{row.verification_doc.split('/').pop()}</span>
            </span>
          ) : (
            <span className="text-xs text-slate-400 italic">Not provided</span>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'is_active',
      className: 'whitespace-nowrap text-center',
      cellClassName: 'whitespace-nowrap text-center',
      render: (row) => (
        <Badge
          status={row.is_active ? 'Active' : 'Deactivated'}
          variant={row.is_active ? 'emerald' : 'rose'}
          size="sm"
        />
      ),
    },
    {
      header: 'Created / Updated',
      key: 'dates',
      className: 'whitespace-nowrap',
      cellClassName: 'whitespace-nowrap',
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
      className: 'whitespace-nowrap text-right',
      cellClassName: 'whitespace-nowrap text-right',
      render: (row) => {
        const isRowSelf = row.id === currentUser?.id;

        let showEdit = false;
        if (isSuperAdmin) {
          showEdit = true;
        } else if (isHoAdmin) {
          showEdit = !isRowSelf && (row.role === 'branch_admin' || row.role === 'staff');
        } else if (isBranchAdmin) {
          showEdit = isRowSelf || row.role === 'staff';
        }

        let showPasswordReset = false;
        if (isSuperAdmin) {
          showPasswordReset = true;
        } else if (isHoAdmin) {
          showPasswordReset = !isRowSelf && (row.role === 'branch_admin' || row.role === 'staff');
        } else if (isBranchAdmin) {
          showPasswordReset = !isRowSelf && row.role === 'staff';
        }

        return (
          <div className="flex items-center justify-end gap-2">
            {showEdit && (
              <Button
                variant="outline"
                size="sm"
                icon={Pencil}
                onClick={() => openEditModal(row)}
              >
                {isRowSelf && isBranchAdmin ? 'My Document' : 'Edit'}
              </Button>
            )}

            {showPasswordReset && (
              <Button
                variant="outline"
                size="sm"
                icon={Key}
                onClick={() => {
                  setPasswordModalUser(row);
                  setNewPassword('');
                  setResetError('');
                }}
              >
                Password
              </Button>
            )}

            {!isRowSelf && isSuperAdmin && (
              <Button
                variant={row.is_active ? 'danger' : 'success'}
                size="sm"
                onClick={() => handleToggleDeactivate(row)}
              >
                {row.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <ProtectedRoute adminOnly={true}>
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <Header
        title="Staff & Operator Management"
        subtitle="Admin controls for role assignments and credentials"
        action={
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setIsAddModalOpen(true)}
            className="h-9 px-3 sm:px-3.5 text-xs font-bold shrink-0 shadow-xs"
            title="Add New Staff"
          >
            <span className="hidden sm:inline">Add New Staff</span>
            <span className="sm:hidden">Staff</span>
          </Button>
        }
      />

      <div className="w-full px-3.5 sm:px-5 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="gsap-filter-bar flex flex-col gap-3.5 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 card-elevation shadow-xs dark:shadow-[0_8px_30px_rgb(0,0,0,0.35)] transition-colors">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex w-full sm:max-w-md sm:flex-1 min-w-0 gap-2 items-center">
              <SearchBar
                value={search}
                onChange={(val) => {
                  setSearch(val);
                  setPage(1);
                }}
                placeholder="Search name, phone or email..."
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                icon={Download}
                className="shrink-0 h-[42px] px-3 font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                onClick={() => setIsCustomExportOpen(true)}
                title="Custom Export Staff Records (Excel / CSV)"
              >
                <span className="hidden sm:inline">Export</span>
              </Button>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="self-end sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200/70 dark:border-rose-500/30 rounded-xl transition-all cursor-pointer active:scale-95 shadow-2xs"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 dark:border-white/5">
            {!isHoAdmin ? (
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
                  <Building2 className="w-4 h-4" />
                </div>
                <select
                  value={selectedHoFilter}
                  onChange={(e) => handleHoFilterChange(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors shadow-2xs"
                >
                  <option value="" className="dark:bg-slate-900">All Head Offices (Zone)</option>
                  {headOffices.map((ho) => (
                    <option key={ho.id} value={ho.id} className="dark:bg-slate-900">
                      {ho.name} ({ho.city || ho.code})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="h-[38px] px-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/40 text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2 truncate shadow-2xs">
                <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="truncate">
                  {headOffices.find((h) => h.id === currentUser?.head_office_id)?.name || 'Assigned Head Office'}
                </span>
              </div>
            )}

            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
                <MapPin className="w-4 h-4" />
              </div>
              <select
                value={selectedBranchFilter}
                onChange={(e) => handleBranchFilterChange(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors shadow-2xs"
              >
                <option value="" className="dark:bg-slate-900">
                  {selectedHoFilter ? 'All Wards in Selected HO' : 'All Wards & Branches'}
                </option>
                {filteredBranches.map((b) => (
                  <option key={b.id} value={b.id} className="dark:bg-slate-900">
                    {b.ward_no ? `Ward ${b.ward_no}: ${b.name}` : b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
                <Shield className="w-4 h-4" />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors shadow-2xs"
              >
                <option value="" className="dark:bg-slate-900">All Roles</option>
                <option value="staff" className="dark:bg-slate-900">Staff / Field Operator</option>
                <option value="branch_admin" className="dark:bg-slate-900">Branch Admin (Ward)</option>
                {!isHoAdmin && <option value="ho_admin" className="dark:bg-slate-900">Head Office Admin</option>}
                {!isHoAdmin && <option value="super_admin" className="dark:bg-slate-900">Super Admin</option>}
              </select>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
                <UserCheck className="w-4 h-4" />
              </div>
              <select
                value={activeFilter}
                onChange={(e) => {
                  setActiveFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors shadow-2xs"
              >
                <option value="true" className="dark:bg-slate-900">Active Accounts</option>
                <option value="" className="dark:bg-slate-900">All Status (Active + Inactive)</option>
                <option value="false" className="dark:bg-slate-900">Deactivated Only</option>
              </select>
            </div>
          </div>
        </div>

        <Table
          columns={columns}
          data={staffList}
          loading={loading}
          emptyText={
            hasActiveFilters
              ? "No staff members match the selected filter criteria."
              : isHoAdmin
                ? "No branch admins or staff registered under this Head Office yet."
                : "No staff members registered."
          }
          minWidth="min-w-[920px]"
        />

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalRecords}
          onPageChange={setPage}
        />
      </div>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Staff Member"
        subtitle="Create an operator account for Delhi hub collections and registrations"
      >
        <form onSubmit={handleCreateStaff} className="space-y-4" autoComplete="off">
          {error && (
            <div className="rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Full Name"
            placeholder="e.g. Gurpreet Singh"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Phone Number"
            placeholder="10-digit mobile number"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            maxLength={10}
            inputMode="numeric"
            required
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="staff@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Initial Password"
            type="password"
            placeholder="Min 6 chars, 1 uppercase, 1 number, 1 special char"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Select
            label="Role Privilege"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            options={roleOptions}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!isHoAdmin ? (
              <Select
                label="Head Office"
                value={headOfficeId}
                onChange={(e) => {
                  setHeadOfficeId(e.target.value);
                  if (e.target.value && branchId) {
                    const br = branches.find(b => b.id === branchId);
                    if (br && br.head_office_id !== e.target.value) setBranchId('');
                  }
                }}
                options={[
                  { value: '', label: 'Select Head Office (Optional)' },
                  ...headOffices.map((ho) => ({ value: ho.id, label: `${ho.name} (${ho.city})` })),
                ]}
              />
            ) : (
              <div className="p-2.5 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/40 text-xs flex flex-col justify-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Head Office Hub</span>
                <span className="font-bold text-blue-700 dark:text-blue-300 truncate">
                  {headOffices.find(h => h.id === currentUser?.head_office_id)?.name || 'Assigned Head Office'}
                </span>
              </div>
            )}

            <Select
              label="Assigned Ward / Branch"
              value={branchId}
              onChange={(e) => {
                const bId = e.target.value;
                setBranchId(bId);
                if (bId) {
                  const br = branches.find((b) => b.id === bId);
                  if (br?.head_office_id && !headOfficeId && !isHoAdmin) {
                    setHeadOfficeId(br.head_office_id);
                  }
                }
              }}
              options={[
                { value: '', label: 'Select Ward / Branch (Optional)' },
                ...branches
                  .filter((b) => isHoAdmin ? b.head_office_id === currentUser?.head_office_id : (!headOfficeId || b.head_office_id === headOfficeId))
                  .map((b) => ({
                    value: b.id,
                    label: b.ward_no ? `Ward ${b.ward_no}: ${b.name} (${b.code})` : `${b.name} (${b.code})`,
                  })),
              ]}
            />
          </div>

          <Input
            label="Ward / Area Notes"
            placeholder="e.g. Rohini Sector 7 Hub"
            value={wardArea}
            onChange={(e) => setWardArea(e.target.value)}
          />

          <div>
            <FileUpload
              label="Verification Document"
              docType="verification_doc"
              currentPath={verificationDoc}
              onUploaded={(path) => setVerificationDoc(path)}
              accept="image/*,application/pdf"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Add verified doc like Aadhaar, PAN etc. Compressed automatically to save storage.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
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
              Create Account
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(editingStaff)}
        onClose={() => setEditingStaff(null)}
        title={`Edit ${editingStaff?.name || 'Staff Member'}`}
        subtitle="Update contact details or change their system role and ward assignment"
      >
        <form onSubmit={handleUpdateStaff} className="space-y-4" autoComplete="off">
          {editError && (
            <div className="rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          {isEditingSelf && isBranchAdmin && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Ward Admin Notice</p>
                <p className="text-[11px] mt-0.5">
                  You can only upload/update your personal Verification Document. Name, phone number, login email, and assigned ward can only be modified by Head Office or Super Admin.
                </p>
              </div>
            </div>
          )}

          <Input
            label="Full Name"
            placeholder="e.g. Gurpreet Singh"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            disabled={isEditingSelf && isBranchAdmin}
            required={!(isEditingSelf && isBranchAdmin)}
          />

          <Input
            label="Phone Number"
            placeholder="10-digit mobile number"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            maxLength={10}
            inputMode="numeric"
            disabled={isEditingSelf && isBranchAdmin}
            required={!(isEditingSelf && isBranchAdmin)}
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="staff@example.com"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            disabled={isEditingSelf && isBranchAdmin}
            required={!(isEditingSelf && isBranchAdmin)}
          />

          <div>
            <Select
              label="Role Privilege"
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              options={roleOptions}
              disabled={isEditingSelf}
            />
            {isEditingSelf && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                You can&apos;t change your own role — ask another admin to do it.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!isHoAdmin ? (
              <Select
                label="Head Office"
                value={editHeadOfficeId}
                disabled={isEditingSelf && isBranchAdmin}
                onChange={(e) => {
                  setEditHeadOfficeId(e.target.value);
                  if (e.target.value && editBranchId) {
                    const br = branches.find(b => b.id === editBranchId);
                    if (br && br.head_office_id !== e.target.value) setEditBranchId('');
                  }
                }}
                options={[
                  { value: '', label: 'Select Head Office (Optional)' },
                  ...headOffices.map((ho) => ({ value: ho.id, label: `${ho.name} (${ho.city})` })),
                ]}
              />
            ) : (
              <div className="p-2.5 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/40 text-xs flex flex-col justify-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Head Office Hub</span>
                <span className="font-bold text-blue-700 dark:text-blue-300 truncate">
                  {headOffices.find(h => h.id === currentUser?.head_office_id)?.name || 'Assigned Head Office'}
                </span>
              </div>
            )}

            <Select
              label="Assigned Ward / Branch"
              value={editBranchId}
              disabled={isEditingSelf && isBranchAdmin}
              onChange={(e) => {
                const bId = e.target.value;
                setEditBranchId(bId);
                if (bId) {
                  const br = branches.find((b) => b.id === bId);
                  if (br?.head_office_id && !editHeadOfficeId && !isHoAdmin) {
                    setEditHeadOfficeId(br.head_office_id);
                  }
                }
              }}
              options={[
                { value: '', label: 'Select Ward / Branch (Optional)' },
                ...branches
                  .filter((b) => isHoAdmin ? b.head_office_id === currentUser?.head_office_id : (!editHeadOfficeId || b.head_office_id === editHeadOfficeId))
                  .map((b) => ({
                    value: b.id,
                    label: b.ward_no ? `Ward ${b.ward_no}: ${b.name} (${b.code})` : `${b.name} (${b.code})`,
                  })),
              ]}
            />
          </div>

          <Input
            label="Ward / Area Notes"
            placeholder="e.g. Rohini Sector 7 Hub"
            value={editWardArea}
            disabled={isEditingSelf && isBranchAdmin}
            onChange={(e) => setEditWardArea(e.target.value)}
          />

          <div>
            <FileUpload
              label="Verification Document"
              docType="verification_doc"
              currentPath={editVerificationDoc}
              onUploaded={(path) => setEditVerificationDoc(path)}
              accept="image/*,application/pdf"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Add verified doc like Aadhaar, PAN etc. Compressed automatically to save storage.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
            <Button
              variant="outline"
              size="md"
              onClick={() => setEditingStaff(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={editSubmitting}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(passwordModalUser)}
        onClose={() => setPasswordModalUser(null)}
        title={`Reset Password for ${passwordModalUser?.name}`}
        subtitle="Assign a new secure login password"
      >
        <form onSubmit={handleResetPassword} className="space-y-4" autoComplete="off">
          {resetError && (
            <div className="rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{resetError}</span>
            </div>
          )}

          <Input
            label="New Password"
            type="password"
            placeholder="Min 6 chars, 1 uppercase, 1 number, 1 special char"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
            <Button
              variant="outline"
              size="md"
              onClick={() => setPasswordModalUser(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={resetSubmitting}
            >
              Update Password
            </Button>
          </div>
        </form>
      </Modal>

      <CustomExportModal
        isOpen={isCustomExportOpen}
        onClose={() => setIsCustomExportOpen(false)}
        title="Export Staff & Operators Directory"
        subtitle="Download staff roster, assigned branches/wards, and system permissions (Excel / CSV)"
        defaultFilename="GoSpeedy_Staff_Directory"
        columns={STAFF_EXPORT_COLUMNS}
        dateAccessor="created_at"
        onFetchData={fetchStaffForExport}
        transformRow={transformStaffRow}
      />
    </div>
    </ProtectedRoute>
  );
}
