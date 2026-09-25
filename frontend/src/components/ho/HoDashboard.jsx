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
      totalWards: 46,
      activeWards: 46,
      depletedStockWards: 0,
      totalStock: 0,
      activeRentals: 0,
      overdueCount: 0,
      totalCollections: 0,
    },
    wardPerformance: [],
    recentRentals: [],
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'stock_alert' | 'overdue_alert'

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/head-offices/my-dashboard');
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

  const { headOffice, summary, wardPerformance, recentRentals } = data;

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-12 transition-colors">
      <Header
        title={headOffice?.name || 'Delhi Head Office'}
        subtitle="Zonal Command Center • Fleet, Wards & Revenue Monitoring"
      />

      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Zonal Header Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/80 border border-blue-500/25 p-5 sm:p-7 shadow-xl text-white">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Head Office Jurisdiction: {headOffice?.code || 'DEL-HO'}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {headOffice?.name || 'Delhi Head Office'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Governing {summary.totalWards || 46} Ward Operating Desks across {headOffice?.city || 'Delhi NCT'}</span>
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/branches"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs sm:text-sm font-bold tracking-wide transition-all shadow-lg shadow-blue-600/20 cursor-pointer"
              >
                <span>Manage 46 Wards</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Ambient Glow */}
          <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
        </div>

        {/* Executive Territory KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Zonal Fleet */}
          <div className="gsap-ho-kpi rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/80 p-5 shadow-xs flex items-center justify-between transition-all">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Zonal EV Fleet
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {loading ? <Spinner size="sm" /> : <span id="gsap-ho-stock">{summary.totalStock}</span>}
              </h3>
              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium mt-1">
                Available in wards
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Bike className="h-5 w-5" />
            </div>
          </div>

          {/* Active Rentals */}
          <div className="gsap-ho-kpi rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/80 p-5 shadow-xs flex items-center justify-between transition-all">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Active Rentals
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {loading ? <Spinner size="sm" /> : <span id="gsap-ho-rentals">{summary.activeRentals}</span>}
              </h3>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                Live on road
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5" />
            </div>
          </div>

          {/* Overdue Cases */}
          <div className="gsap-ho-kpi rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/80 p-5 shadow-xs flex items-center justify-between transition-all">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Territory Overdue
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {loading ? <Spinner size="sm" /> : <span id="gsap-ho-overdue">{summary.overdueCount}</span>}
              </h3>
              <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium mt-1">
                Payment lag alert
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>

          {/* Total Collections */}
          <div className="gsap-ho-kpi rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/80 p-5 shadow-xs flex items-center justify-between transition-all">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Collections
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {loading ? <Spinner size="sm" /> : <span id="gsap-ho-revenue">{formatCurrency(summary.totalCollections)}</span>}
              </h3>
              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium mt-1">
                Aggregate zone revenue
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <IndianRupee className="h-5 w-5" />
            </div>
          </div>

          {/* Governed Wards */}
          <div className="gsap-ho-kpi rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/80 p-5 shadow-xs flex items-center justify-between transition-all">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Governed Wards
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {loading ? <Spinner size="sm" /> : <span id="gsap-ho-wards">{summary.totalWards}</span>}
              </h3>
              <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium mt-1">
                All 46 Delhi Hubs
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Ward Inventory Health Alert Banner */}
        {summary.depletedStockWards > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center justify-between gap-4 text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-bold">
                  Inventory Alert: {summary.depletedStockWards} Ward(s) have 0 available EV stock.
                </p>
                <p className="text-[11px] sm:text-xs text-amber-700/80 dark:text-amber-400/80">
                  Replenishment is needed to support walk-in bookings and rental demand.
                </p>
              </div>
            </div>
            <button
              onClick={() => setStatusFilter(statusFilter === 'stock_alert' ? 'all' : 'stock_alert')}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer"
            >
              {statusFilter === 'stock_alert' ? 'Show All Wards' : 'Filter 0-Stock Wards'}
            </button>
          </div>
        )}

        {/* Main Section: Ward-by-Ward Territory Performance Matrix */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/80 p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Territory Ward Performance Matrix</span>
                <Badge variant="blue" size="sm">{filteredWards.length} Wards</Badge>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Live monitoring of stock, rentals, candidate contacts and overdue recovery across Delhi
              </p>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search ward or candidate..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
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
                  onClick={() => setStatusFilter('overdue_alert')}
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
                  onClick={() => setStatusFilter('stock_alert')}
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold border-y border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3">Ward # & Name</th>
                  <th className="py-3 px-3">Candidate / Contact</th>
                  <th className="py-3 px-3 text-center">Available Stock</th>
                  <th className="py-3 px-3 text-center">Active Rentals</th>
                  <th className="py-3 px-3 text-center">Overdue Cases</th>
                  <th className="py-3 px-3 text-right">Zone Collections</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-slate-400">
                      <Spinner size="md" />
                    </td>
                  </tr>
                ) : filteredWards.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-slate-400">
                      No matching wards found.
                    </td>
                  </tr>
                ) : (
                  filteredWards.map((ward) => (
                    <tr
                      key={ward.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-black text-[11px] flex items-center justify-center shrink-0">
                            {ward.ward_no || '•'}
                          </span>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white leading-tight">
                              {ward.name}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              {ward.code} • {ward.ward_area}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {ward.contact_person}
                        </p>
                        {ward.phone && (
                          <a
                            href={`tel:${ward.phone}`}
                            className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <Phone className="w-2.5 h-2.5" />
                            <span>{ward.phone}</span>
                          </a>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
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

                      <td className="py-3 px-3 text-center font-bold text-slate-900 dark:text-white">
                        {ward.active_rentals}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {ward.overdue_count > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-[11px] font-extrabold border border-rose-500/30">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{ward.overdue_count} Case</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                        {formatCurrency(ward.total_collected)}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleSelectWard(ward)}
                          className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white text-slate-700 dark:text-slate-300 font-semibold transition-all cursor-pointer inline-flex items-center gap-1"
                          title={`Switch dashboard filter to Ward ${ward.ward_no}`}
                        >
                          <span>Filter</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Territory Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overdue Watchlist */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/80 p-5 shadow-xs">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>Zonal Overdue & Recovery Watchlist</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              High priority payment lags across Delhi wards requiring zonal follow-up
            </p>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold text-xs">
                    W2
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Ward 2: Saroop Nagar</p>
                    <p className="text-[10px] text-slate-500">Candidate: S. Sukhbir Singh Karala (9810141630)</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block">5 Days Overdue</span>
                  <span className="text-[10px] text-slate-400">₹65,500 Outstanding</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold text-xs">
                    W9
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Ward 9: Punjabi Bagh</p>
                    <p className="text-[10px] text-slate-500">Candidate: S. Manjinder Singh Sirsa (9810333333)</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block">3 Days Overdue</span>
                  <span className="text-[10px] text-slate-400">₹45,000 Outstanding</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold text-xs">
                    W16
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Ward 16: Tagore Garden</p>
                    <p className="text-[10px] text-slate-500">Candidate: S. Bhupinder Singh Anand (9873730737)</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block">2 Days Overdue</span>
                  <span className="text-[10px] text-slate-400">₹32,000 Outstanding</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Zonal Actions & Direct Link */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/80 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Head Office Command Shortcuts</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Rapid tools to audit inventory, reallocate stock between Delhi wards, and export territory reports.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href="/branches"
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all text-left group"
                >
                  <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Ward Registry</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Edit candidates, phone & addresses</p>
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

                <Link
                  href="/purchases"
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500/40 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-cyan-50/50 dark:hover:bg-cyan-950/30 transition-all text-left group"
                >
                  <IndianRupee className="w-5 h-5 text-cyan-600 dark:text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Revenue & Ledger</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Payments & downpayment reconciliation</p>
                </Link>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <span>Go Speedy EV Finance Platform • Multi-Branch System</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live 24x7 Sync
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
