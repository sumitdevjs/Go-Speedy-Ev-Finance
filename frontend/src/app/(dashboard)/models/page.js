'use client';

import React, { useState, useEffect } from 'react';
import { Bike, Plus, AlertCircle, Edit2, XCircle, CheckCircle, Eye, PackagePlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Header from '../../../components/layout/Header';
import Table from '../../../components/ui/Table';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Modal from '../../../components/ui/Modal';
import Badge from '../../../components/ui/Badge';
import Pagination from '../../../components/ui/Pagination';
import SearchBar from '../../../components/ui/SearchBar';
import api from '../../../lib/api';
import { formatCurrency, formatDate } from '../../../lib/constants';
import { staggerFadeIn } from '../../../lib/gsap';
import { toast } from '../../../lib/toast';
import { confirmDialog } from '../../../lib/confirmDialog';

export default function ModelsPage() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [activeFilter, setActiveFilter] = useState('true');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingModelId, setEditingModelId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Add Stock state
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);
  const [stockDate, setStockDate] = useState(new Date().toISOString().split('T')[0]);
  const [stockAdded, setStockAdded] = useState('');
  const [stockWard, setStockWard] = useState('Delhi Central');
  const [isStockSubmitting, setIsStockSubmitting] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [ward, setWard] = useState('Delhi Central');
  const [totalPrice, setTotalPrice] = useState('80000');
  const [stockCount, setStockCount] = useState('5');
  const [initialStockDate, setInitialStockDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchModels();
  }, [search, stockStatus, activeFilter, page]);

  // One-time entrance animation for the filter bar
  useEffect(() => {
    staggerFadeIn('.gsap-filter-bar', { y: 14, duration: 0.45, stagger: 0 });
  }, []);

  const fetchModels = async () => {
    try {
      setLoading(true);
      let query = `/api/models?page=${page}&limit=15`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (stockStatus) query += `&stockStatus=${encodeURIComponent(stockStatus)}`;
      if (activeFilter !== '') query += `&is_active=${activeFilter}`;
      const res = await api.get(query);
      if (res.data?.success) {
        setModels(res.data.data || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalRecords(res.data.pagination?.totalItems || 0);
      }
    } catch (err) {
      console.error('Failed to load models:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (model) => {
    router.push(`/models/${model.id}`);
  };

  const handleOpenAddStock = (model) => {
    setSelectedModel(model);
    setStockDate(new Date().toISOString().split('T')[0]);
    setStockAdded('');
    setStockWard(model.ward || 'Delhi Central');
    setIsAddStockOpen(true);
  };

  const handleStockSubmit = async (e) => {
    e.preventDefault();
    if (!stockAdded || Number(stockAdded) <= 0) {
      toast.error('Please enter a valid stock quantity');
      return;
    }
    if (!stockWard.trim()) {
      toast.error('Ward/Area is required');
      return;
    }
    try {
      setIsStockSubmitting(true);
      await api.post(`/api/models/${selectedModel.id}/stock`, {
        date: stockDate,
        stock_added: Number(stockAdded),
        ward_area: stockWard.trim(),
      });
      toast.success(`Successfully added ${stockAdded} stock to ${selectedModel.name}`);
      setIsAddStockOpen(false);
      fetchModels();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add stock');
    } finally {
      setIsStockSubmitting(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingModelId(null);
    setName('');
    setCompany('');
    setWard('Delhi Central');
    setTotalPrice('80000');
    setStockCount('5');
    setInitialStockDate(new Date().toISOString().split('T')[0]);
    setIsAddModalOpen(true);
  };

  const handleSubmitModel = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !company.trim()) {
      setError('Model name and company are required');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name: name.trim(),
        company: company.trim(),
        ward: ward.trim(),
        total_price: Number(totalPrice),
        stock_count: Number(stockCount),
      };

      let res;
      if (editingModelId) {
        res = await api.patch(`/api/models/${editingModelId}`, payload);
      } else {
        payload.initial_stock_date = initialStockDate;
        res = await api.post('/api/models', payload);
      }

      if (res.data?.success) {
        setIsAddModalOpen(false);
        setEditingModelId(null);
        setName('');
        setCompany('');
        fetchModels();
      }
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${editingModelId ? 'update' : 'create'} EV model`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleDeactivate = async (model) => {
    const action = model.is_active ? 'cancel/deactivate' : 'reactivate';
    const ok = await confirmDialog({
      title: `${action === 'cancel/deactivate' ? 'Cancel' : 'Reactivate'} Model: ${model.name}?`,
      message:
        action === 'cancel/deactivate'
          ? 'This will prevent new rentals for this EV model. Existing rentals are unaffected.'
          : 'This will allow new rentals for this EV model.',
      tone: action === 'cancel/deactivate' ? 'danger' : 'default',
      confirmLabel: action === 'cancel/deactivate' ? 'Cancel Model' : 'Reactivate',
    });
    if (!ok) return;

    try {
      await api.patch(`/api/models/${model.id}`, { is_active: !model.is_active });
      toast.success(`${model.name} successfully ${action === 'cancel/deactivate' ? 'cancelled' : 'reactivated'}.`);
      fetchModels();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} model`);
    }
  };

  const columns = [
    {
      header: 'Model Name',
      key: 'name',
      render: (row) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-white">{row.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{row.company}</p>
        </div>
      ),
    },

    {
      header: 'Sticker Price',
      key: 'total_price',
      render: (row) => (
        <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(row.total_price)}</span>
      ),
    },
    {
      header: 'Stock Count',
      key: 'stock_count',
      render: (row) => (
        <Badge
          status={row.stock_count > 0 ? `${row.stock_count} in stock` : 'Out of stock'}
          variant={row.stock_count > 0 ? 'emerald' : 'rose'}
          size="sm"
        />
      ),
    },
    {
      header: 'Added / Updated',
      key: 'dates',
      render: (row) => (
        <div>
          <p className="text-xs text-slate-800 dark:text-slate-200">A: {formatDate(row.created_at)}</p>
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
            variant="ghost"
            size="sm"
            icon={PackagePlus}
            title="Add Stock"
            onClick={() => handleOpenAddStock(row)}
            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
          />
          <Button
            variant="ghost"
            size="sm"
            icon={Eye}
            title="View/Edit"
            onClick={() => handleEditClick(row)}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          />
          <Button
            variant="ghost"
            size="sm"
            icon={row.is_active ? XCircle : CheckCircle}
            title={row.is_active ? "Cancel Model" : "Reactivate Model"}
            onClick={() => handleToggleDeactivate(row)}
            className={row.is_active ? "text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300" : "text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <Header
        title="EV Models & Stock"
        subtitle="Manage fleet inventory and pricing"
        action={
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={handleOpenAddModal}
            className="h-8 w-8 p-0 xs:h-auto xs:w-auto xs:px-3 xs:py-1.5"
            title="Add New EV Model"
          >
            <span className="hidden sm:inline">Add New EV Model</span>
            <span className="hidden xs:inline sm:hidden">Model</span>
          </Button>
        }
      />

      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Search Bar */}
        <div className="gsap-filter-bar flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 card-elevation shadow-xs dark:shadow-[0_8px_30px_rgb(0,0,0,0.35)] transition-colors">
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search model name, company or ward..."
            className="w-full sm:max-w-md sm:flex-1 sm:min-w-0"
          />
          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3">
            <Select
              value={stockStatus}
              onChange={(e) => { setStockStatus(e.target.value); setPage(1); }}
              options={[
                { value: '', label: 'All Stock Status' },
                { value: 'in_stock', label: 'In Stock' },
                { value: 'out_of_stock', label: 'Out of Stock' },
              ]}
              className="w-full sm:w-48"
            />
            <Select
              value={activeFilter}
              onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
              options={[
                { value: 'true', label: 'Active Models' },
                { value: 'false', label: 'Cancelled Models' },
                { value: '', label: 'All Models' },
              ]}
              className="w-full sm:w-48"
            />
          </div>
        </div>

        <Table
          columns={columns}
          data={models}
          loading={loading}
          emptyText="No EV models registered yet. Click 'Add New EV Model' to add inventory."
        />

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalRecords}
          onPageChange={setPage}
        />
      </div>

      {/* Add/Edit Model Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingModelId ? "Edit EV Model" : "Register New EV Model"}
        subtitle={editingModelId ? "Update existing model details" : "Add a new electric scooter model to available fleet inventory"}
      >
        <form onSubmit={handleSubmitModel} className="space-y-4" autoComplete="off">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Model Name"
            placeholder="e.g. Speedy Eco X1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Manufacturer / Company"
            placeholder="e.g. Go Speedy EV Motors"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
          />



          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Sticker Price (₹)"
              type="number"
              placeholder="80000"
              value={totalPrice}
              onChange={(e) => setTotalPrice(e.target.value)}
              required
            />

            <Input
              label="Initial Stock Quantity"
              type="number"
              placeholder="10"
              min={0}
              value={stockCount}
              onChange={(e) => setStockCount(Math.max(0, Number(e.target.value)).toString())}
              required
            />
          </div>

          {!editingModelId && Number(stockCount) > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Initial Stock Date"
                type="date"
                value={initialStockDate}
                onChange={(e) => setInitialStockDate(e.target.value)}
                required
              />
              <Input
                label="Ward / Hub Location"
                placeholder="e.g. Okhla Depot"
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                required
              />
            </div>
          )}

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
              {editingModelId ? 'Update Model' : 'Save Model'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Stock Modal */}
      <Modal
        isOpen={isAddStockOpen}
        onClose={() => setIsAddStockOpen(false)}
        title={`Add Stock to ${selectedModel?.name}`}
        subtitle="Log new incoming stock for this EV model"
      >
        <form onSubmit={handleStockSubmit} className="space-y-4" autoComplete="off">
          <Input
            label="Date Received"
            type="date"
            value={stockDate}
            onChange={(e) => setStockDate(e.target.value)}
            required
          />
          <Input
            label="Quantity Added"
            type="number"
            min={1}
            placeholder="e.g. 5"
            value={stockAdded}
            onChange={(e) => setStockAdded(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => setIsAddStockOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isStockSubmitting}
            >
              Confirm Stock
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
