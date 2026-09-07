'use client';

import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, Key, UserX, AlertCircle } from 'lucide-react';
import Header from '../../../components/layout/Header';
import Table from '../../../components/ui/Table';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Modal from '../../../components/ui/Modal';
import Badge from '../../../components/ui/Badge';
import api from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import { formatDate } from '../../../lib/constants';

export default function StaffPage() {
  const { user: currentUser } = useAuthStore();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Staff Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Password Reset Modal
  const [passwordModalUser, setPasswordModalUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState('');

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/staff');
      if (res.data?.success) {
        setStaffList(res.data.data || []);
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

    try {
      setIsSubmitting(true);
      const res = await api.post('/api/staff', {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        password,
        role,
      });

      if (res.data?.success) {
        setIsAddModalOpen(false);
        setName('');
        setPhone('');
        setEmail('');
        setPassword('');
        fetchStaff();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create staff member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleDeactivate = async (staffMember) => {
    if (staffMember.id === currentUser?.id) {
      alert('You cannot deactivate your own account.');
      return;
    }

    const action = staffMember.is_active ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} ${staffMember.name}?`)) return;

    try {
      if (staffMember.is_active) {
        await api.patch(`/api/staff/${staffMember.id}/deactivate`);
      } else {
        await api.patch(`/api/staff/${staffMember.id}`, { is_active: true });
      }
      fetchStaff();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} account`);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');
    if (!newPassword || newPassword.length < 6) {
      setResetError('Password must be at least 6 characters');
      return;
    }

    try {
      setResetSubmitting(true);
      await api.patch(`/api/staff/${passwordModalUser.id}/password`, {
        password: newPassword,
      });
      setPasswordModalUser(null);
      setNewPassword('');
      alert('Password updated successfully');
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
          <p className="font-bold text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-500">{row.email || 'No email'}</p>
        </div>
      ),
    },
    {
      header: 'Mobile Phone',
      key: 'phone',
      render: (row) => <span className="font-semibold text-slate-700">{row.phone}</span>,
    },
    {
      header: 'System Role',
      key: 'role',
      render: (row) => <Badge status={row.role} size="sm" />,
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
      header: 'Created On',
      key: 'created_at',
      render: (row) => <span className="text-xs text-slate-500">{formatDate(row.created_at)}</span>,
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex items-center gap-2">
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
          >
            Add New Staff
          </Button>
        }
      />

      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <Table
          columns={columns}
          data={staffList}
          loading={loading}
          emptyText="No staff members registered."
        />
      </div>

      {/* Add Staff Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Staff Member"
        subtitle="Create an operator account for Delhi hub collections and registrations"
      >
        <form onSubmit={handleCreateStaff} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
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
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          <Input
            label="Email Address (Optional)"
            type="email"
            placeholder="e.g. staff@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Initial Password"
            type="password"
            placeholder="Min 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Select
            label="Role Privilege"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            options={[
              { value: 'staff', label: 'Staff / Operator (Fleet & Collections)' },
              { value: 'admin', label: 'Administrator (Full System Control)' },
            ]}
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
              Create Account
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
        <form onSubmit={handleResetPassword} className="space-y-4">
          {resetError && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{resetError}</span>
            </div>
          )}

          <Input
            label="New Password"
            type="password"
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
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
  );
}
