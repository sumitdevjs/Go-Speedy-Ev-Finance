'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, Plus, Phone, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import Header from '../../../components/layout/Header';
import Table from '../../../components/ui/Table';
import Button from '../../../components/ui/Button';
import SearchBar from '../../../components/ui/SearchBar';
import Select from '../../../components/ui/Select';
import Badge from '../../../components/ui/Badge';
import Pagination from '../../../components/ui/Pagination';
import api from '../../../lib/api';
import { formatCurrency, formatDate } from '../../../lib/constants';

export default function RentalsListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [overdueFilter, setOverdueFilter] = useState(searchParams.get('overdue_days') || '');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    fetchRentals();
  }, [search, statusFilter, overdueFilter, page]);

  const fetchRentals = async () => {
    try {
      setLoading(true);
      let query = `/api/rentals?page=${page}&limit=15`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (statusFilter) query += `&status=${statusFilter}`;
      if (overdueFilter) query += `&overdue_days=${overdueFilter}`;

      const res = await api.get(query);
      if (res.data?.success) {
        setTenants(res.data.data || []);
        setTotalPages(res.data.meta?.totalPages || 1);
        setTotalRecords(res.data.meta?.totalRecords || 0);
      }
    } catch (err) {
      console.error('Failed to load rentals:', err);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'Tenant Name',
      key: 'name',
      render: (row) => (
        <div>
          <Link
            href={`/rentals/${row.id}`}
            className="font-bold text-slate-900 hover:text-blue-600 block"
          >
            {row.name}
          </Link>
          <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <Phone className="h-3 w-3" /> {row.phone}
          </span>
        </div>
      ),
    },
    {
      header: 'EV Model',
      key: 'model',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-800">{row.ev_models?.name || 'EV Scooter'}</p>
          <p className="text-[11px] text-slate-400">Total: {formatCurrency(row.total_price)}</p>
        </div>
      ),
    },
    {
      header: 'Downpayment',
      key: 'downpayment_paid',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-800">{formatCurrency(row.downpayment_paid)}</span>
          <p className="text-[11px] text-slate-400 capitalize">{row.downpayment_mode || 'Cash'}</p>
        </div>
      ),
    },
    {
      header: 'Outstanding Balance',
      key: 'outstanding',
      render: (row) => {
        const bal = row.computed_balance;
        if (!bal) return <span className="text-xs text-slate-400">—</span>;

        if (bal.outstanding === 0) {
          return (
            <span className="inline-flex items-center text-xs font-bold text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Fully Paid
            </span>
          );
        }

        return (
          <div>
            <span className="font-bold text-slate-900">{formatCurrency(bal.outstanding)}</span>
            {bal.daysOverdue > 0 ? (
              <p className="text-[11px] font-bold text-rose-600 flex items-center">
                <AlertTriangle className="w-3 h-3 mr-0.5 shrink-0" />
                {bal.daysOverdue} days overdue
              </p>
            ) : bal.daysAdvance > 0 ? (
              <p className="text-[11px] font-semibold text-emerald-600">
                {bal.daysAdvance} days advance
              </p>
            ) : (
              <p className="text-[11px] text-slate-400">On track</p>
            )}
          </div>
        );
      },
    },
    {
      header: 'Contract Status',
      key: 'status',
      render: (row) => <Badge status={row.status} size="sm" />,
    },
    {
      header: 'Pending Docs',
      key: 'has_pending_docs',
      render: (row) =>
        row.has_pending_docs ? (
          <Badge status="Docs Pending" variant="amber" size="sm" />
        ) : (
          <span className="text-xs text-emerald-600 font-medium">Verified</span>
        ),
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <Link href={`/rentals/${row.id}`}>
          <Button variant="outline" size="sm">
            View / Pay <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div>
      <Header
        title="EV Rentals & Tenants"
        subtitle="Live registry of active contracts, daily collections, and overdue accounts"
        action={
          <Link href="/rentals/new">
            <Button variant="primary" size="sm" icon={Plus}>
              Issue New Rental
            </Button>
          </Link>
        }
      />

      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 card-elevation">
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search tenant name or phone..."
            className="w-full sm:max-w-md"
          />

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All Statuses</option>
              <option value="rented">Active Rented</option>
              <option value="completed">Completed (Owned)</option>
              <option value="cancelled">Cancelled</option>
              <option value="direct_purchase">Direct Purchase</option>
            </select>

            <select
              value={overdueFilter}
              onChange={(e) => {
                setOverdueFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Overdue Filter: All</option>
              <option value="1">1+ Days Overdue</option>
              <option value="2">2+ Days Overdue</option>
              <option value="7">7+ Days Overdue (1+ Wk)</option>
            </select>
          </div>
        </div>

        {/* Tenant Table */}
        <Table
          columns={columns}
          data={tenants}
          loading={loading}
          emptyText="No rental records match your filter criteria."
        />

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalRecords}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
