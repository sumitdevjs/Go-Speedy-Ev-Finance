'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bike,
  Users,
  AlertTriangle,
  IndianRupee,
  PlusCircle,
  CalendarCheck,
  ArrowRight,
  Phone,
  CheckCircle2,
  MapPin,
  Activity,
  TrendingUp,
  ShieldCheck,
  User,
  Clock,
  Banknote,
  Package,
  RotateCcw,
  BadgeCheck,
} from 'lucide-react';
import Header from '../layout/Header';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import QuickPaymentModal from '../staff/QuickPaymentModal';
import ReturnEvModal from '../staff/ReturnEvModal';
import StaffProfileModal from '../staff/StaffProfileModal';
import api from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/constants';
import { useAuthStore } from '../../store/authStore';
import { gsap, animateCounter, staggerFadeIn } from '../../lib/gsap';

export default function BranchDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    branch: null,
    summary: {
      totalStock: 0,
      oldStock: 0,
      activeRentals: 0,
      overdueCount: 0,
      todayCollections: 0,
      totalCollections: 0,
      staffCount: 0,
      pendingBookings: 0,
    },
    overdueTenants: [],
    recentRentals: [],
    staffList: [],
    recentPayments: [],
  });

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedTenantForPayment, setSelectedTenantForPayment] = useState(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/branches/my-dashboard');
      if (res.data?.success && res.data.data) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load branch dashboard:', err);
      // On API error, try to compose from individual endpoints
      await fetchFallbackData();
    } finally {
      setLoading(false);
    }
  };

  const fetchFallbackData = async () => {
    try {
      const [modelsRes, rentalsRes, paymentsRes] = await Promise.all([
        api.get('/api/models/dropdown'),
        api.get('/api/rentals?limit=100'),
        api.get('/api/payments?limit=100'),
      ]);

      const models = modelsRes.data?.data || [];
      const rentals = rentalsRes.data?.data || [];
      const payments = paymentsRes.data?.data || [];

      const active = rentals.filter(r => r.status === 'rented');
      const overdue = active
        .filter(r => r.computed_balance && r.computed_balance.daysOverdue > 0)
        .sort((a, b) => b.computed_balance.daysOverdue - a.computed_balance.daysOverdue);

      const todayStr = new Date().toISOString().split('T')[0];
      const todayTotal = payments
        .filter(p => (p.payment_date || '').startsWith(todayStr))
        .reduce((s, p) => s + Number(p.amount || 0), 0);

      setData(prev => ({
        ...prev,
        summary: {
          totalStock: models.filter(m => m.is_active).reduce((s, m) => s + (m.stock_count || 0), 0),
          oldStock: 0,
          activeRentals: active.length,
          overdueCount: overdue.length,
          todayCollections: todayTotal,
          totalCollections: payments.reduce((s, p) => s + Number(p.amount || 0), 0),
          staffCount: 0,
          pendingBookings: 0,
        },
        overdueTenants: overdue.slice(0, 8),
        recentRentals: rentals.slice(0, 6),
        recentPayments: payments.slice(0, 6),
      }));
    } catch (err) {
      console.error('Fallback data fetch failed:', err);
    }
  };

  const { branch, summary, overdueTenants, recentRentals, staffList, recentPayments } = data;

  // GSAP animations
  useEffect(() => {
    if (!loading) {
      staggerFadeIn('.gsap-branch-kpi', { stagger: 0.07, y: 16, duration: 0.5, hover: true });
      staggerFadeIn('.gsap-branch-action', { stagger: 0.06, y: 12, duration: 0.45, delay: 0.05, hover: true });
      staggerFadeIn('.gsap-branch-feed', { stagger: 0.04, y: 8, duration: 0.4, delay: 0.1 });

      animateCounter('#gsap-branch-stock', summary.totalStock, { duration: 0.8 });
      animateCounter('#gsap-branch-active', summary.activeRentals, { duration: 0.8 });
      animateCounter('#gsap-branch-overdue', summary.overdueCount, { duration: 0.8 });
      animateCounter('#gsap-branch-today', summary.todayCollections, { prefix: '₹', duration: 1 });
      animateCounter('#gsap-branch-total', summary.totalCollections, { prefix: '₹', duration: 1.2 });
      animateCounter('#gsap-branch-staff', summary.staffCount, { duration: 0.7 });
    }
  }, [loading, summary]);

  const todayDateFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div className="w-full">
      {/* Header */}
      <Header
        title={branch ? `${branch.name}` : 'Ward Dashboard'}
        subtitle={branch
          ? `Ward ${branch.ward_no || '—'} · ${branch.ward_area || branch.address || 'Delhi'}`
          : `Branch Operations · ${todayDateFormatted}`}
        action={
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              icon={User}
              onClick={() => setIsProfileModalOpen(true)}
              className="h-9 px-3 sm:px-3.5 text-xs font-semibold shrink-0"
              title="My Profile"
            >
              <span className="hidden sm:inline">My Profile</span>
            </Button>
            <Link href="/rentals/new">
              <Button
                variant="primary"
                size="sm"
                icon={PlusCircle}
                className="h-9 px-3 sm:px-3.5 text-xs font-bold shrink-0 shadow-xs"
                title="Issue Rental"
              >
                <span className="hidden sm:inline">Issue Rental</span>
                <span className="sm:hidden">Rental</span>
              </Button>
            </Link>
          </div>
        }
      />

      <div className="w-full px-3.5 sm:px-5 md:px-6 py-4 sm:py-6 space-y-6 pb-8">

        {/* ── WARD IDENTITY BANNER ── */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-[#0d1527] dark:via-[#111e38] dark:to-[#0d1527] border border-slate-700/50 dark:border-white/10 p-5 md:p-6 text-white shadow-lg relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="absolute right-0 top-0 w-64 h-64 rounded-full bg-blue-400 blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute left-0 bottom-0 w-48 h-48 rounded-full bg-emerald-400 blur-3xl translate-y-1/2 -translate-x-1/4" />
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Ward Active
                </span>
                {branch?.ward_no && (
                  <span className="text-xs text-slate-400 font-medium">Ward #{branch.ward_no}</span>
                )}
              </div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>Hello, {user?.name || branch?.contact_person || 'Ward Admin'}!</span>
                <span>👋</span>
              </h2>
              <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-xl">
                {branch
                  ? `Managing ${branch.name} • ${branch.ward_area || branch.address || ''}`
                  : "Your ward operations centre. Here's what needs attention today."}
              </p>
              {(branch?.contact_person || branch?.phone) && (
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                  {branch.contact_person && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" /> {branch.contact_person}
                    </span>
                  )}
                  {branch.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {branch.phone}
                    </span>
                  )}
                  {branch.address && (
                    <span className="flex items-center gap-1 hidden sm:flex">
                      <MapPin className="w-3 h-3" /> {branch.address}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Today's collection pill */}
            <div className="flex items-center gap-3 bg-white/10 dark:bg-white/5 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 self-start sm:self-center shrink-0">
              <IndianRupee className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  Today&apos;s Collections
                </p>
                <p id="gsap-branch-today" className="text-lg font-black text-emerald-300">
                  {loading ? '...' : formatCurrency(summary.todayCollections)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 4 KPI STAT CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* Stock */}
          <div className="gsap-branch-kpi lg:col-span-1 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl p-4 shadow-xs flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">EV Stock</span>
              <Bike className="w-4 h-4 text-blue-500 shrink-0" />
            </div>
            <div className="mt-2 min-w-0">
              <h4 id="gsap-branch-stock" className="text-2xl font-black text-slate-900 dark:text-white truncate">
                {loading ? <Spinner size="sm" /> : summary.totalStock}
              </h4>
              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5 truncate">Ready to deploy</p>
            </div>
          </div>

          {/* Active Rentals */}
          <div className="gsap-branch-kpi rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl p-4 shadow-xs flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active</span>
              <Users className="w-4 h-4 text-emerald-500 shrink-0" />
            </div>
            <div className="mt-2 min-w-0">
              <h4 id="gsap-branch-active" className="text-2xl font-black text-slate-900 dark:text-white truncate">
                {loading ? <Spinner size="sm" /> : summary.activeRentals}
              </h4>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 truncate">On rent-to-own</p>
            </div>
          </div>

          {/* Overdue */}
          <div className="gsap-branch-kpi rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl p-4 shadow-xs flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Overdue</span>
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            </div>
            <div className="mt-2 min-w-0">
              <h4 id="gsap-branch-overdue" className="text-2xl font-black text-rose-600 dark:text-rose-400 truncate">
                {loading ? <Spinner size="sm" /> : summary.overdueCount}
              </h4>
              <p className="text-[10px] text-rose-500 dark:text-rose-400 font-semibold mt-0.5 truncate">Need follow-up</p>
            </div>
          </div>

          {/* Bookings */}
          <div className="gsap-branch-kpi rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl p-4 shadow-xs flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Bookings</span>
              <CalendarCheck className="w-4 h-4 text-purple-500 shrink-0" />
            </div>
            <div className="mt-2 min-w-0">
              <h4 className="text-2xl font-black text-purple-600 dark:text-purple-400 truncate">
                {loading ? <Spinner size="sm" /> : summary.pendingBookings}
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">Pending convert</p>
            </div>
          </div>

          {/* Staff */}
          <div className="gsap-branch-kpi rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl p-4 shadow-xs flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Staff</span>
              <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0" />
            </div>
            <div className="mt-2 min-w-0">
              <h4 id="gsap-branch-staff" className="text-2xl font-black text-slate-900 dark:text-white truncate">
                {loading ? <Spinner size="sm" /> : summary.staffCount}
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">Active members</p>
            </div>
          </div>

          {/* Total Collections */}
          <div className="gsap-branch-kpi col-span-2 sm:col-span-1 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl p-4 shadow-xs flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Collected</span>
              <IndianRupee className="w-4 h-4 text-teal-500 shrink-0" />
            </div>
            <div className="mt-2 min-w-0">
              <h4 id="gsap-branch-total" className="text-xl font-black text-emerald-600 dark:text-emerald-400 truncate">
                {loading ? <Spinner size="sm" /> : formatCurrency(summary.totalCollections)}
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">All time</p>
            </div>
          </div>
        </div>

        {/* ── 4 ACTION TILES ── */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 px-1">
            Fast Desk Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/rentals/new"
              className="gsap-branch-action group p-5 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-md hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 flex flex-col justify-between min-h-[130px]"
            >
              <div className="flex items-center justify-between">
                <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center">
                  <PlusCircle className="h-6 w-6" />
                </div>
                <ArrowRight className="h-5 w-5 text-white/70 group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="mt-3">
                <h4 className="text-base font-bold leading-tight">Issue New Rental</h4>
                <p className="text-xs text-blue-100 mt-0.5">9-step fast onboarding wizard</p>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => { setSelectedTenantForPayment(null); setIsPaymentModalOpen(true); }}
              className="gsap-branch-action group text-left p-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-md hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 flex flex-col justify-between min-h-[130px]"
            >
              <div className="flex items-center justify-between">
                <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center">
                  <Banknote className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/20">Fast Collect</span>
              </div>
              <div className="mt-3">
                <h4 className="text-base font-bold leading-tight">Record Payment</h4>
                <p className="text-xs text-emerald-100 mt-0.5">Instant cash / UPI daily receipt</p>
              </div>
            </button>

            <Link
              href="/bookings"
              className="gsap-branch-action group p-5 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white shadow-md hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 flex flex-col justify-between min-h-[130px]"
            >
              <div className="flex items-center justify-between">
                <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center">
                  <CalendarCheck className="h-6 w-6" />
                </div>
                {summary.pendingBookings > 0 && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-900">
                    {summary.pendingBookings} Pending
                  </span>
                )}
              </div>
              <div className="mt-3">
                <h4 className="text-base font-bold leading-tight">Process Bookings</h4>
                <p className="text-xs text-indigo-100 mt-0.5">Convert customer reservations</p>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setIsReturnModalOpen(true)}
              className="gsap-branch-action group text-left p-5 rounded-2xl bg-gradient-to-br from-amber-600 to-orange-700 hover:from-amber-500 hover:to-orange-600 text-white shadow-md hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 flex flex-col justify-between min-h-[130px]"
            >
              <div className="flex items-center justify-between">
                <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center">
                  <RotateCcw className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/20">Vehicle Check-in</span>
              </div>
              <div className="mt-3">
                <h4 className="text-base font-bold leading-tight">Return EV</h4>
                <p className="text-xs text-amber-100 mt-0.5">Inspect &amp; close rental contract</p>
              </div>
            </button>
          </div>
        </div>

        {/* ── TWO FEED COLUMNS: Overdue + Recent Rentals ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overdue Follow-ups */}
          <Card
            title="Overdue Accounts — Your Ward"
            subtitle="Sorted by days overdue — immediate follow-up needed"
            action={
              <Link
                href="/rentals?overdue_days=1"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/25 transition-all shadow-2xs active:scale-95 shrink-0"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {loading ? (
              <div className="py-8 text-center"><Spinner size="md" className="mx-auto text-blue-600" /></div>
            ) : overdueTenants.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">All accounts on track!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">No tenants in your ward are currently overdue.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {overdueTenants.map((t) => (
                  <div key={t.id} className="gsap-branch-feed py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/rentals/${t.id}`}
                        className="text-xs font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate block"
                      >
                        {t.name}
                      </Link>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{t.phone}</span>
                        <span>•</span>
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">
                          {t.computed_balance?.daysOverdue}d overdue
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white text-right">
                        {formatCurrency(t.computed_balance?.outstanding)}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setSelectedTenantForPayment(t); setIsPaymentModalOpen(true); }}
                        icon={IndianRupee}
                      >
                        Collect
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Rentals */}
          <Card
            title="Recent Rentals — Your Ward"
            subtitle="Latest contracts registered in this branch"
            action={
              <Link
                href="/rentals"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/25 transition-all shadow-2xs active:scale-95 shrink-0"
              >
                <span>All Rentals</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {loading ? (
              <div className="py-8 text-center"><Spinner size="md" className="mx-auto text-blue-600" /></div>
            ) : recentRentals.length === 0 ? (
              <div className="py-8 text-center">
                <Package className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">No rentals registered yet.</p>
                <Link href="/rentals/new" className="mt-2 inline-block">
                  <Button variant="primary" size="sm">Create First Rental</Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {recentRentals.map((r) => (
                  <div key={r.id} className="gsap-branch-feed py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/rentals/${r.id}`}
                        className="text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 truncate block"
                      >
                        {r.name}
                      </Link>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDate(r.created_at)}
                        {r.ev_models?.name && <span className="ml-1 text-blue-500 dark:text-blue-400">· {r.ev_models.name}</span>}
                      </p>
                    </div>
                    <Badge status={r.status} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ── STAFF IN THIS WARD ── */}
        {staffList.length > 0 && (
          <Card
            title="Staff Members — This Ward"
            subtitle="Active team assigned to your branch"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {staffList.map((s) => (
                <div
                  key={s.id}
                  className="gsap-branch-feed flex items-center gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/40"
                >
                  <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-black text-sm">
                    {(s.name || 'S').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{s.name}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 capitalize">{s.role?.replace('_', ' ')}</p>
                    {s.phone && (
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-2.5 h-2.5" />{s.phone}
                      </p>
                    )}
                  </div>
                  <BadgeCheck className="w-4 h-4 text-emerald-500 shrink-0 ml-auto" />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── RECENT PAYMENTS ── */}
        {recentPayments.length > 0 && (
          <Card
            title="Recent Payments — Your Ward"
            subtitle="Last 6 payment transactions recorded"
            action={
              <Link
                href="/rentals"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/25 transition-all shadow-2xs active:scale-95 shrink-0"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {recentPayments.map((p) => (
                <div key={p.id} className="gsap-branch-feed py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {p.tenants?.name || 'Unknown Tenant'}
                    </p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {p.payment_date ? formatDate(p.payment_date) : '—'}
                      {p.method && <span className="capitalize">· {p.method}</span>}
                    </p>
                  </div>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                    +{formatCurrency(p.amount)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

      </div>

      {/* Modals */}
      <QuickPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => { setIsPaymentModalOpen(false); setSelectedTenantForPayment(null); }}
        initialTenant={selectedTenantForPayment}
        onPaymentSuccess={fetchDashboard}
      />
      <ReturnEvModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        onReturnSuccess={fetchDashboard}
      />
      <StaffProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
}
