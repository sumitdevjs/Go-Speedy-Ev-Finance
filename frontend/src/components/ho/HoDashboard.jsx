'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  MapPin,
  Bike,
  Users,
  AlertTriangle,
  TrendingUp,
  IndianRupee,
  Search,
  ChevronRight,
  ShieldCheck,
  ArrowUpRight,
  Phone,
  Activity,
  CheckCircle2,
  Zap,
  Filter,
  PackageCheck,
  AlertCircle,
} from 'lucide-react';
import Header from '../layout/Header';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import Table from '../ui/Table';
import Pagination from '../ui/Pagination';
import api from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/constants';
import { useAuthStore } from '../../store/authStore';
import { gsap, animateCounter } from '../../lib/gsap';

export default function HoDashboard() {
  const { user, selectedBranch, setSelectedBranch } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    headOffice: null,
    summary: {
      totalWards: 0,
      activeWards: 0,
      depletedStockWards: 0,
      totalStock: 0,
      activeRentals: 0,
      overdueCount: 0,
      totalCollections: 0,
      todayCollections: 0,
      modeBreakdown: { cash: 0, online: 0, cashPercent: 50, onlinePercent: 50 },
    },
    wardPerformance: [],
    recentRentals: [],
    recentOverdue: [],
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'stock_alert' | 'overdue_alert'
  const [hoPage, setHoPage] = useState(1);
  const HO_WARDS_PER_PAGE = 8;

  useEffect(() => {
    fetchDashboard();
  }, [selectedBranch]);

  // Also listen to branchChange event for instant reactive refetch
  useEffect(() => {
    const handleBranchChange = () => fetchDashboard();
    window.addEventListener('branchChange', handleBranchChange);
    return () => window.removeEventListener('branchChange', handleBranchChange);
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      // If a specific branch is drilled into, pass it as a query filter
      const branchParam = selectedBranch
        ? `?branch_id=${encodeURIComponent(selectedBranch.id || selectedBranch.code || selectedBranch.name)}`
        : '';
      const res = await api.get(`/api/head-offices/my-dashboard${branchParam}`);
      if (res.data?.success && res.data.data) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load HO dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  // GSAP animations on load
  useEffect(() => {
    if (!loading && data?.summary) {
      animateCounter('#gsap-ho-stock', data.summary.totalStock || 0);
      animateCounter('#gsap-ho-rentals', data.summary.activeRentals || 0);
      animateCounter('#gsap-ho-overdue', data.summary.overdueCount || 0);
      animateCounter('#gsap-ho-revenue', data.summary.totalCollections || 0, { prefix: '₹' });
      animateCounter('#gsap-ho-wards', data.summary.totalWards || 46);

      gsap.fromTo(
        '.gsap-ho-kpi',
        { opacity: 0, y: 18, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.08, ease: 'power2.out' }
      );
    }
  }, [loading, data]);

  const { headOffice, summary, wardPerformance, recentRentals, recentOverdue } = data;

  // Filtered wards
  const filteredWards = (wardPerformance || []).filter((w) => {
    const matchesSearch =
      !search.trim() ||
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      String(w.ward_no).includes(search) ||
      (w.contact_person && w.contact_person.toLowerCase().includes(search.toLowerCase())) ||
      (w.ward_area && w.ward_area.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'stock_alert') return w.stock_count === 0;
    if (statusFilter === 'overdue_alert') return w.overdue_count > 0;
    return true;
  });

  const handleSelectWard = (ward) => {
    setSelectedBranch(ward);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] pb-12 transition-colors">
      <Header
        title={headOffice?.name || 'Head Office Dashboard'}
        subtitle="Zonal Command Center • Fleet, Branches & Revenue Monitoring"
      />

      <div className="w-full px-3.5 sm:px-5 md:px-6 py-4 sm:py-6 space-y-6">
        {/* Zonal Header Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/80 border border-blue-500/25 p-5 sm:p-7 shadow-xl text-white">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Head Office Jurisdiction: {headOffice?.code || 'HEAD OFFICE'}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {headOffice?.name || 'Head Office Command'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Governing {summary.totalWards || 0} Operating Branches across {headOffice?.city || headOffice?.state || 'Zone'}</span>
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/branches"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs sm:text-sm font-bold tracking-wide transition-all shadow-lg shadow-blue-600/20 cursor-pointer"
              >
                <span>Manage {summary.totalWards || 0} Branches</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Ambient Glow */}
          <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
        </div>

        {/* Executive Territory KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-3.5">
          {/* Total Zonal Fleet */}
          <div className="gsap-ho-kpi rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/80 p-3.5 sm:p-4 shadow-xs flex items-center justify-between gap-2.5 transition-all min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                Total Fleet
              </p>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5 truncate">
                {loading ? <Spinner size="sm" /> : <span id="gsap-ho-stock">{summary.totalStock}</span>}
              </h3>
              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5 truncate">
                In wards
              </p>
            </div>
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Bike className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>

          {/* Active Rentals */}
          <div className="gsap-ho-kpi rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/80 p-3.5 sm:p-4 shadow-xs flex items-center justify-between gap-2.5 transition-all min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                Rentals
              </p>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5 truncate">
                {loading ? <Spinner size="sm" /> : <span id="gsap-ho-rentals">{summary.activeRentals}</span>}
              </h3>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 truncate">
                On road
              </p>
            </div>
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>

          {/* Overdue Cases */}
          <div className="gsap-ho-kpi rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/80 p-3.5 sm:p-4 shadow-xs flex items-center justify-between gap-2.5 transition-all min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                Overdue
              </p>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5 truncate">
                {loading ? <Spinner size="sm" /> : <span id="gsap-ho-overdue">{summary.overdueCount}</span>}
              </h3>
              <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-0.5 truncate">
                Payment alerts
              </p>
            </div>
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>

          {/* Total Collections */}
          <div className="gsap-ho-kpi rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/80 p-3.5 sm:p-4 shadow-xs flex items-center justify-between gap-2.5 transition-all min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                Collections
              </p>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5 truncate">
                {loading ? <Spinner size="sm" /> : <span id="gsap-ho-revenue">{formatCurrency(summary.totalCollections)}</span>}
              </h3>
              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5 truncate">
                Zone revenue
              </p>
            </div>
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <IndianRupee className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>

          {/* Governed Branches */}
          <div className="gsap-ho-kpi col-span-2 sm:col-span-1 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/80 p-3.5 sm:p-4 shadow-xs flex items-center justify-between gap-2.5 transition-all min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                Governed Wards
              </p>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5 truncate">
                {loading ? <Spinner size="sm" /> : <span id="gsap-ho-wards">{summary.totalWards}</span>}
              </h3>
              <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold mt-0.5 truncate">
                Active Hubs
              </p>
            </div>
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
        </div>

        {/* Ward Inventory Health Alert Banner */}
        {summary.depletedStockWards > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-3 min-w-0">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold truncate">
                  Inventory Alert: {summary.depletedStockWards} Ward(s) have 0 available EV stock.
                </p>
                <p className="text-[11px] sm:text-xs text-amber-700/80 dark:text-amber-400/80">
                  Replenishment is needed to support walk-in bookings and rental demand.
                </p>
              </div>
            </div>
            <button
              onClick={() => setStatusFilter(statusFilter === 'stock_alert' ? 'all' : 'stock_alert')}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer self-start sm:self-center shadow-xs"
            >
              {statusFilter === 'stock_alert' ? 'Show All Wards' : 'Filter 0-Stock Wards'}
            </button>
          </div>
        )}

        {/* Main Section: Ward-by-Ward Territory Performance Matrix */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/80 p-4 sm:p-6 shadow-xs min-w-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4 mb-5">
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                <span>Territory Ward Performance Matrix</span>
                <Badge variant="blue" size="sm">{filteredWards.length} Wards</Badge>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Live monitoring of stock, rentals, branch admin contacts and overdue recovery across {headOffice?.city || headOffice?.name || 'the zone'}
              </p>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 shrink-0">
              <div className="relative min-w-[200px] sm:min-w-[240px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setHoPage(1);
                  }}
                  placeholder="Search ward or candidate..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setHoPage(1);
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('overdue_alert');
                    setHoPage(1);
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    statusFilter === 'overdue_alert'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-rose-500'
                  }`}
                >
                  Overdue Alerts
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('stock_alert');
                    setHoPage(1);
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    statusFilter === 'stock_alert'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-amber-500'
                  }`}
                >
                  Low Stock
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="w-full overflow-x-auto rounded-xl border border-slate-200/60 dark:border-slate-800/80 scrollbar-thin">
            <table className="w-full table-fixed min-w-[760px] text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200/80 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-2.5 sm:px-3 w-[23%] min-w-[140px] whitespace-nowrap">Ward # & Name</th>
                  <th className="py-3 px-2.5 sm:px-3 w-[22%] min-w-[130px] whitespace-nowrap">Candidate / Contact</th>
                  <th className="py-3 px-2 sm:px-2.5 w-[12%] min-w-[80px] text-center whitespace-nowrap">EV Stock</th>
                  <th className="py-3 px-2 sm:px-2.5 w-[10%] min-w-[65px] text-center whitespace-nowrap">Rentals</th>
                  <th className="py-3 px-2 sm:px-2.5 w-[11%] min-w-[75px] text-center whitespace-nowrap">Overdue</th>
                  <th className="py-3 px-2 sm:px-2.5 w-[12%] min-w-[85px] text-right whitespace-nowrap">Collections</th>
                  <th className="py-3 px-2.5 sm:px-3 w-[10%] min-w-[80px] text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-slate-400">
                      <Spinner size="md" className="mx-auto text-blue-600 dark:text-blue-400" />
                    </td>
                  </tr>
                ) : filteredWards.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-slate-400">
                      No matching wards found.
                    </td>
                  </tr>
                ) : (
                  filteredWards.slice((hoPage - 1) * HO_WARDS_PER_PAGE, hoPage * HO_WARDS_PER_PAGE).map((ward) => (
                    <tr
                      key={ward.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 sm:py-3 px-2.5 sm:px-3 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-black text-[11px] flex items-center justify-center shrink-0">
                            {ward.ward_no || '•'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => handleSelectWard(ward)}
                              className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-left leading-tight truncate block cursor-pointer transition-colors"
                              title={`Inspect Ward ${ward.ward_no || ''}: ${ward.name}`}
                            >
                              {ward.name}
                            </button>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {ward.code} • {ward.ward_area}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 sm:py-3 px-2.5 sm:px-3 min-w-0">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {ward.contact_person || 'Unassigned'}
                            </p>
                            {ward.has_assigned_admin && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                                Admin
                              </span>
                            )}
                          </div>
                          {ward.phone && (
                            <a
                              href={`tel:${ward.phone}`}
                              className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-0.5 font-mono truncate"
                            >
                              <Phone className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{ward.phone}</span>
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 sm:py-3 px-2 sm:px-2.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ward.stock_count > 4
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : ward.stock_count > 0
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {ward.stock_count} EVs
                        </span>
                      </td>

                      <td className="py-2.5 sm:py-3 px-2 sm:px-2.5 text-center font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {ward.active_rentals}
                      </td>

                      <td className="py-2.5 sm:py-3 px-2 sm:px-2.5 text-center whitespace-nowrap">
                        {ward.overdue_count > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-[10px] font-extrabold border border-rose-500/30">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{ward.overdue_count} Case</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-2.5 sm:py-3 px-2 sm:px-2.5 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(ward.total_collected)}
                      </td>

                      <td className="py-2.5 sm:py-3 px-2.5 sm:px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSelectWard(ward)}
                            className="px-2.5 py-1 text-xs rounded-lg bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white text-blue-600 dark:text-blue-400 font-semibold transition-all cursor-pointer inline-flex items-center gap-1"
                            title={`Inspect ${ward.name} Ward Operations`}
                          >
                            <span>Inspect</span>
                          </button>
                          <Link
                            href={`/branches?search=${encodeURIComponent(ward.name)}`}
                            className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-all cursor-pointer inline-flex items-center gap-1"
                            title={`View ${ward.name} in Governed Branches`}
                          >
                            <span>Manage</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {Math.ceil(filteredWards.length / HO_WARDS_PER_PAGE) > 1 && (
            <Pagination
              currentPage={hoPage}
              totalPages={Math.ceil(filteredWards.length / HO_WARDS_PER_PAGE)}
              totalItems={filteredWards.length}
              onPageChange={setHoPage}
              className="mt-3 border border-slate-200/60 dark:border-slate-800 rounded-xl"
            />
          )}
        </div>

        {/* Territory Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live Overdue Watchlist */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/80 p-5 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Zonal Overdue & Recovery Watchlist</span>
              </h3>
              <Badge variant="rose" size="sm">
                {(recentOverdue || []).length} Delinquent
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              High priority payment lags across governed branches requiring zonal follow-up
            </p>

            <div className="space-y-2.5 flex-1">
              {(!recentOverdue || recentOverdue.length === 0) ? (
                <div className="text-center py-10 text-slate-400 text-xs flex flex-col items-center justify-center h-full">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500/80 mb-2" />
                  <p className="font-bold text-slate-700 dark:text-slate-300">All Accounts Up to Date</p>
                  <p className="text-[11px] text-slate-500">No overdue rental accounts found in this zone.</p>
                </div>
              ) : (
                recentOverdue.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold text-xs shrink-0">
                        {item.ward_no ? `W${item.ward_no}` : (item.ward_code || 'EV')}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {item.branch_name} • {item.model_name}
                        </p>
                        {item.phone && (
                          <a
                            href={`tel:${item.phone}`}
                            className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 mt-0.5"
                          >
                            <Phone className="w-2.5 h-2.5" />
                            <span>{item.phone}</span>
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-2">
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block">
                        {item.daysOverdue} Days Overdue
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatCurrency(item.outstanding)} Due
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Zonal Revenue Split & Shortcuts */}
          <div className="space-y-6 flex flex-col justify-between">
            {/* Zonal Collection Health */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/80 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-emerald-500" />
                  <span>Zonal Collection Health</span>
                </h3>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Today: <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{formatCurrency(summary.todayCollections || 0)}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Total zone revenue vs active recoverable installment debt
              </p>

              {/* Progress bar for Cash vs Online split */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Online: {summary.modeBreakdown?.onlinePercent ?? 0}% ({formatCurrency(summary.modeBreakdown?.online || 0)})
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Cash: {summary.modeBreakdown?.cashPercent ?? 0}% ({formatCurrency(summary.modeBreakdown?.cash || 0)})
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${summary.modeBreakdown?.onlinePercent ?? 0}%` }}
                    className="bg-blue-500 h-full transition-all duration-500"
                  />
                  <div
                    style={{ width: `${summary.modeBreakdown?.cashPercent ?? 100}%` }}
                    className="bg-emerald-500 h-full transition-all duration-500"
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Total Active Outstanding</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {formatCurrency(summary.totalOutstanding || 0)}
                </span>
              </div>
            </div>

            {/* Quick Zonal Actions & Direct Links */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/80 p-5 shadow-xs">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Head Office Command Shortcuts</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Rapid tools to manage branches, assign branch admins, audit inventory, and monitor zone collections.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href="/branches"
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all text-left group"
                >
                  <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Governed Branches</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Edit locations, phone & contacts</p>
                </Link>

                <Link
                  href="/staff"
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-500/40 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 transition-all text-left group"
                >
                  <Users className="w-5 h-5 text-purple-600 dark:text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Branch Admins & Staff</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Assign branch managers & operators</p>
                </Link>

                <Link
                  href="/models"
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-all text-left group"
                >
                  <Bike className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Fleet & Models</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Audit battery specs & stock counts</p>
                </Link>

                <Link
                  href="/rentals"
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all text-left group"
                >
                  <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Zonal Tenants</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Contracts & rent-to-own balances</p>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
