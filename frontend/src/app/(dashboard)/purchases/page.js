'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag, CheckCircle, ArrowRight } from 'lucide-react';
import Header from '../../../components/layout/Header';
import Table from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import api from '../../../lib/api';
import { formatCurrency, formatDate } from '../../../lib/constants';

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/purchases');
      if (res.data?.success) {
        setPurchases(res.data.data || []);
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
              className="font-bold text-slate-900 hover:text-blue-600"
            >
              {row.name}
            </Link>
            <p className="text-xs text-slate-500">{row.phone}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'EV Model Owned',
      key: 'model',
      render: (row) => (
        <span className="font-semibold text-slate-800">
          {row.ev_models?.name || 'EV Scooter'}
        </span>
      ),
    },
    {
      header: 'Total Value',
      key: 'total_price',
      render: (row) => (
        <span className="font-bold text-slate-900">{formatCurrency(row.total_price)}</span>
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
              Purchase EV
            </Button>
          </Link>
        }
      />

      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <Table
          columns={columns}
          data={purchases}
          loading={loading}
          emptyText="No completed purchases yet. When tenant balance reaches ₹0, contracts auto-complete here."
        />
      </div>
    </div>
  );
}
