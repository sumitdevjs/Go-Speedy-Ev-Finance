'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Save, AlertCircle, Edit2, 
  Trash2, PackagePlus, Bike, MapPin, Building, IndianRupee, XCircle, CheckCircle, Clock
} from 'lucide-react';
import Header from '../../../../components/layout/Header';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Table from '../../../../components/ui/Table';
import Card from '../../../../components/ui/Card';
import Modal from '../../../../components/ui/Modal';
import Badge from '../../../../components/ui/Badge';
import Spinner from '../../../../components/ui/Spinner';
import api from '../../../../lib/api';
import { toast } from '../../../../lib/toast';
import { confirmDialog } from '../../../../lib/confirmDialog';
import { formatCurrency, formatDate } from '../../../../lib/constants';

export default function ModelViewPage({ params }) {
  const router = useRouter();
  const { id } = params;

  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingLogs, setSavingLogs] = useState(false);
  const [error, setError] = useState('');

  // Edit Mode for details
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({});

  // Logs states
  const [logs, setLogs] = useState([]);
  const [isEditingLogs, setIsEditingLogs] = useState(false);
  const [editableLogs, setEditableLogs] = useState([]);

  // Add Stock state
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [stockDate, setStockDate] = useState(new Date().toISOString().split('T')[0]);
  const [stockAdded, setStockAdded] = useState('');
  const [stockWard, setStockWard] = useState('');
  const [isStockSubmitting, setIsStockSubmitting] = useState(false);

  useEffect(() => {
    fetchModel();
  }, [id]);

  const fetchModel = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/models/${id}`);
      if (res.data?.success) {
        const data = res.data.data;
        setModel(data);
        setFormData({
          name: data.name || '',
          company: data.company || '',
          total_price: data.total_price?.toString() || '',
          stock_count: data.stock_count?.toString() || ''
        });
        const fetchedLogs = data.stock_logs || [];
        // Sort logs descending by date
        fetchedLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
        setLogs(fetchedLogs);
        setEditableLogs(JSON.parse(JSON.stringify(fetchedLogs)));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load model details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDetails = async () => {
    try {
      setSavingDetails(true);
      await api.patch(`/api/models/${id}`, {
        name: formData.name,
        company: formData.company,
        total_price: Number(formData.total_price)
      });
      toast.success('Model details updated successfully');
      setIsEditMode(false);
      fetchModel();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update details');
    } finally {
      setSavingDetails(false);
    }
  };

  const handleToggleDeactivate = async () => {
    if (!model) return;
    const action = model.is_active ? 'cancel/deactivate' : 'reactivate';
    const ok = await confirmDialog({
      title: `${action === 'cancel/deactivate' ? 'Cancel' : 'Reactivate'} Model: ${model.name}?`,
      message: action === 'cancel/deactivate'
        ? 'This will prevent new rentals for this EV model. Existing rentals are unaffected.'
        : 'This will allow new rentals for this EV model.',
      tone: action === 'cancel/deactivate' ? 'danger' : 'default',
      confirmLabel: action === 'cancel/deactivate' ? 'Cancel Model' : 'Reactivate',
    });
    
    if (!ok) return;

    try {
      await api.patch(`/api/models/${model.id}`, { is_active: !model.is_active });
      toast.success(`${model.name} successfully ${action === 'cancel/deactivate' ? 'cancelled' : 'reactivated'}.`);
      fetchModel();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} model`);
    }
  };

  const handleLogChange = (index, field, value) => {
    const newLogs = [...editableLogs];
    newLogs[index][field] = field === 'stock_added' ? Number(value) : value;
    setEditableLogs(newLogs);
  };

  const handleDeleteLog = (index) => {
    const newLogs = [...editableLogs];
    newLogs.splice(index, 1);
    setEditableLogs(newLogs);
  };

  const handleSaveLogs = async () => {
    try {
      setSavingLogs(true);
      await api.patch(`/api/models/${id}`, {
        stock_logs: editableLogs
      });
      toast.success('Stock logs updated successfully');
      setIsEditingLogs(false);
      fetchModel();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update stock logs');
    } finally {
      setSavingLogs(false);
    }
  };

  const cancelLogEdits = () => {
    setEditableLogs(JSON.parse(JSON.stringify(logs)));
    setIsEditingLogs(false);
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
      await api.post(`/api/models/${id}/stock`, {
        date: stockDate,
        stock_added: Number(stockAdded),
        ward_area: stockWard.trim(),
      });
      toast.success(`Successfully added ${stockAdded} stock`);
      setIsAddStockOpen(false);
      setStockAdded('');
      fetchModel();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add stock');
    } finally {
      setIsStockSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" className="text-emerald-500" />
      </div>
    );
  }

  if (error || !model) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Error loading model</h2>
        <p className="text-sm text-slate-500">{error}</p>
        <Button onClick={() => router.push('/models')}>Back to Models</Button>
      </div>
    );
  }

  const logColumns = [
    {
      header: 'Date',
      key: 'date',
      render: (row, idx) => (
        isEditingLogs ? (
          <Input 
            type="date" 
            value={editableLogs[idx].date} 
            onChange={(e) => handleLogChange(idx, 'date', e.target.value)}
            className="w-full min-w-[140px]"
          />
        ) : (
          <span className="font-medium text-slate-900 dark:text-white">{formatDate(row.date)}</span>
        )
      )
    },
    {
      header: 'Quantity Added',
      key: 'stock_added',
      render: (row, idx) => (
        isEditingLogs ? (
          <Input 
            type="number" 
            value={editableLogs[idx].stock_added} 
            onChange={(e) => handleLogChange(idx, 'stock_added', e.target.value)}
            className="w-full min-w-[100px]"
          />
        ) : (
          <span className="font-bold text-emerald-600 dark:text-emerald-400">+{row.stock_added}</span>
        )
      )
    },
    {
      header: 'Ward / Area',
      key: 'ward_area',
      render: (row, idx) => (
        isEditingLogs ? (
          <Input 
            value={editableLogs[idx].ward_area} 
            onChange={(e) => handleLogChange(idx, 'ward_area', e.target.value)}
            className="w-full"
          />
        ) : (
          <span className="text-slate-600 dark:text-slate-300">{row.ward_area}</span>
        )
      )
    }
  ];

  if (isEditingLogs) {
    logColumns.push({
      header: 'Actions',
      key: 'actions',
      render: (row, idx) => (
        <Button 
          variant="ghost" 
          size="sm" 
          icon={Trash2} 
          onClick={() => handleDeleteLog(idx)}
          className="text-rose-500 hover:text-rose-600"
        />
      )
    });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        title={isEditMode ? `Editing: ${model.name}` : model.name}
        subtitle={`${model.company} • Added ${formatDate(model.created_at)}`}
        backHref="/models"
        action={
          <div className="flex items-center gap-1.5 sm:gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              icon={model.is_active ? XCircle : CheckCircle}
              onClick={handleToggleDeactivate}
              className={`h-8 w-8 p-0 xs:h-auto xs:w-auto xs:px-2.5 xs:py-1.5 ${
                model.is_active ? "text-rose-600 hover:text-rose-700" : "text-emerald-600 hover:text-emerald-700"
              }`}
              title={model.is_active ? 'Deactivate Model' : 'Reactivate Model'}
            >
              <span className="hidden md:inline">{model.is_active ? 'Deactivate Model' : 'Reactivate Model'}</span>
              <span className="hidden xs:inline md:hidden">{model.is_active ? 'Deactivate' : 'Reactivate'}</span>
            </Button>
            {!isEditMode ? (
              <Button
                variant="primary"
                size="sm"
                icon={Edit2}
                onClick={() => setIsEditMode(true)}
                className="h-8 w-8 p-0 xs:h-auto xs:w-auto xs:px-3 xs:py-1.5"
                title="Edit Details"
              >
                <span className="hidden sm:inline">Edit Details</span>
                <span className="hidden xs:inline sm:hidden">Edit</span>
              </Button>
            ) : (
              <div className="flex items-center gap-1.5 xs:gap-2">
                <Button variant="outline" size="sm" onClick={() => { setIsEditMode(false); setFormData(model); }} className="px-2.5 py-1.5">
                  Cancel
                </Button>
                <Button variant="primary" size="sm" icon={Save} loading={savingDetails} onClick={handleUpdateDetails} className="px-2.5 py-1.5">
                  <span className="hidden sm:inline">Save Changes</span>
                  <span className="sm:hidden">Save</span>
                </Button>
              </div>
            )}
          </div>
        }
      />

      <div className="p-3.5 xs:p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6 flex-1">
        
        {/* Model Overview Card */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bike className="w-4 h-4 text-emerald-500" /> Model Specifications
            </h3>
            <Badge 
              status={model.is_active ? 'Active' : 'Cancelled'} 
              variant={model.is_active ? 'emerald' : 'rose'} 
              size="sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mt-6">
            <div>
              {isEditMode ? (
                <Input
                  label="Model Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              ) : (
                <>
                  <p className="font-bold text-slate-400 uppercase text-[10px]">Model Name</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{model.name}</p>
                </>
              )}
            </div>

            <div>
              {isEditMode ? (
                <Input
                  label="Company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              ) : (
                <>
                  <p className="font-bold text-slate-400 uppercase text-[10px] flex items-center gap-1"><Building className="w-3 h-3"/> Company</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{model.company}</p>
                </>
              )}
            </div>


            <div>
              {isEditMode ? (
                <Input
                  label="Sticker Price"
                  type="number"
                  value={formData.total_price}
                  onChange={(e) => setFormData({ ...formData, total_price: e.target.value })}
                />
              ) : (
                <>
                  <p className="font-bold text-slate-400 uppercase text-[10px] flex items-center gap-1"><IndianRupee className="w-3 h-3"/> Total Price</p>
                  <p className="text-sm font-black text-blue-600 dark:text-blue-400 mt-0.5">{formatCurrency(model.total_price)}</p>
                </>
              )}
            </div>
            
            <div>
              <p className="font-bold text-slate-400 uppercase text-[10px]">Current Stock Count</p>
              <p className={`text-sm font-black mt-0.5 ${model.stock_count > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                {model.stock_count} units
              </p>
            </div>
          </div>
        </Card>

        {/* Stock History Logs */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" /> Stock Addition History
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Logs of all incoming stock for this model</p>
            </div>
            
            {!isEditingLogs ? (
              <div className="flex items-center gap-2">
                <Button variant="primary" size="sm" icon={PackagePlus} onClick={() => {
                  setStockDate(new Date().toISOString().split('T')[0]);
                  setStockAdded('');
                  setStockWard(model.ward || 'Delhi Central');
                  setIsAddStockOpen(true);
                }}>
                  Add New Stock
                </Button>
                <Button variant="outline" size="sm" icon={Edit2} onClick={() => setIsEditingLogs(true)}>
                  Edit Logs
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={cancelLogEdits}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" icon={Save} loading={savingLogs} onClick={handleSaveLogs}>
                  Save History
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <Table
              columns={logColumns}
              data={isEditingLogs ? editableLogs : logs}
              emptyText="No stock logs found for this model."
            />
          </div>
        </Card>

      </div>

      {/* Add Stock Modal */}
      <Modal
        isOpen={isAddStockOpen}
        onClose={() => setIsAddStockOpen(false)}
        title={`Add Stock to ${model?.name}`}
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
          <Input
            label="Ward / Area"
            placeholder="e.g. Okhla Depot"
            value={stockWard}
            onChange={(e) => setStockWard(e.target.value)}
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
