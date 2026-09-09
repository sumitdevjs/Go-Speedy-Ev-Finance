'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bike,
  Users,
  CalendarCheck,
  IndianRupee,
  AlertTriangle,
  PlusCircle,
  RotateCcw,
  Clock,
  ArrowRight,
  Phone,
  CheckCircle2,
  User,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import Header from '../layout/Header';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Spinner from '../ui/Spinner';
import Table from '../ui/Table';
import QuickPaymentModal from './QuickPaymentModal';
import ReturnEvModal from './ReturnEvModal';
import StaffProfileModal from './StaffProfileModal';
import api from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/constants';
import { useAuthStore } from '../../store/authStore';
import { gsap, animateCounter, staggerFadeIn } from '../../lib/gsap';

export default function StaffDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    availableStock: 0,
    pendingBookingsCount: 0,
    activeRentalsCount: 0,
    todayCollections: 0,
    overdueCount: 0,
  });

  const [pendingBookings, setPendingBookings] = useState([]);
  const [overdueTenants, setOverdueTenants] = useState([]);
  const [evModels, setEvModels] = useState([]);
  const [todayPayments, setTodayPayments] = useState([]);

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedTenantForPayment, setSelectedTenantForPayment] = useState(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    fetchStaffData();
  }, []);

  const fetchStaffData = async () => {
    try {
      setLoading(true);

      // 1. Fetch EV Models
      const modelsRes = await api.get('/api/models');
      const models = modelsRes.data?.data || [];
      const totalAvailable = models.reduce((sum, m) => sum + (m.stock_count || 0), 0);
      setEvModels(models);

      // 2. Fetch Rentals
      const rentalsRes = await api.get('/api/rentals?limit=100');
      const rentals = rentalsRes.data?.data || [];
      const active = rentals.filter((r) => r.status === 'rented');
      const overdue = active
        .filter((r) => r.computed_balance && r.computed_balance.daysOverdue > 0)
        .sort((a, b) => b.computed_balance.daysOverdue - a.computed_balance.daysOverdue);

      setOverdueTenants(overdue.slice(0, 5));

      // 3. Fetch Bookings (pending walk-ins)
      const bookingsRes = await api.get('/api/bookings');
      const bookings = bookingsRes.data?.data || [];
      const pending = bookings.filter((b) => b.status === 'pending');
      setPendingBookings(pending.slice(0, 5));

      // 4. Fetch Payments
      const paymentsRes = await api.get('/api/payments?limit=100');
      const payments = paymentsRes.data?.data || [];

      // Filter today's collections
      const todayStr = new Date().toISOString().split('T')[0];
      const todayOnly = payments.filter((p) => (p.payment_date || '').startsWith(todayStr));
      const todayTotal = todayOnly.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      setTodayPayments(todayOnly.slice(0, 6));

      setStats({
        availableStock: totalAvailable,
        pendingBookingsCount: pending.length,
        activeRentalsCount: active.length,
        todayCollections: todayTotal,
        overdueCount: overdue.length,
      });
    } catch (err) {
      console.error('Error loading staff dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      // Stagger action tiles & KPI cards with GSAP
      staggerFadeIn('.gsap-action-card', { stagger: 0.07, y: 14, duration: 0.45, hover: true });
      staggerFadeIn('.gsap-kpi-card', { stagger: 0.05, y: 12, duration: 0.45, delay: 0.05, hover: true });
      staggerFadeIn('.gsap-feed-item', { stagger: 0.04, y: 10, duration: 0.4, delay: 0.1 });

      // Rolling number counters with GSAP
      animateCounter('#gsap-kpi-available', stats.availableStock, { duration: 0.8 });
      animateCounter('#gsap-kpi-pending', stats.pendingBookingsCount, { duration: 0.8 });
      animateCounter('#gsap-kpi-rentals', stats.activeRentalsCount, { duration: 0.8 });
      animateCounter('#gsap-kpi-overdue', stats.overdueCount, { duration: 0.8 });
      animateCounter('#gsap-kpi-cash', stats.todayCollections, { prefix: '₹', duration: 1 });
      animateCounter('#gsap-banner-collection', stats.todayCollections, { prefix: '₹', duration: 1 });
    }
  }, [loading, stats]);

  const openPaymentForTenant = (tenant) => {
    setSelectedTenantForPayment(tenant);
    setIsPaymentModalOpen(true);
  };

  const todayDateFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen">
      {/* Staff Header */}
      <Header
        title="Operations Desk"
        subtitle={`Live Operational Queue • ${todayDateFormatted}`}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={User}
              onClick={() => setIsProfileModalOpen(true)}
            >
              <span className="hidden sm:inline">My Profile</span>
            </Button>
            <Link href="/rentals/new">
              <Button variant="primary" size="sm" icon={PlusCircle}>
                <span className="hidden sm:inline">Issue Rental</span>
                <span className="sm:hidden">New</span>
              </Button>
            </Link>
          </div>
        }
      />

      <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto">
        {/* Welcome & Shift Status Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-[#0d1527] dark:via-[#111e38] dark:to-[#0d1527] border border-slate-700/50 dark:border-white/10 p-5 md:p-6 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live on Shift
                </span>
                <span className="text-xs text-slate-400">Delhi HQ Hub</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Hello, {user?.name || 'Staff Operator'}!
              </h2>
              <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-xl">
                Ready for daily dispatch and collections. Here is what requires your attention today.
              </p>
            </div>

            {/* Shift Summary Pill */}
            <div className="flex items-center gap-3 bg-white/10 dark:bg-white/5 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 self-start sm:self-center shrink-0">
              <IndianRupee className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  Today&apos;s Desk Collection
                </p>
                <p id="gsap-banner-collection" className="text-lg font-black text-emerald-300">
                  {loading ? '...' : formatCurrency(stats.todayCollections)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 4 BIG ACTION TILES (Action-Focused) ── */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 px-1">
            Fast Desk Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Action 1: Issue Rental */}
            <Link
              href="/rentals/new"
              className="gsap-action-card group p-5 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-md hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 flex flex-col justify-between min-h-[130px]"
            >
              <div className="flex items-center justify-between">
                <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  <PlusCircle className="h-6 w-6" />
                </div>
                <ArrowRight className="h-5 w-5 text-white/70 group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="mt-3">
                <h4 className="text-base font-bold text-white leading-tight">Issue New Rental</h4>
                <p className="text-xs text-blue-100 mt-0.5">8-step fast onboarding wizard</p>
              </div>
            </Link>

            {/* Action 2: Record Payment */}
            <button
              type="button"
              onClick={() => {
                setSelectedTenantForPayment(null);
                setIsPaymentModalOpen(true);
              }}
              className="gsap-action-card group text-left p-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-md hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 flex flex-col justify-between min-h-[130px]"
            >
              <div className="flex items-center justify-between">
                <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  <IndianRupee className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/20 text-white">Fast Collect</span>
              </div>
              <div className="mt-3">
                <h4 className="text-base font-bold text-white leading-tight">Record Payment</h4>
                <p className="text-xs text-emerald-100 mt-0.5">Instant cash / UPI daily receipt</p>
              </div>
            </button>

            {/* Action 3: Confirm Booking */}
            <Link
              href="/bookings"
              className="gsap-action-card group p-5 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white shadow-md hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 flex flex-col justify-between min-h-[130px]"
            >
              <div className="flex items-center justify-between">
                <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  <CalendarCheck className="h-6 w-6" />
                </div>
                {stats.pendingBookingsCount > 0 && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-900">
                    {stats.pendingBookingsCount} Waiting
                  </span>
                )}
              </div>
              <div className="mt-3">
                <h4 className="text-base font-bold text-white leading-tight">Process Bookings</h4>
                <p className="text-xs text-indigo-100 mt-0.5">Convert customer reservations</p>
              </div>
            </Link>

            {/* Action 4: Return EV */}
            <button
              type="button"
              onClick={() => setIsReturnModalOpen(true)}
              className="gsap-action-card group text-left p-5 rounded-2xl bg-gradient-to-br from-amber-600 to-orange-700 hover:from-amber-500 hover:to-orange-600 text-white shadow-md hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 flex flex-col justify-between min-h-[130px]"
            >
              <div className="flex items-center justify-between">
                <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  <RotateCcw className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/20 text-white">Vehicle Check-in</span>
              </div>
              <div className="mt-3">
                <h4 className="text-base font-bold text-white leading-tight">Return EV</h4>
                <p className="text-xs text-amber-100 mt-0.5">Inspect &amp; close rental contract</p>
              </div>
            </button>
          </div>
        </div>

        {/* ── OPERATIONAL KPI METRICS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {/* Available EVs */}
          <div className="gsap-kpi-card rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl p-4 card-elevation shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Available EVs
              </span>
              <Bike className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-2">
              <h4 id="gsap-kpi-available" className="text-2xl font-black text-slate-900 dark:text-white">
                {loading ? <Spinner size="sm" /> : stats.availableStock}
              </h4>
              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">Ready to dispatch</p>
            </div>
          </div>

          {/* Pending Bookings */}
          <div className="gsap-kpi-card rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl p-4 card-elevation shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pending Bookings
              </span>
              <CalendarCheck className="w-4 h-4 text-purple-500" />
            </div>
            <div className="mt-2">
              <h4 id="gsap-kpi-pending" className="text-2xl font-black text-purple-600 dark:text-purple-400">
                {loading ? <Spinner size="sm" /> : stats.pendingBookingsCount}
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Awaiting contract</p>
            </div>
          </div>

          {/* Active Rentals */}
          <div className="gsap-kpi-card rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl p-4 card-elevation shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Active Rentals
              </span>
              <Users className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2">
              <h4 id="gsap-kpi-rentals" className="text-2xl font-black text-slate-900 dark:text-white">
                {loading ? <Spinner size="sm" /> : stats.activeRentalsCount}
              </h4>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">Fleet on ground</p>
            </div>
          </div>

          {/* Overdue Accounts */}
          <div className="gsap-kpi-card rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl p-4 card-elevation shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Overdue Follow-ups
              </span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="mt-2">
              <h4 id="gsap-kpi-overdue" className="text-2xl font-black text-rose-600 dark:text-rose-400">
                {loading ? <Spinner size="sm" /> : stats.overdueCount}
              </h4>
              <p className="text-[10px] text-rose-500 dark:text-rose-400 font-semibold mt-0.5">Need immediate call</p>
            </div>
          </div>

          {/* Today's Collections */}
          <div className="gsap-kpi-card rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl p-4 card-elevation shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Today&apos;s Cash Desk
              </span>
              <IndianRupee className="w-4 h-4 text-teal-500" />
            </div>
            <div className="mt-2">
              <h4 id="gsap-kpi-cash" className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {loading ? <Spinner size="sm" /> : formatCurrency(stats.todayCollections)}
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Logged today</p>
            </div>
          </div>
        </div>

        {/* ── TWO OPERATIONAL ACTION FEEDS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Feed 1: Pending Bookings to Confirm */}
          <Card
            title="Pending Customer Bookings"
            subtitle="Walk-in tokens paid • Confirm and issue contract"
            action={
              <Link href="/bookings" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                All Bookings →
              </Link>
            }
          >
            {loading ? (
              <div className="py-8 text-center"><Spinner size="md" className="mx-auto text-blue-600" /></div>
            ) : pendingBookings.length === 0 ? (
              <div className="py-8 text-center text-slate-400 dark:text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">All customer reservations processed!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">No walk-in customers currently in queue.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {pendingBookings.map((b) => (
                  <div key={b.id} className="gsap-feed-item py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{b.customer_name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>{b.customer_phone}</span>
                        <span>•</span>
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          {b.ev_models?.name || b.model_name_raw || 'EV Model'}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(b.booking_amount)}
                      </span>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          const query = `?name=${encodeURIComponent(b.customer_name)}&phone=${encodeURIComponent(b.customer_phone)}&amount=${b.booking_amount}&model_id=${b.ev_model_id || ''}`;
                          router.push(`/rentals/new${query}`);
                        }}
                      >
                        Convert
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Feed 2: Overdue Payment Follow-ups */}
          <Card
            title="Overdue Accounts to Follow Up"
            subtitle="Immediate desk collection &amp; call queue"
            action={
              <Link href="/rentals?overdue_days=1" className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline">
                View All Overdue →
              </Link>
            }
          >
            {loading ? (
              <div className="py-8 text-center"><Spinner size="md" className="mx-auto text-blue-600" /></div>
            ) : overdueTenants.length === 0 ? (
              <div className="py-8 text-center text-slate-400 dark:text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">All accounts are on track!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">No tenants currently past their payment due date.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {overdueTenants.map((t) => (
                  <div key={t.id} className="gsap-feed-item py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/rentals/${t.id}`}
                        className="text-xs font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate block"
                      >
                        {t.name}
                      </Link>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {t.phone}</span>
                        <span>•</span>
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">
                          {t.computed_balance?.daysOverdue}d overdue
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right mr-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {formatCurrency(t.computed_balance?.outstanding)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openPaymentForTenant(t)}
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
        </div>

        {/* ── AVAILABLE EV FLEET STOCK ON GROUND ── */}
        <Card
          title="Available EV Models on Ground"
          subtitle="Stock ready for immediate rental deployment"
          action={
            <Link href="/models" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              Inventory →
            </Link>
          }
        >
          {loading ? (
            <div className="py-6 text-center"><Spinner size="md" className="mx-auto text-blue-600" /></div>
          ) : evModels.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No models registered in fleet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {evModels.map((m) => {
                const isOutOfStock = (m.stock_count || 0) <= 0;
                return (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between"
                  >
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">{m.name}</h5>
                      <p className="text-[11px] text-slate-400">{m.company} • {formatCurrency(m.total_price)}</p>
                      <div className="mt-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isOutOfStock
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                        }`}>
                          {isOutOfStock ? '0 units (Out of stock)' : `${m.stock_count} units available`}
                        </span>
                      </div>
                    </div>
                    <div>
                      <Link href={`/rentals/new?model_id=${m.id}`}>
                        <Button size="sm" variant="primary" disabled={isOutOfStock}>
                          Deploy
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Modals */}
      <QuickPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedTenantForPayment(null);
        }}
        initialTenant={selectedTenantForPayment}
        onPaymentSuccess={fetchStaffData}
      />

      <ReturnEvModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        onReturnSuccess={fetchStaffData}
      />

      <StaffProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
}
