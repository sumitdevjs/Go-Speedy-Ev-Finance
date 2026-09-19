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
  XCircle,
  Eye,
  Edit2,
  ChevronRight,
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
import { useAuthStore } from '../../../store/authStore';

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
    ward_area: '',
    address: '',
    phone: '',
  });

  useEffect(() => {
    fetchHeadOffices();
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

  const handleOpenOverview = async (branch) => {
    try {
      setIsOverviewOpen(true);
      setOverviewLoading(true);
      const res = await api.get(`/api/branches/${branch.id}/overview`);
      if (res.data?.success) {
        setOverviewData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load branch overview:', err);
    } finally {
      setOverviewLoading(false);
    }
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
          ward_area: '',
          address: '',
          phone: '',
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
      header: 'Ward / Branch Name',
      key: 'name',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs shrink-0">
            {row.ward_no ? `#${row.ward_no}` : 'BR'}
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm">
              {row.name}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {row.ward_area || 'Standard Ward'}
            </p>
          </div>
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
      header: 'Head Office',
      key: 'ho',
      render: (row) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
          {row.head_office?.name || 'Delhi Head Office'}
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
            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
            title="View Ward Overview"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Header
        title="Branches & Wards"
        subtitle="Manage 46+ Delhi Wards, regional Head Offices, and staff allocations"
        action={
          isSuperAdmin ? (
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => setIsCreateOpen(true)}
            >
              Add New Ward / Branch
            </Button>
          ) : null
        }
      />

      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Filters & Head Office Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          {/* HO Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => {
                setSelectedHoFilter('');
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                selectedHoFilter === ''
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All Regions (46+ Wards)
            </button>
            {headOffices.map((ho) => (
              <button
                key={ho.id}
                type="button"
                onClick={() => {
                  setSelectedHoFilter(ho.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
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
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search ward name or code..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Branches Table */}
        <Card className="overflow-hidden">
          <Table
            columns={columns}
            data={branches}
            loading={loading}
            emptyText="No branches or wards found."
          />

          <div className="p-4 border-t border-slate-100 dark:border-slate-800">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems}
              onPageChange={setPage}
            />
          </div>
        </Card>
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
              <option value="">-- Choose Head Office --</option>
              {headOffices.map((ho) => (
                <option key={ho.id} value={ho.id}>
                  {ho.name} ({ho.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ward Number"
              type="number"
              placeholder="e.g. 47"
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
            placeholder="e.g. Dwarka Sector 10"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="Ward Area / Region"
            placeholder="e.g. South West Delhi"
            value={formData.ward_area}
            onChange={(e) => setFormData({ ...formData, ward_area: e.target.value })}
          />

          <Input
            label="Office Address"
            placeholder="Full branch address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <Input
            label="Contact Phone"
            placeholder="10-digit mobile number"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
        title="Ward Quick Overview"
        subtitle={overviewData?.branch ? `${overviewData.branch.name} (${overviewData.branch.code})` : 'Loading...'}
      >
        {overviewLoading ? (
          <div className="py-12 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : overviewData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 text-center">
                <Bike className="h-5 w-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                <p className="text-lg font-black text-slate-900 dark:text-white">
                  {overviewData.stats.totalStock}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">Available Bikes</p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 text-center">
                <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
                <p className="text-lg font-black text-slate-900 dark:text-white">
                  {overviewData.stats.activeRentals}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">Active Rentals</p>
              </div>

              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900/30 text-center">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
                <p className="text-lg font-black text-slate-900 dark:text-white">
                  {overviewData.stats.staffCount}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">Staff Members</p>
              </div>
            </div>

            <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs">
              <p className="flex justify-between">
                <span className="text-slate-500">Region / Head Office:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {overviewData.branch.head_office?.name} ({overviewData.branch.head_office?.city})
                </span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-500">Ward Area:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {overviewData.branch.ward_area || 'Not specified'}
                </span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-500">Contact Phone:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {overviewData.branch.phone || 'N/A'}
                </span>
              </p>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
