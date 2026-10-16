'use client';

import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { toast } from '../../../lib/toast';
import {
  ArrowRightLeft,
  Truck,
  Building,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Search,
  Filter,
  X,
  FileText,
  Bike,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import CustomExportModal from '../../../components/ui/CustomExportModal';

export default function TransfersPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'super_admin' || (user?.role === 'admin' && !user?.ward_area);

  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isCustomExportOpen, setIsCustomExportOpen] = useState(false);

  // Dropdown lists
  const [models, setModels] = useState([]);
  const [branches, setBranches] = useState([]);

  // Modals state
  const [isInitiateOpen, setIsInitiateOpen] = useState(false);
  const [dispatchTarget, setDispatchTarget] = useState(null);
  const [receiveTarget, setReceiveTarget] = useState(null);
  const [detailsTarget, setDetailsTarget] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    from_branch_id: '',
    from_ward_area: '',
    to_branch_id: '',
    to_ward_area: '',
    ev_model_id: '',
    quantity: '1',
    notes: ''
  });

  const [dispatchData, setDispatchData] = useState({
    challan_number: '',
    driver_name: '',
    driver_phone: '',
    dispatch_notes: ''
  });

  const [receiveData, setReceiveData] = useState({
    receive_notes: '',
    condition_received: 'Good'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      const res = await api.get(`/api/transfers?${params.toString()}`);
      if (res.data?.success) {
        setTransfers(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching transfers:', err);
      toast.error('Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [modelsRes, branchesRes] = await Promise.all([
        api.get('/api/models?limit=100'),
        api.get('/api/branches?limit=100')
      ]);
      if (modelsRes.data?.success) setModels(modelsRes.data.data || []);
      if (branchesRes.data?.success) setBranches(branchesRes.data.data || []);
    } catch (err) {
      console.error('Error fetching dropdown data:', err);
    }
  };

  useEffect(() => {
    fetchTransfers();
    fetchDropdownData();
  }, [statusFilter]);

  // Initiate Transfer
  const handleInitiate = async (e) => {
    e.preventDefault();
    if (!formData.ev_model_id || !formData.quantity) {
      return toast.error('Please select a model and enter quantity');
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/api/transfers', formData);
      if (res.data?.success) {
        toast.success('Stock transfer request initiated!');
        setIsInitiateOpen(false);
        setFormData({
          from_branch_id: '',
          from_ward_area: '',
          to_branch_id: '',
          to_ward_area: '',
          ev_model_id: '',
          quantity: '1',
          notes: ''
        });
        fetchTransfers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate transfer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dispatch Transfer
  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!dispatchTarget) return;

    try {
      setIsSubmitting(true);
      const res = await api.post(`/api/transfers/${dispatchTarget.transfer_id}/dispatch`, dispatchData);
      if (res.data?.success) {
        toast.success('Stock marked as Dispatched (In-Transit)!');
        setDispatchTarget(null);
        fetchTransfers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Receive Transfer
  const handleReceive = async (e) => {
    e.preventDefault();
    if (!receiveTarget) return;

    try {
      setIsSubmitting(true);
      const res = await api.post(`/api/transfers/${receiveTarget.transfer_id}/receive`, receiveData);
      if (res.data?.success) {
        toast.success('Stock received and ward inventory updated!');
        setReceiveTarget(null);
        fetchTransfers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to receive');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel Transfer
  const handleCancel = async (transferId) => {
    const reason = prompt('Please enter cancellation reason:');
    if (!reason) return;

    try {
      const res = await api.post(`/api/transfers/${transferId}/cancel`, { cancel_reason: reason });
      if (res.data?.success) {
        toast.success('Transfer request cancelled');
        fetchTransfers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    }
  };

  // Filter transfers by search
  const filteredTransfers = transfers.filter(t => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      t.transfer_id?.toLowerCase().includes(s) ||
      t.model?.name?.toLowerCase().includes(s) ||
      t.from_branch_name?.toLowerCase().includes(s) ||
      t.to_branch_name?.toLowerCase().includes(s) ||
      t.challan_number?.toLowerCase().includes(s)
    );
  });

  // Calculate summary counts
  const totalCount = transfers.length;
  const requestedCount = transfers.filter(t => t.status === 'requested').length;
  const inTransitCount = transfers.filter(t => t.status === 'in_transit').length;
  const receivedCount = transfers.filter(t => t.status === 'received').length;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <ArrowRightLeft className="w-8 h-8 text-primary" />
            Inter-Branch Stock Transfers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Legal stock movement lifecycle (HO ➔ Branch / Ward ➔ Ward) with gate pass and audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsCustomExportOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-semibold text-sm transition-all shadow-sm cursor-pointer"
            title="Download Stock Transfers (Excel / CSV)"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => setIsInitiateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Initiate Transfer
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Transfers</span>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-foreground">{totalCount}</div>
          <p className="text-xs text-muted-foreground mt-1">All historical stock movements</p>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pending Requests</span>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">{requestedCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Awaiting dispatch approval</p>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">In-Transit</span>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">{inTransitCount}</div>
          <p className="text-xs text-muted-foreground mt-1">On vehicle truck / road</p>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Completed / Received</span>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">{receivedCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Physically verified into stock</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="p-4 rounded-2xl border border-border bg-card shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transfer ID, model, branch, challan..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {['all', 'requested', 'in_transit', 'received', 'cancelled'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap ${
                statusFilter === tab
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {tab === 'all' ? 'All Transfers' : tab.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Transfers Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60 border-b border-border text-xs uppercase font-bold text-muted-foreground tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Transfer ID & Date</th>
                <th className="px-5 py-3.5">EV Model & Qty</th>
                <th className="px-5 py-3.5">Origin ➔ Destination</th>
                <th className="px-5 py-3.5">Challan / Logistics</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                    <div>Loading transfer records...</div>
                  </td>
                </tr>
              ) : filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    No stock transfer records found.
                  </td>
                </tr>
              ) : (
                filteredTransfers.map((tr) => (
                  <tr key={tr.transfer_id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-foreground font-mono">{tr.transfer_id}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        {tr.created_at?.split('T')[0]}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-bold text-foreground flex items-center gap-1.5">
                        <Bike className="w-4 h-4 text-primary" />
                        {tr.model_name || tr.model?.name || 'EV Bike'}
                      </div>
                      <div className="text-xs text-muted-foreground font-semibold mt-0.5">
                        Quantity: <span className="text-foreground font-bold">{tr.quantity} Unit(s)</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="text-xs">
                        <span className="text-muted-foreground font-semibold">From: </span>
                        <span className="font-bold text-foreground">{tr.from_branch_name || tr.from_ward_area || 'Head Office'}</span>
                      </div>
                      <div className="text-xs mt-1">
                        <span className="text-primary font-semibold">To: </span>
                        <span className="font-bold text-foreground">{tr.to_branch_name || tr.to_ward_area}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {tr.challan_number ? (
                        <div>
                          <div className="font-mono text-xs font-semibold text-foreground">
                            📄 {tr.challan_number}
                          </div>
                          {tr.driver_name && (
                            <div className="text-[11px] text-muted-foreground">
                              Driver: {tr.driver_name} ({tr.driver_phone || 'N/A'})
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Not yet dispatched</span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                        tr.status === 'requested' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' :
                        tr.status === 'in_transit' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' :
                        tr.status === 'received' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {tr.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {tr.status === 'requested' && (
                          <>
                            <button
                              onClick={() => {
                                setDispatchTarget(tr);
                                setDispatchData({
                                  challan_number: `CH-${Date.now().toString().slice(-6)}`,
                                  driver_name: '',
                                  driver_phone: '',
                                  dispatch_notes: ''
                                });
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              Dispatch
                            </button>
                            <button
                              onClick={() => handleCancel(tr.transfer_id)}
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                              title="Cancel Transfer"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {tr.status === 'in_transit' && (
                          <button
                            onClick={() => {
                              setReceiveTarget(tr);
                              setReceiveData({
                                receive_notes: 'Physical stock verified and intact',
                                condition_received: 'Good'
                              });
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Receive Stock
                          </button>
                        )}

                        <button
                          onClick={() => setDetailsTarget(tr)}
                          className="px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground font-semibold text-xs transition-colors"
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: INITIATE TRANSFER */}
      {isInitiateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-primary/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Initiate Stock Transfer</h3>
                  <p className="text-xs text-muted-foreground">Create legal dispatch order between HO and Wards</p>
                </div>
              </div>
              <button
                onClick={() => setIsInitiateOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInitiate} className="p-6 space-y-4">
              {/* Model Selection */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Select EV Bike Model *
                </label>
                <select
                  value={formData.ev_model_id}
                  onChange={(e) => setFormData({ ...formData, ev_model_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="">-- Choose Model --</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.company || 'GoSpeedy'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Number of Units (Quantity) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              {/* Origin Branch */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Origin (Source Branch / Ward)
                </label>
                <select
                  value={formData.from_branch_id}
                  onChange={(e) => {
                    const b = branches.find(br => br.id === e.target.value);
                    setFormData({
                      ...formData,
                      from_branch_id: e.target.value,
                      from_ward_area: b?.ward_area || b?.name || 'Head Office Central'
                    });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Head Office Central Hub (Default)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.ward_area || b.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Branch */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Destination (Receiving Branch / Ward) *
                </label>
                <select
                  value={formData.to_branch_id}
                  onChange={(e) => {
                    const b = branches.find(br => br.id === e.target.value);
                    setFormData({
                      ...formData,
                      to_branch_id: e.target.value,
                      to_ward_area: b?.ward_area || b?.name || 'Destination'
                    });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="">-- Choose Destination Branch --</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.ward_area || b.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Internal Transfer Notes / Purpose
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Demand spike in Rohini ward, batch replenishment..."
                  className="w-full px-3.5 py-2 rounded-xl border border-input bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsInitiateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-input hover:bg-muted font-semibold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm"
                >
                  {isSubmitting ? 'Creating...' : 'Submit Transfer Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DISPATCH MODAL */}
      {dispatchTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />
              Dispatch Stock: {dispatchTarget.transfer_id}
            </h3>
            <p className="text-xs text-muted-foreground">
              Moving {dispatchTarget.quantity} units of {dispatchTarget.model_name} from {dispatchTarget.from_branch_name} to {dispatchTarget.to_branch_name}.
            </p>

            <form onSubmit={handleDispatch} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Challan / Gate Pass Number</label>
                <input
                  type="text"
                  value={dispatchData.challan_number}
                  onChange={(e) => setDispatchData({ ...dispatchData, challan_number: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-input bg-background text-foreground text-sm font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Driver / Transporter Name</label>
                <input
                  type="text"
                  value={dispatchData.driver_name}
                  onChange={(e) => setDispatchData({ ...dispatchData, driver_name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3.5 py-2 rounded-xl border border-input bg-background text-foreground text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Driver Contact Number</label>
                <input
                  type="text"
                  value={dispatchData.driver_phone}
                  onChange={(e) => setDispatchData({ ...dispatchData, driver_phone: e.target.value })}
                  placeholder="9876543210"
                  className="w-full px-3.5 py-2 rounded-xl border border-input bg-background text-foreground text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Dispatch Remarks</label>
                <textarea
                  rows={2}
                  value={dispatchData.dispatch_notes}
                  onChange={(e) => setDispatchData({ ...dispatchData, dispatch_notes: e.target.value })}
                  placeholder="e.g. Loaded on truck DL-1AB-1234"
                  className="w-full px-3.5 py-2 rounded-xl border border-input bg-background text-foreground text-sm resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDispatchTarget(null)}
                  className="px-4 py-2 rounded-xl border border-input hover:bg-muted text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm"
                >
                  {isSubmitting ? 'Dispatching...' : 'Confirm Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RECEIVE MODAL */}
      {receiveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Receive & Accept Stock
            </h3>
            <p className="text-xs text-muted-foreground">
              Confirm physical receipt of {receiveTarget.quantity} units into {receiveTarget.to_branch_name} inventory.
            </p>

            <form onSubmit={handleReceive} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Physical Condition</label>
                <select
                  value={receiveData.condition_received}
                  onChange={(e) => setReceiveData({ ...receiveData, condition_received: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-input bg-background text-foreground text-sm"
                >
                  <option value="Good">Good (Ready for Deployment)</option>
                  <option value="Requires PDI Check">Requires PDI Check</option>
                  <option value="Minor Transit Scratches">Minor Transit Scratches</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Receipt Remarks</label>
                <textarea
                  rows={2}
                  value={receiveData.receive_notes}
                  onChange={(e) => setReceiveData({ ...receiveData, receive_notes: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-input bg-background text-foreground text-sm resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReceiveTarget(null)}
                  className="px-4 py-2 rounded-xl border border-input hover:bg-muted text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm"
                >
                  {isSubmitting ? 'Confirming...' : 'Accept into Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DETAILS VIEW */}
      {detailsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">Transfer Details</h3>
              <button onClick={() => setDetailsTarget(null)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Transfer ID:</span>
                <span className="font-mono font-bold text-foreground">{detailsTarget.transfer_id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Model & Quantity:</span>
                <span className="font-bold text-foreground">{detailsTarget.model_name} ({detailsTarget.quantity} units)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Origin:</span>
                <span className="font-semibold text-foreground">{detailsTarget.from_branch_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Destination:</span>
                <span className="font-semibold text-foreground">{detailsTarget.to_branch_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Current Status:</span>
                <span className="font-bold uppercase text-primary">{detailsTarget.status}</span>
              </div>
              {detailsTarget.challan_number && (
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Challan Number:</span>
                  <span className="font-mono font-bold text-foreground">{detailsTarget.challan_number}</span>
                </div>
              )}
              {detailsTarget.driver_name && (
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Driver:</span>
                  <span className="font-semibold text-foreground">{detailsTarget.driver_name} ({detailsTarget.driver_phone})</span>
                </div>
              )}
              {detailsTarget.receive_notes && (
                <div className="py-1">
                  <span className="text-muted-foreground">Receive Notes:</span>
                  <p className="font-medium text-foreground mt-0.5">{detailsTarget.receive_notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDetailsTarget(null)}
                className="px-4 py-2 rounded-xl bg-foreground text-background text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Custom Export Modal */}
      <CustomExportModal
        isOpen={isCustomExportOpen}
        onClose={() => setIsCustomExportOpen(false)}
        title="Export Stock Transfers"
        subtitle="Download inter-branch vehicle movements and transit gate pass records (Excel / CSV)"
        defaultFilename="GoSpeedy_Stock_Transfers"
        columns={[
          'Transfer ID',
          'Challan Number',
          'From Ward / Branch',
          'To Ward / Branch',
          'EV Model',
          'Quantity',
          'Status',
          'Driver Name',
          'Driver Phone',
          'Requested By',
          'Created Date',
        ]}
        dateAccessor="created_at"
        onFetchData={async () => transfers}
        transformRow={(t) => ({
          'Transfer ID': t.id || '—',
          'Challan Number': t.challan_number || 'Pending Challan',
          'From Ward / Branch': t.from_branch?.name || (t.from_ward_area ? `${t.from_ward_area} Ward` : 'Central HO'),
          'To Ward / Branch': t.to_branch?.name || (t.to_ward_area ? `${t.to_ward_area} Ward` : 'Target Branch'),
          'EV Model': t.ev_models?.name || 'EV Scooter',
          'Quantity': t.quantity || 1,
          'Status': t.status || 'requested',
          'Driver Name': t.driver_name || 'N/A',
          'Driver Phone': t.driver_phone || 'N/A',
          'Requested By': t.requested_by_user?.name || 'Staff',
          'Created Date': t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN') : '—',
          created_at: t.created_at || new Date().toISOString(),
        })}
      />
    </div>
  );
}
