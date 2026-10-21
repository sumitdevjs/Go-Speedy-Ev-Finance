'use client';

import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { toast } from '../../../lib/toast';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  IndianRupee,
  Calendar,
  Download,
  Printer,
  ShieldAlert,
  Users,
  Building,
  CheckCircle2,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import AddPenaltyModal from '../../../components/penalties/AddPenaltyModal';
import CustomExportModal from '../../../components/ui/CustomExportModal';

export default function ReportsPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'super_admin' || (user?.role === 'admin' && !user?.ward_area);

  const [activeTab, setActiveTab] = useState('collections'); // collections, overdue, sales, penalties
  const [datePreset, setDatePreset] = useState('this_month'); // today, last_7_days, this_month, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCustomExportOpen, setIsCustomExportOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data states
  const [collectionsData, setCollectionsData] = useState(null);
  const [overdueData, setOverdueData] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [penaltiesData, setPenaltiesData] = useState(null);

  // Penalty Modal state
  const [penaltyModalTarget, setPenaltyModalTarget] = useState(null);

  // Setup initial dates
  useEffect(() => {
    handleDatePresetChange('this_month');
  }, []);

  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'last_7_days') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(todayStr);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const queryStr = params.toString();

      if (activeTab === 'collections') {
        const res = await api.get(`/api/reports/collections?${queryStr}`);
        if (res.data?.success) setCollectionsData(res.data.data);
      } else if (activeTab === 'overdue') {
        const res = await api.get(`/api/reports/overdue?${queryStr}`);
        if (res.data?.success) setOverdueData(res.data.data);
      } else if (activeTab === 'sales') {
        const res = await api.get(`/api/reports/sales?${queryStr}`);
        if (res.data?.success) setSalesData(res.data.data);
      } else if (activeTab === 'penalties') {
        const res = await api.get(`/api/penalties?${queryStr}`);
        if (res.data?.success) setPenaltiesData(res.data);
      }
    } catch (err) {
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      fetchReports();
    }
  }, [activeTab, startDate, endDate]);

  const handleWaivePenalty = async (penaltyId) => {
    if (!confirm('Waive this penalty?')) return;
    try {
      const res = await api.post(`/api/penalties/${penaltyId}/waive`, {
        reason: 'Waived from Reports Central Register'
      });
      if (res.data?.success) {
        toast.success('Penalty waived');
        fetchReports();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to waive penalty');
    }
  };

  const getReportExportConfig = () => {
    if (activeTab === 'collections') {
      return {
        title: 'Collections MIS Report',
        filename: 'GoSpeedy_Collections_MIS',
        columns: ['Category', 'Name / Identifier', 'Amount Collected (₹)', 'Date / Period'],
      };
    }
    if (activeTab === 'overdue') {
      return {
        title: 'Overdue Ageing Buckets Report',
        filename: 'GoSpeedy_Overdue_Ageing_MIS',
        columns: ['Bucket', 'Customer', 'Phone', 'Vehicle', 'Branch', 'Days Overdue', 'Outstanding', 'Late Fee', 'Manual Penalty', 'Net Due'],
      };
    }
    if (activeTab === 'penalties') {
      return {
        title: 'Fines & Penalties Register',
        filename: 'GoSpeedy_Penalties_Register',
        columns: ['Penalty ID', 'Date', 'Customer', 'Phone', 'Vehicle', 'Reason', 'Amount', 'Status', 'Added By'],
      };
    }
    return {
      title: 'Sales & Inventory Report',
      filename: 'GoSpeedy_Sales_MIS',
      columns: ['Model Name', 'Units Delivered', 'Total Revenue (₹)', 'Average Price (₹)'],
    };
  };

  const fetchReportsForExport = async () => {
    const rows = [];
    if (activeTab === 'collections' && collectionsData) {
      collectionsData.by_collector?.forEach(c => rows.push({
        'Category': 'Staff Collector',
        'Name / Identifier': c.name,
        'Amount Collected (₹)': c.total || 0,
        'Date / Period': `${startDate} to ${endDate}`,
        created_at: new Date().toISOString(),
      }));
      collectionsData.by_branch?.forEach(b => rows.push({
        'Category': 'Ward / Branch',
        'Name / Identifier': b.name,
        'Amount Collected (₹)': b.total || 0,
        'Date / Period': `${startDate} to ${endDate}`,
        created_at: new Date().toISOString(),
      }));
      collectionsData.daily_trend?.forEach(d => rows.push({
        'Category': 'Daily Trend',
        'Name / Identifier': d.date,
        'Amount Collected (₹)': d.total || 0,
        'Date / Period': d.date,
        created_at: d.date || new Date().toISOString(),
      }));
    } else if (activeTab === 'overdue' && overdueData) {
      Object.entries(overdueData.buckets || {}).forEach(([key, b]) => {
        b.customers?.forEach(c => {
          rows.push({
            'Bucket': b.label,
            'Customer': c.name || '—',
            'Phone': c.phone || '—',
            'Vehicle': c.vehicle_number || '—',
            'Branch': c.branch_name || '—',
            'Days Overdue': c.days_overdue || 0,
            'Outstanding': c.outstanding_installments || 0,
            'Late Fee': c.auto_late_fee || 0,
            'Manual Penalty': c.manual_penalties || 0,
            'Net Due': c.net_total_due || 0,
            created_at: new Date().toISOString(),
          });
        });
      });
    } else if (activeTab === 'penalties' && penaltiesData) {
      penaltiesData.data?.forEach(p => {
        rows.push({
          'Penalty ID': p.penalty_id || '—',
          'Date': p.penalty_date || '—',
          'Customer': p.tenant_name || '—',
          'Phone': p.customer_phone || '—',
          'Vehicle': p.vehicle_number || '—',
          'Reason': p.reason || '—',
          'Amount': p.amount || 0,
          'Status': p.status || '—',
          'Added By': p.created_by_name || '—',
          created_at: p.penalty_date || new Date().toISOString(),
        });
      });
    }
    return rows;
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto print:p-0">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <BarChart3 className="w-8 h-8 text-primary" />
            Executive Reports & Analytics MIS
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Collections breakdown, overdue ageing buckets, sales performance, and audit fines register.
          </p>
        </div>

        <div className="flex items-center gap-2.5 print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-semibold text-xs transition-all shadow-sm"
          >
            <Printer className="w-4 h-4 text-muted-foreground" />
            Print Report
          </button>
          <button
            onClick={() => setIsCustomExportOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-sm transition-all cursor-pointer"
            title="Download Report Data (Excel / CSV)"
          >
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Date Range Selector & Tabs */}
      <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Main Module Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'collections', label: 'Collections MIS', icon: IndianRupee },
              { id: 'overdue', label: 'Overdue Ageing', icon: AlertTriangle },
              { id: 'sales', label: 'Sales Performance', icon: TrendingUp },
              { id: 'penalties', label: 'Penalties Register', icon: ShieldAlert }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Date Presets */}
          <div className="flex items-center gap-1.5">
            {[
              { id: 'today', label: 'Today' },
              { id: 'last_7_days', label: 'Last 7 Days' },
              { id: 'this_month', label: 'This Month' },
              { id: 'custom', label: 'Custom' }
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleDatePresetChange(preset.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  datePreset === preset.id
                    ? 'bg-foreground text-background shadow-xs'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Inputs if Custom selected */}
        {datePreset === 'custom' && (
          <div className="flex items-center gap-3 pt-2 border-t border-border/50 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-semibold">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-input bg-background text-foreground"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-semibold">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-input bg-background text-foreground"
              />
            </div>
            <button
              onClick={fetchReports}
              className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90"
            >
              Apply Filter
            </button>
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      {loading ? (
        <div className="p-16 text-center text-muted-foreground rounded-2xl border border-border bg-card">
          <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
          <p className="font-semibold text-sm">Generating reports and aggregating figures...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: COLLECTIONS MIS */}
          {activeTab === 'collections' && collectionsData && (
            <div className="space-y-6">
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl border border-border bg-card shadow-sm">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Collection</span>
                  <div className="mt-2 text-2xl sm:text-3xl font-black text-foreground">
                    ₹{collectionsData.summary.total_collected.toLocaleString('en-IN')}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Across {collectionsData.summary.transactions_count} transactions</p>
                </div>

                <div className="p-5 rounded-2xl border border-border bg-card shadow-sm">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Online / UPI</span>
                  <div className="mt-2 text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                    ₹{collectionsData.summary.online_total.toLocaleString('en-IN')}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {collectionsData.summary.total_collected > 0
                      ? Math.round((collectionsData.summary.online_total / collectionsData.summary.total_collected) * 100)
                      : 0}% of collections
                  </p>
                </div>

                <div className="p-5 rounded-2xl border border-border bg-card shadow-sm">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cash Recovered</span>
                  <div className="mt-2 text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
                    ₹{collectionsData.summary.cash_total.toLocaleString('en-IN')}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Handed over by branch staff</p>
                </div>

                <div className="p-5 rounded-2xl border border-border bg-card shadow-sm">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Late Fees Collected</span>
                  <div className="mt-2 text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
                    ₹{collectionsData.summary.late_fee_collected.toLocaleString('en-IN')}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Overdue fines paid</p>
                </div>
              </div>

              {/* Breakdown Grids */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Collector Wise */}
                <div className="p-5 rounded-2xl border border-border bg-card shadow-sm">
                  <h3 className="font-bold text-foreground text-sm flex items-center justify-between mb-4">
                    <span>Staff / Field Collector Recovery</span>
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </h3>
                  <div className="space-y-3">
                    {collectionsData.by_collector?.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-4">No collection in this period.</p>
                    ) : (
                      collectionsData.by_collector?.map((col, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-border/50 text-xs">
                          <span className="font-semibold text-foreground">{col.name}</span>
                          <span className="font-bold text-foreground">₹{col.total.toLocaleString('en-IN')}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Branch Wise */}
                <div className="p-5 rounded-2xl border border-border bg-card shadow-sm">
                  <h3 className="font-bold text-foreground text-sm flex items-center justify-between mb-4">
                    <span>Branch & Ward Breakdown</span>
                    <Building className="w-4 h-4 text-muted-foreground" />
                  </h3>
                  <div className="space-y-3">
                    {collectionsData.by_branch?.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-4">No collection in this period.</p>
                    ) : (
                      collectionsData.by_branch?.map((b, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-border/50 text-xs">
                          <span className="font-semibold text-foreground">{b.name}</span>
                          <span className="font-bold text-foreground">₹{b.total.toLocaleString('en-IN')}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OVERDUE AGEING & DEFAULTERS */}
          {activeTab === 'overdue' && overdueData && (
            <div className="space-y-6">
              {/* Overdue Ageing Buckets Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { key: 'b1_15', label: '1 - 15 Days', color: 'border-amber-500/30 text-amber-600 bg-amber-500/5' },
                  { key: 'b16_30', label: '16 - 30 Days', color: 'border-orange-500/30 text-orange-600 bg-orange-500/5' },
                  { key: 'b31_60', label: '31 - 60 Days', color: 'border-red-500/30 text-red-600 bg-red-500/5' },
                  { key: 'b60_plus', label: '60+ Days (Critical)', color: 'border-destructive text-destructive bg-destructive/10' }
                ].map((bDef) => {
                  const b = overdueData.buckets?.[bDef.key] || { count: 0, total_due: 0 };
                  return (
                    <div key={bDef.key} className={`p-5 rounded-2xl border ${bDef.color} shadow-sm`}>
                      <span className="text-xs font-bold uppercase tracking-wider">{bDef.label}</span>
                      <div className="mt-2 text-2xl font-black">{b.count} Defaulters</div>
                      <div className="mt-1 text-sm font-semibold text-muted-foreground">
                        Total Due: ₹{b.total_due.toLocaleString('en-IN')}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Comprehensive Defaulters Table with Quick Penalty */}
              <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between">
                  <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    All Overdue Defaulters & Immediate Penalty Action
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    Total: {overdueData.summary?.total_defaulters} defaulters • ₹{overdueData.summary?.grand_total_overdue.toLocaleString('en-IN')} outstanding
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted text-muted-foreground uppercase font-bold border-b border-border">
                      <tr>
                        <th className="px-4 py-3">Customer & Phone</th>
                        <th className="px-4 py-3">Bike & Ward</th>
                        <th className="px-4 py-3">Days Overdue</th>
                        <th className="px-4 py-3">Principal Due</th>
                        <th className="px-4 py-3">Late Fee + Penalties</th>
                        <th className="px-4 py-3">Net Due</th>
                        <th className="px-4 py-3 text-right">Super Admin Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {Object.values(overdueData.buckets || {}).flatMap(b => b.customers || []).length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-10 text-muted-foreground">
                            🎉 No overdue defaulters found! All payments are up to date.
                          </td>
                        </tr>
                      ) : (
                        Object.values(overdueData.buckets || {})
                          .flatMap(b => b.customers || [])
                          .sort((a, b) => b.days_overdue - a.days_overdue)
                          .map((cust) => (
                            <tr key={cust.tenant_id} className="hover:bg-muted/30">
                              <td className="px-4 py-3 font-semibold text-foreground">
                                <div>{cust.name}</div>
                                <div className="text-[11px] text-muted-foreground font-mono">{cust.phone}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-foreground">{cust.vehicle_number}</div>
                                <div className="text-[11px] text-muted-foreground">{cust.branch_name}</div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 rounded-full font-bold bg-destructive/10 text-destructive border border-destructive/20">
                                  {cust.days_overdue} days
                                </span>
                              </td>
                              <td className="px-4 py-3 font-semibold">
                                ₹{cust.outstanding_installments.toLocaleString('en-IN')}
                              </td>
                              <td className="px-4 py-3 text-destructive font-medium">
                                ₹{cust.total_late_fee.toLocaleString('en-IN')}
                                {cust.manual_penalties > 0 && (
                                  <div className="text-[10px] text-muted-foreground">
                                    (incl. ₹{cust.manual_penalties} fine)
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 font-bold text-destructive text-sm">
                                ₹{cust.net_total_due.toLocaleString('en-IN')}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {isSuperAdmin && (
                                  <button
                                    onClick={() => setPenaltyModalTarget(cust)}
                                    className="px-2.5 py-1 rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold text-[11px] shadow-xs inline-flex items-center gap-1 transition-all"
                                  >
                                    <ShieldAlert className="w-3 h-3" />
                                    + Add Penalty
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SALES PERFORMANCE */}
          {activeTab === 'sales' && salesData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl border border-border bg-card shadow-sm">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Contracts</span>
                  <div className="mt-2 text-2xl sm:text-3xl font-black text-foreground">
                    {salesData.summary.total_contracts}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Rentals & Purchases combined</p>
                </div>

                <div className="p-5 rounded-2xl border border-border bg-card shadow-sm">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Rentals</span>
                  <div className="mt-2 text-2xl sm:text-3xl font-black text-primary">
                    {salesData.summary.active_rentals}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Currently operating</p>
                </div>

                <div className="p-5 rounded-2xl border border-border bg-card shadow-sm">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fully Paid / Sold</span>
                  <div className="mt-2 text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                    {salesData.summary.completed_sales}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Completed contracts</p>
                </div>

                <div className="p-5 rounded-2xl border border-border bg-card shadow-sm">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Gross Contract Value</span>
                  <div className="mt-2 text-2xl sm:text-3xl font-black text-foreground">
                    ₹{salesData.summary.total_contract_value.toLocaleString('en-IN')}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Principal booked</p>
                </div>
              </div>

              {/* Model & Branch Split */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl border border-border bg-card shadow-sm">
                  <h3 className="font-bold text-foreground text-sm mb-4">Model Performance</h3>
                  <div className="space-y-3 text-xs">
                    {salesData.by_model?.map((m, idx) => (
                      <div key={idx} className="flex justify-between py-2 border-b border-border/50">
                        <span className="font-semibold text-foreground">{m.name}</span>
                        <span className="font-bold text-foreground">{m.count} units</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-border bg-card shadow-sm">
                  <h3 className="font-bold text-foreground text-sm mb-4">Branch Distribution</h3>
                  <div className="space-y-3 text-xs">
                    {salesData.by_branch?.map((b, idx) => (
                      <div key={idx} className="flex justify-between py-2 border-b border-border/50">
                        <span className="font-semibold text-foreground">{b.name}</span>
                        <span className="font-bold text-foreground">{b.count} contracts</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PENALTIES REGISTER */}
          {activeTab === 'penalties' && (
            <div className="space-y-6">
              {penaltiesData && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl border border-border bg-card shadow-sm">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Levied Penalties</span>
                    <div className="mt-2 text-2xl sm:text-3xl font-black text-foreground">
                      ₹{(penaltiesData.summary?.total_amount || 0).toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{penaltiesData.summary?.total_count || 0} incidents recorded</p>
                  </div>

                  <div className="p-5 rounded-2xl border border-border bg-card shadow-sm">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Unpaid Penalties</span>
                    <div className="mt-2 text-2xl sm:text-3xl font-black text-destructive">
                      ₹{(penaltiesData.summary?.unpaid_amount || 0).toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Pending recovery</p>
                  </div>

                  <div className="p-5 rounded-2xl border border-border bg-card shadow-sm">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Waived by Super Admin</span>
                    <div className="mt-2 text-2xl sm:text-3xl font-black text-muted-foreground line-through">
                      ₹{(penaltiesData.summary?.waived_amount || 0).toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Excused / cancelled</p>
                  </div>

                  <div className="p-5 rounded-2xl border border-border bg-card shadow-sm">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Penalty Recovered</span>
                    <div className="mt-2 text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                      ₹{(penaltiesData.summary?.paid_amount || 0).toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Deposited to company</p>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between">
                  <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-destructive" />
                    Penalties & Fines Audit Register
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted text-muted-foreground uppercase font-bold border-b border-border">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Reason / Violation</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Authorized By</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {!penaltiesData || penaltiesData.data?.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-10 text-muted-foreground">
                            No manual penalties levied in this period.
                          </td>
                        </tr>
                      ) : (
                        penaltiesData.data?.map((pen) => (
                          <tr key={pen.penalty_id} className="hover:bg-muted/30">
                            <td className="px-4 py-3 font-mono">{pen.penalty_date}</td>
                            <td className="px-4 py-3 font-semibold text-foreground">
                              <div>{pen.tenant_name}</div>
                              <div className="text-[11px] text-muted-foreground font-mono">{pen.customer_phone}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-foreground">{pen.reason}</div>
                              {pen.notes && <div className="text-[11px] text-muted-foreground">{pen.notes}</div>}
                            </td>
                            <td className="px-4 py-3 font-bold text-destructive text-sm">
                              ₹{Number(pen.amount).toLocaleString('en-IN')}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                                pen.status === 'unpaid' ? 'bg-destructive/10 text-destructive border border-destructive/20' :
                                pen.status === 'waived' ? 'bg-muted text-muted-foreground line-through' :
                                'bg-emerald-500/10 text-emerald-600'
                              }`}>
                                {pen.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {pen.created_by_name || 'Super Admin'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {isSuperAdmin && pen.status === 'unpaid' && (
                                <button
                                  onClick={() => handleWaivePenalty(pen.penalty_id)}
                                  className="px-2.5 py-1 rounded-lg border border-destructive/30 hover:bg-destructive hover:text-destructive-foreground text-destructive font-semibold text-[11px] transition-all"
                                >
                                  Waive Fine
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Penalty Modal */}
      {penaltyModalTarget && (
        <AddPenaltyModal
          isOpen={Boolean(penaltyModalTarget)}
          target={penaltyModalTarget}
          onClose={() => setPenaltyModalTarget(null)}
          onSuccess={() => fetchReports()}
        />
      )}

      {/* Universal Custom Export Modal */}
      <CustomExportModal
        isOpen={isCustomExportOpen}
        onClose={() => setIsCustomExportOpen(false)}
        title={getReportExportConfig().title}
        subtitle="Download collections breakdown, overdue ageing buckets, and penalties (Excel / CSV)"
        defaultFilename={getReportExportConfig().filename}
        columns={getReportExportConfig().columns}
        dateAccessor="created_at"
        onFetchData={fetchReportsForExport}
      />
    </div>
  );
}
