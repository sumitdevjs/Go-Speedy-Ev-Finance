'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag, CheckCircle, ArrowRight } from 'lucide-react';
import Header from '../../../components/layout/Header';
import Table from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import SearchBar from '../../../components/ui/SearchBar';
import Pagination from '../../../components/ui/Pagination';
import api from '../../../lib/api';
import { formatCurrency, formatDate } from '../../../lib/constants';
import { staggerFadeIn } from '../../../lib/gsap';

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    fetchPurchases();
  }, [search, page]);

  // One-time entrance for the header/filter chrome when the page first mounts.
  useEffect(() => {
    staggerFadeIn('.gsap-filter-bar', { y: 14, duration: 0.45, stagger: 0 });
  }, []);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      let query = `/api/purchases?page=${page}&limit=15`;
      if (search) query += `&search=${encodeURIComponent(search)}`;

      const res = await api.get(query);
      if (res.data?.success) {
        setPurchases(res.data.data || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalRecords(res.data.pagination?.totalItems || 0);
      }
    } catch (err) {
      console.error('Failed to load purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'Owner Name',
      key: 'name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <Link
              href={`/rentals/${row.id}`}
              className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
            >
              {row.name}
            </Link>
            <p className="text-xs text-slate-500 dark:text-slate-400">{row.phone}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'EV Model Owned',
      key: 'model',
      render: (row) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {row.ev_models?.name || 'EV Scooter'}
        </span>
      ),
    },
    {
      header: 'Total Value',
      key: 'total_price',
      render: (row) => (
        <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(row.total_price)}</span>
      ),
    },
    {
      header: 'Downpayment Cleared',
      key: 'downpayment_paid',
      render: (row) => (
        <span className="text-xs font-semibold text-emerald-700">
          {formatCurrency(row.downpayment_paid)}
        </span>
      ),
    },
    {
      header: 'Purchase Date',
      key: 'updated_at',
      render: (row) => (
        <span className="text-xs text-slate-500">{formatDate(row.updated_at)}</span>
      ),
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
      header: 'Status',
      key: 'status',
      render: (row) => (
        <Badge
          status={row.status === 'direct_purchase' ? 'Direct Purchase' : 'Fully Owned'}
          variant={row.status === 'direct_purchase' ? 'blue' : 'emerald'}
          size="sm"
        />
      ),
    },
    {
      header: 'Action',
      key: 'action',
      render: (row) => (
        <Link
          href={`/rentals/${row.id}`}
          className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
        >
          View Ledger <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      ),
    },
  ];

  return (
    <div>
      <Header
        title="Completed Purchases & Ownerships"
        subtitle="Ledger of all vehicles fully paid and transferred to tenants"
        action={
          <Link href="/purchases/new">
            <Button variant="primary" size="sm" icon={ShoppingBag}>
              <span className="hidden sm:inline">Purchase EV</span>
              <span className="sm:hidden">Buy</span>
            </Button>
          </Link>
        }
      />

      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Search Bar */}
        <div className="gsap-filter-bar flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 card-elevation shadow-xs dark:shadow-[0_8px_30px_rgb(0,0,0,0.35)] transition-colors">
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search owner name or phone..."
            className="w-full sm:max-w-md sm:flex-1 sm:min-w-0"
          />
        </div>

        <Table
          columns={columns}
          data={purchases}
          loading={loading}
          emptyText="No completed purchases yet. When tenant balance reaches ₹0, contracts auto-complete here."
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
