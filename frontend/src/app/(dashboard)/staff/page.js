'use client';

import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, Key, UserX, AlertCircle, Pencil } from 'lucide-react';
import Header from '../../../components/layout/Header';
import Table from '../../../components/ui/Table';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Modal from '../../../components/ui/Modal';
import Badge from '../../../components/ui/Badge';
import Pagination from '../../../components/ui/Pagination';
import SearchBar from '../../../components/ui/SearchBar';
import ProtectedRoute from '../../../components/layout/ProtectedRoute';
import api from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import { formatDate } from '../../../lib/constants';
import { toast } from '../../../lib/toast';
import { confirmDialog } from '../../../lib/confirmDialog';
import { staggerFadeIn } from '../../../lib/gsap';

const ROLE_OPTIONS = [
  { value: 'staff', label: 'Staff / Operator (Fleet & Collections)' },
  { value: 'admin', label: 'Administrator (Full System Control)' },
];

export default function StaffPage() {
  const { user: currentUser } = useAuthStore();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('true'); // '' | 'true' | 'false'
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Add Staff Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [wardArea, setWardArea] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Edit Staff Modal
  const [editingStaff, setEditingStaff] = useState(null); // the row being edited, or null
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('staff');
  const [editWardArea, setEditWardArea] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  // Password Reset Modal
  const [passwordModalUser, setPasswordModalUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState('');

  useEffect(() => {
    fetchStaff();
  }, [search, activeFilter, page]);

  // One-time entrance animation for the filter bar
  useEffect(() => {
    staggerFadeIn('.gsap-filter-bar', { y: 14, duration: 0.45, stagger: 0 });
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      let query = `/api/staff?page=${page}&limit=15`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (activeFilter !== '') query += `&is_active=${activeFilter}`;
      const res = await api.get(query);
      if (res.data?.success) {
        setStaffList(res.data.data || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalRecords(res.data.pagination?.totalItems || 0);
      }
    } catch (err) {
      console.error('Failed to load staff:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !phone.trim() || !password) {
      setError('Name, phone, and password are required');
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
      const res = await api.post('/api/staff', {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        password,
        role,
        ward_area: wardArea.trim() || null,
      });

      if (res.data?.success) {
        setIsAddModalOpen(false);
        setName('');
        setPhone('');
        setEmail('');
        setPassword('');
        setWardArea('');
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
    setEditError('');
  };

  const isEditingSelf = editingStaff?.id === currentUser?.id;

  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    setEditError('');

    if (!editName.trim() || !editPhone.trim()) {
      setEditError('Name and phone are required');
      return;
    }

    if (!/^\d{10}$/.test(editPhone.trim())) {
      setEditError('Phone number must be exactly 10 digits');
      return;
    }

    try {
      setEditSubmitting(true);
      const payload = {
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim() || null,
        ward_area: editWardArea.trim() || null,
      };
      // Omit role entirely when self-editing — the field is locked in the UI too,
      // and the backend also rejects a self role-change as a second line of defense.
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
      render: (row) => <Badge status={row.role} size="sm" />,
    },
    {
      header: 'Ward / Area',
      key: 'ward_area',
      render: (row) => <span className="font-semibold text-slate-700 dark:text-slate-300">{row.ward_area || '—'}</span>,
    },
    {
      header: 'Status',
      key: 'is_active',
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={Pencil}
            onClick={() => openEditModal(row)}
          >
            Edit
          </Button>

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

          {row.id !== currentUser?.id && (
            <Button
              variant={row.is_active ? 'danger' : 'success'}
              size="sm"
              onClick={() => handleToggleDeactivate(row)}
            >
              {row.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <ProtectedRoute adminOnly={true}>
      <div>
        <Header
        title="Staff & Operator Management"
        subtitle="Admin controls for role assignments and credentials"
        action={
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setIsAddModalOpen(true)}
            className="h-8 w-8 p-0 xs:h-auto xs:w-auto xs:px-3 xs:py-1.5"
            title="Add New Staff"
          >
            <span className="hidden sm:inline">Add New Staff</span>
            <span className="hidden xs:inline sm:hidden">Staff</span>
          </Button>
        }
      />

      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Search & Filter Bar */}
        <div className="gsap-filter-bar flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-4 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 card-elevation shadow-xs dark:shadow-[0_8px_30px_rgb(0,0,0,0.35)] transition-colors">
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search name, phone or email..."
            className="w-full sm:max-w-md md:flex-1 md:min-w-0"
          />

          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setPage(1);
            }}
            className="w-full md:w-auto rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 py-2 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 transition-colors"
          >
            <option value="true" className="dark:bg-slate-900">Active Only</option>
            <option value="" className="dark:bg-slate-900">All Staff</option>
            <option value="false" className="dark:bg-slate-900">Deactivated Only</option>
          </select>
        </div>

        <Table
          columns={columns}
          data={staffList}
          loading={loading}
          emptyText="No staff members registered."
        />

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalRecords}
          onPageChange={setPage}
        />
      </div>

      {/* Add Staff Modal */}
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
            label="Email Address (Required for Google Sign-In)"
            type="email"
            placeholder="e.g. staff@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            options={ROLE_OPTIONS}
          />

          <Input
            label="Ward / Area"
            placeholder="e.g. Delhi Central"
            value={wardArea}
            onChange={(e) => setWardArea(e.target.value)}
          />

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

      {/* Edit Staff Modal */}
      <Modal
        isOpen={Boolean(editingStaff)}
        onClose={() => setEditingStaff(null)}
        title={`Edit ${editingStaff?.name || 'Staff Member'}`}
        subtitle="Update contact details or change their system role"
      >
        <form onSubmit={handleUpdateStaff} className="space-y-4" autoComplete="off">
          {editError && (
            <div className="rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          <Input
            label="Full Name"
            placeholder="e.g. Gurpreet Singh"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />

          <Input
            label="Phone Number"
            placeholder="10-digit mobile number"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            maxLength={10}
            inputMode="numeric"
            required
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="e.g. staff@gmail.com"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
          />

          <div>
            <Select
              label="Role Privilege"
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              options={ROLE_OPTIONS}
              disabled={isEditingSelf}
            />
            {isEditingSelf && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                You can&apos;t change your own role — ask another admin to do it.
              </p>
            )}
          </div>

          <Input
            label="Ward / Area"
            placeholder="e.g. Delhi Central"
            value={editWardArea}
            onChange={(e) => setEditWardArea(e.target.value)}
          />

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

      {/* Reset Password Modal */}
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
    </div>
    </ProtectedRoute>
  );
}
