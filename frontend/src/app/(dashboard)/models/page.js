'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bike, 
  Plus, 
  AlertCircle, 
  Edit2, 
  XCircle, 
  CheckCircle, 
  Eye, 
  PackagePlus, 
  MapPin, 
  Building2, 
  Layers, 
  Filter, 
  Check, 
  ArrowRight, 
  User, 
  Phone, 
  Sparkles,
  TrendingUp
} from 'lucide-react';
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
import Spinner from '../../../components/ui/Spinner';
import Card from '../../../components/ui/Card';
import api from '../../../lib/api';
import { formatCurrency, formatDate } from '../../../lib/constants';
import { staggerFadeIn } from '../../../lib/gsap';
import { toast } from '../../../lib/toast';
import { confirmDialog } from '../../../lib/confirmDialog';
import { useAuthStore } from '../../../store/authStore';

export default function ModelsPage() {
  const [activeTab, setActiveTab] = useState('new'); // 'new', 'old', or 'ward_breakdown'
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

  // Old EVs State
  const [oldEvs, setOldEvs] = useState([]);
  const [loadingOldEvs, setLoadingOldEvs] = useState(false);
  const [isEditPriceOpen, setIsEditPriceOpen] = useState(false);
  const [selectedOldEv, setSelectedOldEv] = useState(null);
  const [editPrice, setEditPrice] = useState('');

  // Ward Stock Matrix State
  const [wardBreakdown, setWardBreakdown] = useState([]);
  const [loadingWardBreakdown, setLoadingWardBreakdown] = useState(false);
  const [wardSearch, setWardSearch] = useState('');
  const [onlyWithStock, setOnlyWithStock] = useState(false);

  // Add Stock state
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);
  const [stockDate, setStockDate] = useState(new Date().toISOString().split('T')[0]);
  const [stockAdded, setStockAdded] = useState('');
  const [stockWard, setStockWard] = useState('Delhi Central');
  const [stockBranchId, setStockBranchId] = useState('');
  const [branches, setBranches] = useState([]);
  const [isStockSubmitting, setIsStockSubmitting] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [ward, setWard] = useState('Delhi Central');
  const [totalPrice, setTotalPrice] = useState('80000');
  const [stockCount, setStockCount] = useState('5');
  const [initialStockDate, setInitialStockDate] = useState(new Date().toISOString().split('T')[0]);

  const { selectedBranch, setSelectedBranch } = useAuthStore();

  // Check URL tab parameter on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'ward_breakdown' || tabParam === 'old' || tabParam === 'new') {
        setActiveTab(tabParam);
      }
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [search, stockStatus, activeFilter, page, selectedBranch]);

  // One-time entrance animation for the filter bar
  useEffect(() => {
    staggerFadeIn('.gsap-filter-bar', { y: 14, duration: 0.45, stagger: 0 });
  }, []);

  useEffect(() => {
    api.get('/api/branches/dropdown')
      .then((res) => {
        if (res.data?.success) {
          setBranches(res.data.data || []);
        }
      })
      .catch((err) => console.error('Failed to load branches for stock modal:', err));
  }, []);

  useEffect(() => {
    if (activeTab === 'old') {
      fetchOldEvs();
    } else if (activeTab === 'ward_breakdown') {
      fetchWardBreakdown();
    }
  }, [activeTab, selectedBranch]);

  const fetchOldEvs = async () => {
    try {
      setLoadingOldEvs(true);
      const res = await api.get('/api/old-evs');
      if (res.data?.success) {
        setOldEvs(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load old EVs:', err);
    } finally {
      setLoadingOldEvs(false);
    }
  };

  const fetchWardBreakdown = async () => {
    try {
      setLoadingWardBreakdown(true);
      const res = await api.get('/api/models/ward-breakdown');
      if (res.data?.success) {
        setWardBreakdown(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load ward stock breakdown:', err);
    } finally {
      setLoadingWardBreakdown(false);
    }
  };

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
    const defaultBranch = selectedBranch?.id || (branches.length === 1 ? branches[0].id : '');
    setStockBranchId(defaultBranch);
    setStockWard(model.ward || 'Delhi Central');
    setIsAddStockOpen(true);
  };

  const handleOpenAddStockForWard = (wardItem) => {
    const defaultModel = models[0] || null;
    setSelectedModel(defaultModel);
    setStockDate(new Date().toISOString().split('T')[0]);
    setStockAdded('');
    setStockBranchId(wardItem.id);
    setStockWard(wardItem.name);
    setIsAddStockOpen(true);
  };

  const handleStockSubmit = async (e) => {
    e.preventDefault();
    if (!selectedModel) {
      toast.error('Please select an EV model');
      return;
    }
    if (!stockAdded || Number(stockAdded) <= 0) {
      toast.error('Please enter a valid stock quantity');
      return;
    }
    if (!stockBranchId) {
      toast.error('Please select the target Ward / Branch');
      return;
    }
    const chosenBranch = branches.find((b) => b.id === stockBranchId);
    try {
      setIsStockSubmitting(true);
      await api.post(`/api/models/${selectedModel.id}/stock`, {
        date: stockDate,
        stock_added: Number(stockAdded),
        branch_id: chosenBranch?.id || stockBranchId,
        ward_no: chosenBranch?.ward_no || null,
        ward_area: chosenBranch ? (chosenBranch.ward_no ? `Ward ${chosenBranch.ward_no}: ${chosenBranch.name}` : chosenBranch.name) : 'General',
      });
      toast.success(`Successfully allocated ${stockAdded} EVs to ${chosenBranch?.name || 'selected ward'}`);
      setIsAddStockOpen(false);
      fetchModels();
      if (activeTab === 'ward_breakdown') {
        fetchWardBreakdown();
      }
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
        if (activeTab === 'ward_breakdown') {
          fetchWardBreakdown();
        }
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

  const handleUpdateOldEvPrice = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await api.patch(`/api/old-evs/${selectedOldEv.id}/price`, { price: Number(editPrice) });
      toast.success('Price updated successfully');
      setIsEditPriceOpen(false);
      fetchOldEvs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update price');
    } finally {
      setIsSubmitting(false);
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
      render: (row) => {
        const isScoped = !!selectedBranch;
        return (
          <div className="space-y-1.5 py-1">
            <div className="flex items-center gap-1.5">
              <Badge
                status={row.stock_count > 0 ? `${row.stock_count} in stock` : 'Out of stock'}
                variant={row.stock_count > 0 ? 'emerald' : 'rose'}
                size="sm"
              />
              {isScoped && (
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/25">
                  {selectedBranch.ward_no ? `Ward ${selectedBranch.ward_no}` : selectedBranch.name}
                </span>
              )}
            </div>

            {/* When viewing All Wards (Global), show which wards hold stock for this model */}
            {!isScoped && Array.isArray(row.ward_stock_summary) && row.ward_stock_summary.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {row.ward_stock_summary.map((ws, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/10"
                    title={`Allocated to: ${ws.ward_label}`}
                  >
                    <span>{ws.ward_label}:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{ws.stock}</strong>
                  </span>
                ))}
              </div>
            ) : !isScoped ? (
              <span className="text-[11px] text-slate-400 italic">No ward allocation yet</span>
            ) : null}
          </div>
        );
      },
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
            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 cursor-pointer"
          />
          <Button
            variant="ghost"
            size="sm"
            icon={Eye}
            title="View/Edit"
            onClick={() => handleEditClick(row)}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
          />
          <Button
            variant="ghost"
            size="sm"
            icon={row.is_active ? XCircle : CheckCircle}
            title={row.is_active ? "Cancel Model" : "Reactivate Model"}
            onClick={() => handleToggleDeactivate(row)}
            className={row.is_active ? "text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 cursor-pointer" : "text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 cursor-pointer"}
          />
        </div>
      ),
    },
  ];

  const oldEvsColumns = [
    {
      header: 'Original Model',
      key: 'model',
      render: (row) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-white">{row.original_ev_model?.name || 'Unknown'}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{row.original_ev_model?.company}</p>
        </div>
      ),
    },
    {
      header: 'Used Pricing',
      key: 'price',
      render: (row) => (
        <div>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            {row.custom_price ? formatCurrency(row.custom_price) : formatCurrency(row.original_ev_model?.total_price)}
          </span>
          {row.custom_price && (
            <span className="ml-2 text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded">
              Custom Valued
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Rental History',
      key: 'history',
      render: (row) => (
        <div className="text-xs text-slate-600 dark:text-slate-300">
          <p>Tenant: <span className="font-semibold text-slate-900 dark:text-white">{row.tenant?.full_name}</span></p>
          <p className="text-[11px] text-slate-400">Contract: {row.tenant?.contract_number}</p>
        </div>
      ),
    },
    {
      header: 'Return Date',
      key: 'date',
      render: (row) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {formatDate(row.returned_at)}
        </span>
      ),
    },
    {
      header: 'Condition Notes',
      key: 'notes',
      render: (row) => (
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate" title={row.condition_notes}>
          {row.condition_notes || 'None recorded'}
        </p>
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
            icon={Edit2}
            title="Set Used Price"
            onClick={() => {
              setSelectedOldEv(row);
              setEditPrice(row.custom_price || row.original_ev_model?.total_price || '');
              setIsEditPriceOpen(true);
            }}
            className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 cursor-pointer"
          />
        </div>
      ),
    },
  ];

  // Filtered ward breakdown list
  const filteredWards = wardBreakdown.filter((w) => {
    if (onlyWithStock && w.total_stock <= 0) return false;
    if (!wardSearch.trim()) return true;
    const term = wardSearch.toLowerCase().trim();
    return (
      (w.name && w.name.toLowerCase().includes(term)) ||
      (w.ward_area && w.ward_area.toLowerCase().includes(term)) ||
      (w.code && w.code.toLowerCase().includes(term)) ||
      (w.contact_person && w.contact_person.toLowerCase().includes(term)) ||
      (w.ward_no && String(w.ward_no).includes(term))
    );
  });

  const totalAllocatedFleet = wardBreakdown.reduce((sum, w) => sum + (w.total_stock || 0), 0);
  const activeWardsCount = wardBreakdown.filter(w => w.total_stock > 0).length;

  return (
    <div className="min-h-screen">
      <Header
        title="EV Models & Fleet Stock"
        subtitle="Manage fleet vehicle catalog, master models, and municipal ward allocations"
        action={
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={handleOpenAddModal}
          >
            Add New EV Model
          </Button>
        }
      />

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-fit border border-slate-200/80 dark:border-white/10">
          <button
            onClick={() => setActiveTab('new')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'new' 
                ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Brand New Models
          </button>
          <button
            onClick={() => setActiveTab('ward_breakdown')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'ward_breakdown' 
                ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Ward-Wise Stock Matrix</span>
            <span className="text-[10px] ml-1 bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-black">
              {activeWardsCount} active
            </span>
          </button>
          <button
            onClick={() => setActiveTab('old')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'old' 
                ? 'bg-white dark:bg-slate-700 shadow-sm text-amber-600 dark:text-amber-400' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Returned / Refurbished EVs
          </button>
        </div>

        {activeTab === 'new' ? (
          <>
            {/* Search & Filter Bar */}
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
          </>
        ) : activeTab === 'ward_breakdown' ? (
          /* Ward-Wise Stock Matrix Tab */
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top KPI Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl shadow-xs">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Fleet Stock</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1 flex items-baseline gap-2">
                  <span className="text-emerald-500">{totalAllocatedFleet}</span>
                  <span className="text-xs font-semibold text-slate-500">EVs across Delhi</span>
                </h3>
              </div>
              <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl shadow-xs">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Wards With Stock</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1 flex items-baseline gap-2">
                  <span className="text-blue-500">{activeWardsCount}</span>
                  <span className="text-xs font-semibold text-slate-500">of 46 Municipal Wards</span>
                </h3>
              </div>
              <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl shadow-xs">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Master Fleet Models</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1 flex items-baseline gap-2">
                  <span className="text-indigo-500">{models.length || 2}</span>
                  <span className="text-xs font-semibold text-slate-500">Models in Catalog</span>
                </h3>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
              <SearchBar
                value={wardSearch}
                onChange={setWardSearch}
                placeholder="Search by Ward name, ward number, area, or candidate..."
                className="w-full sm:max-w-md sm:flex-1"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOnlyWithStock(!onlyWithStock)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    onlyWithStock
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>{onlyWithStock ? 'Showing: Wards With Stock' : 'Showing: All 46 Wards'}</span>
                </button>
              </div>
            </div>

            {/* Ward Stock Cards Grid */}
            {loadingWardBreakdown ? (
              <div className="flex justify-center p-12">
                <Spinner size="lg" />
              </div>
            ) : filteredWards.length === 0 ? (
              <div className="p-12 text-center text-slate-500 bg-white/60 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-white/10">
                <MapPin className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-50" />
                <p className="font-semibold">No municipal wards match your filter</p>
                <p className="text-xs mt-1">Try turning off "Wards With Stock" or clearing your search</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredWards.map((w) => {
                  const hasStock = w.total_stock > 0;
                  return (
                    <div
                      key={w.id}
                      className={`relative rounded-2xl border p-5 flex flex-col justify-between transition-all backdrop-blur-xl ${
                        hasStock
                          ? 'bg-white/95 dark:bg-slate-900/80 border-slate-200 dark:border-emerald-500/30 shadow-md'
                          : 'bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-white/5 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                Ward #{w.ward_no}
                              </span>
                              <span className="text-[11px] font-mono text-slate-400">
                                {w.code}
                              </span>
                            </div>
                            <h4 className="text-base font-black text-slate-900 dark:text-white mt-1">
                              {w.name}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{w.ward_area || 'Delhi Zone'}</span>
                            </p>
                          </div>

                          <div className="text-right">
                            <span
                              className={`text-xs font-black px-2.5 py-1 rounded-full inline-block ${
                                hasStock
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-white/10'
                              }`}
                            >
                              {w.total_stock} EVs Available
                            </span>
                          </div>
                        </div>

                        {/* Candidate / Admin Info */}
                        {w.contact_person && (
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
                            <span className="flex items-center gap-1 font-medium truncate">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              {w.contact_person}
                            </span>
                            {w.phone && (
                              <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                                <Phone className="w-3 h-3" />
                                {w.phone}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Model-by-model breakdown chips */}
                        <div className="mt-3.5 space-y-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Model Inventory Breakdown
                          </p>
                          <div className="space-y-1">
                            {w.models.map((m) => (
                              <div
                                key={m.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 text-xs"
                              >
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {m.name}
                                </span>
                                <span
                                  className={`font-black px-2 py-0.5 rounded text-[11px] ${
                                    m.stock > 0
                                      ? 'text-emerald-500 bg-emerald-500/10'
                                      : 'text-slate-400 bg-slate-200/50 dark:bg-slate-700/50'
                                  }`}
                                >
                                  {m.stock} in stock
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 flex items-center gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          icon={PackagePlus}
                          onClick={() => handleOpenAddStockForWard(w)}
                          className="flex-1 text-xs py-1.5"
                        >
                          + Add Stock
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedBranch(w);
                            toast.success(`Filter switched to Ward ${w.ward_no}: ${w.name}`);
                          }}
                          className="text-xs py-1.5"
                          title="Switch top header filter to this ward"
                        >
                          Scope Filter
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Returned / Refurbished EVs Tab */
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <Table
              columns={oldEvsColumns}
              data={oldEvs}
              loading={loadingOldEvs}
              emptyText="No returned/refurbished EVs found."
            />
          </div>
        )}
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
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="EV Model Name"
            placeholder="e.g. Joy e-bike Wolf"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Manufacturer / Company"
            placeholder="e.g. Joy e-bike / Wardwizard"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
          />

          <Input
            label="Sticker Total Price (₹)"
            type="number"
            min={1}
            placeholder="e.g. 80000"
            value={totalPrice}
            onChange={(e) => setTotalPrice(e.target.value)}
            required
          />

          {!editingModelId && (
            <>
              <Input
                label="Initial Stock Quantity"
                type="number"
                min={0}
                placeholder="e.g. 5"
                value={stockCount}
                onChange={(e) => setStockCount(e.target.value)}
                required
              />

              <Input
                label="Initial Stock Date"
                type="date"
                value={initialStockDate}
                onChange={(e) => setInitialStockDate(e.target.value)}
                required
              />

              <Input
                label="Initial Receiving Hub / Ward"
                placeholder="e.g. Delhi Central or Ward 1: Rohini"
                value={ward}
                onChange={(e) => setWard(e.target.value)}
              />
            </>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              type="button"
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
              {editingModelId ? 'Save Changes' : 'Create EV Model'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Stock Modal */}
      <Modal
        isOpen={isAddStockOpen}
        onClose={() => setIsAddStockOpen(false)}
        title={selectedModel ? `Add Stock to ${selectedModel.name}` : 'Add EV Stock'}
        subtitle="Log new incoming stock and allocate it strictly to a specific municipal ward"
      >
        <form onSubmit={handleStockSubmit} className="space-y-4" autoComplete="off">
          {!selectedModel && models.length > 0 && (
            <Select
              label="Select EV Model"
              value={selectedModel?.id || ''}
              onChange={(e) => setSelectedModel(models.find(m => m.id === e.target.value))}
              required
            >
              <option value="" disabled>-- Select EV Model --</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.company})</option>
              ))}
            </Select>
          )}

          <Select
            label="Target Ward / Branch"
            value={stockBranchId}
            onChange={(e) => setStockBranchId(e.target.value)}
            disabled={branches.length === 1}
            required
          >
            <option value="" disabled>-- Select Municipal Ward / Branch --</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.ward_no ? `Ward ${b.ward_no}: ${b.name}` : b.name} {b.ward_area ? `(${b.ward_area})` : ''}
              </option>
            ))}
          </Select>

          <Input
            label="Date Received"
            type="date"
            value={stockDate}
            onChange={(e) => setStockDate(e.target.value)}
            required
          />

          <Input
            label="Quantity Added (EV Scooters)"
            type="number"
            min={1}
            placeholder="e.g. 10"
            value={stockAdded}
            onChange={(e) => setStockAdded(e.target.value)}
            required
          />

          {stockBranchId && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <span>
                These <strong>{stockAdded || '0'} EV scooters</strong> will be allocated <strong>strictly to {branches.find((b) => b.id === stockBranchId)?.name || 'this ward'}</strong>. Other wards will not share or deplete this inventory.
              </span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
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

      {/* Edit Old EV Price Modal */}
      <Modal
        isOpen={isEditPriceOpen}
        onClose={() => setIsEditPriceOpen(false)}
        title="Update Used Price"
        subtitle="Set a custom selling or rental valuation for this specific returned EV."
      >
        <form onSubmit={handleUpdateOldEvPrice} className="space-y-4" autoComplete="off">
          <Input
            label="Used Price (₹)"
            type="number"
            min={0}
            placeholder="e.g. 50000"
            value={editPrice}
            onChange={(e) => setEditPrice(e.target.value)}
            required
          />
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => setIsEditPriceOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSubmitting}
            >
              Update Price
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
