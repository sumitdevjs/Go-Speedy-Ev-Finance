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
  TrendingUp,
  Download,
  Trash2
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
import { exportToExcel, fetchAllForExport } from '../../../lib/exportToExcel';
import CustomExportModal from '../../../components/ui/CustomExportModal';

export default function ModelsPage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [activeTab, setActiveTab] = useState('new');
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [activeFilter, setActiveFilter] = useState('true');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isCustomExportOpen, setIsCustomExportOpen] = useState(false);
  const [oldEvSearch, setOldEvSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingModelId, setEditingModelId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const [oldEvs, setOldEvs] = useState([]);
  const [loadingOldEvs, setLoadingOldEvs] = useState(false);
  const [isEditPriceOpen, setIsEditPriceOpen] = useState(false);
  const [selectedOldEv, setSelectedOldEv] = useState(null);
  const [editPrice, setEditPrice] = useState('');

  const [wardBreakdown, setWardBreakdown] = useState([]);
  const [loadingWardBreakdown, setLoadingWardBreakdown] = useState(false);
  const [wardSearch, setWardSearch] = useState('');
  const [onlyWithStock, setOnlyWithStock] = useState(false);

  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);
  const [stockDate, setStockDate] = useState(new Date().toISOString().split('T')[0]);
  const [stockAdded, setStockAdded] = useState('');
  const [stockWard, setStockWard] = useState('Delhi Central');
  const [stockBranchId, setStockBranchId] = useState('');
  const [branches, setBranches] = useState([]);
  const [isStockSubmitting, setIsStockSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [ward, setWard] = useState('Delhi Central');
  const [addModelBranchId, setAddModelBranchId] = useState('');
  const [totalPrice, setTotalPrice] = useState('80000');
  const [stockCount, setStockCount] = useState('5');
  const [kilometres, setKilometres] = useState('0');
  const [initialStockDate, setInitialStockDate] = useState(new Date().toISOString().split('T')[0]);

  const { selectedBranch, setSelectedBranch } = useAuthStore();

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

  useEffect(() => {
    setPage(1);
  }, [selectedBranch]);

  useEffect(() => {
    const handleBranchChange = () => {
      fetchModels();
      if (activeTab === 'old') {
        fetchOldEvs();
      } else if (activeTab === 'ward_breakdown') {
        fetchWardBreakdown();
      }
    };
    window.addEventListener('branchChange', handleBranchChange);
    return () => window.removeEventListener('branchChange', handleBranchChange);
  }, [activeTab, page, search, stockStatus, activeFilter, selectedBranch]);

  useEffect(() => {
    staggerFadeIn('.gsap-filter-bar', { y: 14, duration: 0.45, stagger: 0 });
  }, []);

  useEffect(() => {
    api.get('/api/branches/dropdown')
      .then((res) => {
        if (res.data?.success) {
          const list = res.data.data || [];
          setBranches(list);
          if (list.length > 0) {
            setAddModelBranchId(list[0].id);
          }
        }
      })
      .catch(() => {});
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
      const branchId = selectedBranch ? (selectedBranch.id || selectedBranch.code || 'scoped') : 'all';
      const res = await api.get(`/api/old-evs?branch_id=${encodeURIComponent(branchId)}&_t=${Date.now()}`);
      if (res.data?.success) {
        setOldEvs(res.data.data || []);
      }
    } catch (err) {
    } finally {
      setLoadingOldEvs(false);
    }
  };

  const fetchWardBreakdown = async () => {
    try {
      setLoadingWardBreakdown(true);
      const branchId = selectedBranch ? (selectedBranch.id || selectedBranch.code || 'scoped') : 'all';
      const res = await api.get(`/api/models/ward-breakdown?branch_id=${encodeURIComponent(branchId)}&_t=${Date.now()}`);
      if (res.data?.success) {
        setWardBreakdown(res.data.data || []);
      }
    } catch (err) {
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

      const branchParam = selectedBranch ? (selectedBranch.id || selectedBranch.code || selectedBranch.name) : 'all';
      query += `&branch_id=${encodeURIComponent(branchParam)}&_t=${Date.now()}`;

      const res = await api.get(query);
      if (res.data?.success) {
        setModels(res.data.data || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalRecords(res.data.pagination?.totalItems || 0);
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const MODEL_EXPORT_COLUMNS = [
    'Model Name',
    'Manufacturer / Company',
    'Sticker Total Price (₹)',
    'Kilometres (KM)',
    'Available Stock (Current Scope)',
    'Total Global Fleet Stock',
    'Scoped Filter View',
    'Ward-Wise Stock Distribution',
    'Catalog Status',
    'Registered On',
    'Last Updated'
  ];

  const fetchModelsForExport = async () => {
    const branchParam = selectedBranch ? (selectedBranch.id || selectedBranch.code || selectedBranch.name) : 'all';
    const params = {
      branch_id: branchParam,
    };
    if (search) params.search = search;
    if (stockStatus) params.stockStatus = stockStatus;
    if (activeFilter !== '') params.is_active = activeFilter;

    return await fetchAllForExport(api, '/api/models', params);
  };

  const transformModelRow = (m) => {
    const scopedWardName = selectedBranch
      ? (selectedBranch.ward_no ? `Ward ${selectedBranch.ward_no}: ${selectedBranch.name}` : selectedBranch.name)
      : 'All Wards (Global Master)';

    const wardStockStr = Array.isArray(m.ward_stock_summary) && m.ward_stock_summary.length > 0
      ? m.ward_stock_summary.map((w) => `${w.ward_label}: ${w.stock}`).join(' | ')
      : (m.ward ? `Default Ward: ${m.ward}` : '—');

    return {
      'Model Name': m.name || '—',
      'Manufacturer / Company': m.company || '—',
      'Sticker Total Price (₹)': m.total_price ?? 0,
      'Kilometres (KM)': m.kilometres ?? 0,
      'Available Stock (Current Scope)': m.stock_count ?? 0,
      'Total Global Fleet Stock': m.total_global_stock ?? m.stock_count ?? 0,
      'Scoped Filter View': scopedWardName,
      'Ward-Wise Stock Distribution': wardStockStr,
      'Catalog Status': m.is_active ? 'Active' : 'Cancelled / Inactive',
      'Registered On': formatDate(m.created_at),
      'Last Updated': formatDate(m.updated_at),
    };
  };

  const handleDownloadNewModels = () => {
    setIsCustomExportOpen(true);
  };

  const handleDownloadWardBreakdown = () => {
    if (!filteredWards || filteredWards.length === 0) {
      toast.info('No ward stock data to export');
      return;
    }
    const dataToExport = filteredWards.map((w) => {
      const modelBreakdownStr = Array.isArray(w.models)
        ? w.models.map((m) => `${m.name}: ${m.stock ?? 0}`).join(' | ')
        : '—';

      return {
        'Ward Number': w.ward_no ?? '—',
        'Ward / Branch Name': w.name || '—',
        'Branch Code': w.code || '—',
        'Ward Area / Zone': w.ward_area || 'Delhi Zone',
        'Ward In-Charge / Contact Person': w.contact_person || '—',
        'Contact Phone': w.phone || '—',
        'Total Allocated Stock (EVs)': w.total_stock ?? 0,
        'Active Models Count': Array.isArray(w.models) ? w.models.length : 0,
        'Models Breakdown': modelBreakdownStr,
      };
    });
    exportToExcel(dataToExport, `Ward_Stock_Matrix_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(`Exported ${dataToExport.length} municipal wards stock matrix successfully!`);
  };

  const handleDownloadOldEvs = () => {
    const listToExport = filteredOldEvs;
    if (!listToExport || listToExport.length === 0) {
      toast.info('No returned/refurbished EVs to export');
      return;
    }
    const dataToExport = listToExport.map((row) => ({
      'Original Model Name': row.original_ev_model?.name || 'Unknown',
      'Manufacturer / Company': row.original_ev_model?.company || '—',
      'Used Selling Price (₹)': row.custom_price || row.original_ev_model?.total_price || 0,
      'Pricing Valuation': row.custom_price ? 'Custom Valued' : 'Original Sticker Price',
      'Previous Tenant Name': row.tenant?.full_name || '—',
      'Tenant Mobile': row.tenant?.phone || '—',
      'Rental Contract Number': row.tenant?.contract_number || '—',
      'Return Date': formatDate(row.returned_at),
      'Condition Notes / Remarks': row.condition_notes || 'None recorded',
      'Branch / Ward Location': row.branch?.name || (row.branch?.ward_no ? `Ward ${row.branch.ward_no}` : '—'),
      'Inventory Status': row.status || 'Returned / In Stock',
      'Entry Recorded Date': formatDate(row.created_at),
    }));
    exportToExcel(dataToExport, `Returned_Refurbished_EVs_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(`Exported ${dataToExport.length} returned/refurbished EVs successfully!`);
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
    if (stockDate && stockDate < todayStr) {
      toast.error('Date received cannot be in the past (back date not allowed).');
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
    setWard(branches[0]?.name || 'Central');
    setAddModelBranchId(branches[0]?.id || '');
    setTotalPrice('80000');
    setStockCount('5');
    setKilometres('0');
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

    if (!editingModelId && initialStockDate && initialStockDate < todayStr) {
      setError('Initial Stock Date cannot be in the past (back date not allowed).');
      return;
    }

    try {
      setIsSubmitting(true);
      const chosenBranch = branches.find((b) => b.id === addModelBranchId);
      const payload = {
        name: name.trim(),
        company: company.trim(),
        branch_id: chosenBranch?.id || null,
        ward: chosenBranch ? (chosenBranch.ward_no ? `Ward ${chosenBranch.ward_no}: ${chosenBranch.name}` : chosenBranch.name) : (ward.trim() || 'General'),
        total_price: Number(totalPrice),
        stock_count: Number(stockCount),
        kilometres: Number(kilometres) || 0,
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
        setKilometres('0');
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

  const handleDeleteModel = async (model) => {
    const ok = await confirmDialog({
      title: `Delete Model: ${model.name}?`,
      message: 'This will permanently remove this EV model from the fleet catalog. This action cannot be undone.',
      tone: 'danger',
      confirmLabel: 'Delete Model',
    });
    if (!ok) return;

    try {
      const res = await api.delete(`/api/models/${model.id}`);
      if (res.data?.success) {
        toast.success(`${model.name} deleted successfully.`);
        fetchModels();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete model');
    }
  };

  const handleResetStock = async (model) => {
    const ok = await confirmDialog({
      title: `Reset All Stock for ${model.name}?`,
      message: 'This will clear all allocated stock logs and set the stock count to 0.',
      tone: 'danger',
      confirmLabel: 'Reset Stock',
    });
    if (!ok) return;

    try {
      const res = await api.post(`/api/models/${model.id}/reset-stock`);
      if (res.data?.success) {
        toast.success(`Stock for ${model.name} reset to 0.`);
        fetchModels();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset stock');
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
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-bold text-slate-900 dark:text-white">{row.name}</p>
            <span className="text-[11px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {row.kilometres !== undefined && row.kilometres !== null ? `${row.kilometres} km` : '0 km'}
            </span>
          </div>
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
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            title="Delete Model"
            onClick={() => handleDeleteModel(row)}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
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

  const filteredOldEvs = oldEvs.filter((ev) => {
    if (!oldEvSearch.trim()) return true;
    const term = oldEvSearch.toLowerCase().trim();
    return (
      (ev.original_ev_model?.name && ev.original_ev_model.name.toLowerCase().includes(term)) ||
      (ev.original_ev_model?.company && ev.original_ev_model.company.toLowerCase().includes(term)) ||
      (ev.tenant?.full_name && ev.tenant.full_name.toLowerCase().includes(term)) ||
      (ev.tenant?.contract_number && ev.tenant.contract_number.toLowerCase().includes(term)) ||
      (ev.tenant?.phone && ev.tenant.phone.includes(term))
    );
  });

  const totalAllocatedFleet = wardBreakdown.reduce((sum, w) => sum + (w.total_stock || 0), 0);
  const activeWardsCount = wardBreakdown.filter(w => w.total_stock > 0).length;

  return (
    <div className="flex-1 flex flex-col min-w-0 w-full min-h-screen">
      <Header
        title="EV Models & Fleet Stock"
        subtitle="Manage fleet vehicle catalog, master models, and municipal ward allocations"
        action={
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={handleOpenAddModal}
            className="h-9 px-3 sm:px-4 text-xs font-bold shrink-0 shadow-xs"
            title="Add New EV Model"
          >
            <span className="hidden sm:inline">Add New EV Model</span>
            <span className="sm:hidden">New Model</span>
          </Button>
        }
      />

      <div className="w-full px-3.5 sm:px-5 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="w-full flex items-center gap-1.5 p-1.5 bg-slate-100/90 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-x-auto scrollbar-thin">
          <button
            onClick={() => setActiveTab('new')}
            className={`shrink-0 whitespace-nowrap px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'new' 
                ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Brand New Models
          </button>
          <button
            onClick={() => setActiveTab('ward_breakdown')}
            className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'ward_breakdown' 
                ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Ward-Wise Stock Matrix</span>
            <span className="text-[10px] ml-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-black">
              {activeWardsCount} active
            </span>
          </button>
          <button
            onClick={() => setActiveTab('old')}
            className={`shrink-0 whitespace-nowrap px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
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
            <div className="gsap-filter-bar flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 card-elevation shadow-xs dark:shadow-[0_8px_30px_rgb(0,0,0,0.35)] transition-colors">
              <div className="flex flex-1 min-w-0 gap-2 items-center">
                <SearchBar
                  value={search}
                  onChange={(val) => {
                    setSearch(val);
                    setPage(1);
                  }}
                  placeholder="Search model name, company or ward..."
                  className="flex-1 min-w-0"
                />
                <Button
                  variant="outline"
                  size="sm"
                  icon={Download}
                  loading={isExporting}
                  disabled={isExporting}
                  className="shrink-0 h-[42px] px-3 font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
                  onClick={handleDownloadNewModels}
                  title="Download Data as Excel"
                >
                  <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export Excel'}</span>
                </Button>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <Select
                  value={stockStatus}
                  onChange={(e) => { setStockStatus(e.target.value); setPage(1); }}
                  options={[
                    { value: '', label: 'All Stock Status' },
                    { value: 'in_stock', label: 'In Stock' },
                    { value: 'out_of_stock', label: 'Out of Stock' },
                  ]}
                  containerClassName="w-36 sm:w-44 shrink-0"
                />
                <Select
                  value={activeFilter}
                  onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
                  options={[
                    { value: 'true', label: 'Active Models' },
                    { value: 'false', label: 'Cancelled Models' },
                    { value: '', label: 'All Models' },
                  ]}
                  containerClassName="w-36 sm:w-44 shrink-0"
                />
              </div>
            </div>

            <div className="hidden md:block">
              <Table
                columns={columns}
                data={models}
                loading={loading}
                emptyText="No EV models registered yet. Click 'Add New EV Model' to add inventory."
                minWidth="min-w-[800px]"
              />
            </div>

            <div className="block md:hidden space-y-3">
              {loading ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <Spinner size="md" className="mx-auto text-blue-600 dark:text-blue-400" />
                  <p className="mt-2 text-xs text-slate-500">Loading EV models...</p>
                </div>
              ) : models.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <Bike className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-slate-500">No EV models found.</p>
                </div>
              ) : (
                models.map((m) => {
                  const isScoped = Boolean(selectedBranch);
                  const stock = Number(m.stock_count ?? 0);
                  const isOutOfStock = stock <= 0;
                  return (
                    <div
                      key={m.id}
                      className="bg-white/95 dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-white/10 p-4 shadow-2xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                            {m.name}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {m.company || 'Go Speedy'}
                          </p>
                        </div>
                        <Badge
                          status={m.is_active ? 'Active' : 'Cancelled'}
                          variant={m.is_active ? 'emerald' : 'rose'}
                          size="sm"
                        />
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 text-xs">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Sticker Price</p>
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                            {formatCurrency(m.total_price || m.price_per_unit)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Stock Status</p>
                          <Badge
                            status={stock > 0 ? `${stock} in stock` : 'Out of stock'}
                            variant={stock > 0 ? 'emerald' : 'rose'}
                            size="sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isScoped ? (
                              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                {selectedBranch.ward_no ? `Ward ${selectedBranch.ward_no}: ${selectedBranch.name}` : selectedBranch.name}
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                                Total Global Fleet: {stock} Units
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenAddStock(m)}
                              className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
                              title="Add Stock"
                            >
                              <PackagePlus className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditClick(m)}
                              className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors"
                              title="Edit"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleDeactivate(m)}
                              className={`p-2 rounded-xl transition-colors ${
                                m.is_active
                                  ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                  : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              }`}
                              title={m.is_active ? 'Cancel' : 'Activate'}
                            >
                              {m.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteModel(m)}
                              className="p-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors"
                              title="Delete Model"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {!isScoped && Array.isArray(m.ward_stock_summary) && m.ward_stock_summary.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {m.ward_stock_summary.map((ws, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/10"
                              >
                                {ws.ward_label}: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{ws.stock}</strong>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalRecords}
              onPageChange={setPage}
            />
          </>
        ) : activeTab === 'ward_breakdown' ? (
          <div className="space-y-6 animate-in fade-in duration-300">
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

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
              <div className="flex w-full sm:max-w-md sm:flex-1 min-w-0 gap-2 items-center">
                <SearchBar
                  value={wardSearch}
                  onChange={setWardSearch}
                  placeholder="Search by Ward name, ward number, area, or candidate..."
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  icon={Download}
                  className="shrink-0 h-[42px] px-3 font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  onClick={handleDownloadWardBreakdown}
                  title="Download Data as Excel"
                >
                  <span className="hidden sm:inline">Export Excel</span>
                </Button>
              </div>
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
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
              <div className="flex w-full sm:max-w-md sm:flex-1 min-w-0 gap-2 items-center">
                <SearchBar
                  value={oldEvSearch}
                  onChange={setOldEvSearch}
                  placeholder="Search model, tenant, or contract number..."
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  icon={Download}
                  className="shrink-0 h-[42px] px-3 font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  onClick={handleDownloadOldEvs}
                  title="Download Data as Excel"
                >
                  <span className="hidden sm:inline">Export Excel</span>
                </Button>
              </div>
            </div>

            <Table
              columns={oldEvsColumns}
              data={filteredOldEvs}
              loading={loadingOldEvs}
              emptyText="No returned/refurbished EVs found."
              minWidth="min-w-[800px]"
            />
          </div>
        )}
      </div>

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

          <Input
            label="Kilometres (KM) *"
            type="number"
            min={0}
            placeholder="e.g. 0 (Brand New) or 15000"
            value={kilometres}
            onChange={(e) => setKilometres(e.target.value)}
            helperText="Every EV model + kilometres reading will be a unique combination."
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
                min={todayStr}
                value={initialStockDate}
                onChange={(e) => setInitialStockDate(e.target.value)}
                required
              />

              <Select
                label="Initial Receiving Ward / Branch"
                value={addModelBranchId}
                onChange={(e) => setAddModelBranchId(e.target.value)}
                required
              >
                <option value="" disabled>-- Select Municipal Ward / Branch --</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.ward_no ? `Ward ${b.ward_no}: ${b.name}` : b.name} {b.ward_area ? `(${b.ward_area})` : ''}
                  </option>
                ))}
              </Select>
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
            min={todayStr}
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

      <CustomExportModal
        isOpen={isCustomExportOpen}
        onClose={() => setIsCustomExportOpen(false)}
        title="Export EV Models & Fleet Catalog"
        subtitle="Download master model fleet, pricing, and live ward stock distribution (Excel / CSV)"
        defaultFilename="GoSpeedy_Master_Fleet_Models"
        columns={MODEL_EXPORT_COLUMNS}
        dateAccessor="created_at"
        onFetchData={fetchModelsForExport}
        transformRow={transformModelRow}
      />
    </div>
  );
}
