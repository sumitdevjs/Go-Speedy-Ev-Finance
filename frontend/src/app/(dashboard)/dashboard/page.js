'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bike,
  Users,
  AlertTriangle,
  IndianRupee,
  PlusCircle,
  CalendarCheck,
  TrendingUp,
  ArrowRight,
  Clock,
  Phone,
} from 'lucide-react';
import Header from '../../../components/layout/Header';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import api from '../../../lib/api';
import { formatCurrency, formatDate } from '../../../lib/constants';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalStock: 0,
    activeRentals: 0,
    overdueCount: 0,
    totalCollections: 0,
  });
  const [overdueTenants, setOverdueTenants] = useState([]);
  const [recentRentals, setRecentRentals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch Models for stock
      const modelsRes = await api.get('/api/models');
      const models = modelsRes.data?.data || [];
      const totalStock = models.reduce((sum, m) => sum + (m.stock_count || 0), 0);

      // Fetch Rentals (Active/Cancelled)
      const rentalsRes = await api.get('/api/rentals?limit=10000');
      const rentals = rentalsRes.data?.data || [];
      const active = rentals.filter((r) => r.status === 'rented');

      // Fetch Purchases (Completed/Direct)
      const purchasesRes = await api.get('/api/purchases?limit=10000');
      const purchases = purchasesRes.data?.data || [];

      const allTenants = [...rentals, ...purchases];

      // Calculate overdue tenants
      const overdue = active
        .filter((r) => (r.computed_balance?.daysOverdue || 0) > 0)
        .sort((a, b) => b.computed_balance.daysOverdue - a.computed_balance.daysOverdue);

      // Fetch Payments
      const paymentsRes = await api.get('/api/payments?limit=10000');
      const payments = paymentsRes.data?.data || [];
      
      const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const totalDownpayments = allTenants.reduce((sum, t) => sum + Number(t.downpayment_paid || 0), 0);
      const totalBookings = allTenants.reduce((sum, t) => sum + Number(t.booking_amount || 0), 0);

      const totalCol = totalPayments + totalDownpayments + totalBookings;

      setStats({
        totalStock,
        activeRentals: active.length,
        overdueCount: overdue.length,
        totalCollections: totalCol,
      });

      setOverdueTenants(overdue.slice(0, 6));
      setRecentRentals(rentals.slice(0, 5));
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Operations Dashboard"
        subtitle="Delhi Fleet & Finance Monitoring"
      />

      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* KPI Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Available Stock */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 card-elevation flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Available EV Stock
              </p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {loading ? <Spinner size="sm" /> : `${stats.totalStock} units`}
              </h3>
              <p className="text-[11px] text-blue-600 font-medium mt-1">Ready for deployment</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Bike className="h-6 w-6" />
            </div>
          </div>

          {/* Active Tenants */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 card-elevation flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Rentals
              </p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {loading ? <Spinner size="sm" /> : `${stats.activeRentals} tenants`}
              </h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">Under rent-to-own</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Users className="h-6 w-6" />
            </div>
          </div>

          {/* Overdue Count */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 card-elevation flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Overdue Accounts
              </p>
              <h3 className="text-2xl font-black text-rose-600 mt-1">
                {loading ? <Spinner size="sm" /> : `${stats.overdueCount} cases`}
              </h3>
              <p className="text-[11px] text-rose-500 font-medium mt-1">1+ days payment lag</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>

          {/* Total Collections */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 card-elevation flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Collections
              </p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {loading ? <Spinner size="sm" /> : formatCurrency(stats.totalCollections)}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-1">Recorded to date</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <IndianRupee className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/rentals/new"
            className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-sm hover:shadow-md transition-smooth"
          >
            <div className="h-10 w-10 rounded-lg bg-white/15 flex items-center justify-center">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold">Issue New EV Rental</p>
              <p className="text-xs text-blue-100">8-step fast onboarding wizard</p>
            </div>
          </Link>

          <Link
            href="/bookings"
            className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 shadow-xs transition-smooth"
          >
            <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold">Manage Bookings</p>
              <p className="text-xs text-slate-500">Convert walk-ins to contracts</p>
            </div>
          </Link>

          <Link
            href="/models"
            className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 shadow-xs transition-smooth"
          >
            <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <Bike className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold">EV Fleet & Stock</p>
              <p className="text-xs text-slate-500">Manage models and ward stock</p>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Overdue Priority Alert Card */}
          <div className="lg:col-span-2">
            <Card
              title="Payment Priority Alert (Overdue Tenants)"
              subtitle="Sorted by most days overdue (₹250/day rate)"
              action={
                <Link
                  href="/rentals?overdue_days=1"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center"
                >
                  View All Overdue <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              }
            >
              {loading ? (
                <div className="py-12 text-center">
                  <Spinner size="md" className="text-blue-600 mx-auto" />
                </div>
              ) : overdueTenants.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">All Accounts On Track!</p>
                  <p className="text-xs text-slate-500">No active tenants are currently overdue.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {overdueTenants.map((tenant) => (
                    <div
                      key={tenant.id}
                      className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/70 rounded-lg px-2 transition-smooth"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/rentals/${tenant.id}`}
                          className="text-sm font-bold text-slate-900 hover:text-blue-600 truncate block"
                        >
                          {tenant.name}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {tenant.phone}
                          </span>
                          <span>•</span>
                          <span>{tenant.ev_models?.name || 'EV Model'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <Badge status="overdue" size="sm">
                            {tenant.computed_balance?.daysOverdue} days overdue
                          </Badge>
                          <p className="text-xs font-bold text-slate-800 mt-1">
                            {formatCurrency(tenant.computed_balance?.outstanding)}
                          </p>
                        </div>
                        <Link href={`/rentals/${tenant.id}`}>
                          <Button variant="outline" size="sm">
                            Collect
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Recent Contracts Card */}
          <div>
            <Card
              title="Recent Rentals"
              subtitle="Latest contract registrations"
              action={
                <Link
                  href="/rentals"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center"
                >
                  View All <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              }
            >
              {loading ? (
                <div className="py-12 text-center">
                  <Spinner size="md" className="text-blue-600 mx-auto" />
                </div>
              ) : recentRentals.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <p className="text-xs font-medium">No rentals recorded yet.</p>
                  <Link href="/rentals/new" className="mt-2 inline-block">
                    <Button variant="primary" size="sm">Create First Rental</Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentRentals.map((r) => (
                    <div key={r.id} className="py-3 flex items-center justify-between">
                      <div className="min-w-0">
                        <Link
                          href={`/rentals/${r.id}`}
                          className="text-xs font-bold text-slate-800 hover:text-blue-600 truncate block"
                        >
                          {r.name}
                        </Link>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {formatDate(r.created_at)}
                        </p>
                      </div>
                      <Badge status={r.status} size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
