'use client';

import React, { useState, useEffect } from 'react';
import { Bike, Plus, AlertCircle } from 'lucide-react';
import Header from '../../../components/layout/Header';
import Table from '../../../components/ui/Table';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Badge from '../../../components/ui/Badge';
import api from '../../../lib/api';
import { formatCurrency, formatDate } from '../../../lib/constants';

export default function ModelsPage() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [ward, setWard] = useState('Delhi Central');
  const [totalPrice, setTotalPrice] = useState('80000');
  const [stockCount, setStockCount] = useState('5');

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/models');
      if (res.data?.success) {
        setModels(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load models:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateModel = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !company.trim()) {
      setError('Model name and company are required');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/api/models', {
        name: name.trim(),
        company: company.trim(),
        ward: ward.trim(),
        total_price: Number(totalPrice),
        stock_count: Number(stockCount),
      });

      if (res.data?.success) {
        setIsAddModalOpen(false);
        setName('');
        setCompany('');
        fetchModels();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create EV model');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Model Name',
      key: 'name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Bike className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white">{row.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{row.company}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Operational Ward',
      key: 'ward',
      render: (row) => <span className="font-medium text-slate-700 dark:text-slate-300">{row.ward}</span>,
    },
    {
      header: 'Sticker Price',
      key: 'total_price',
      render: (row) => (
        <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(row.total_price)}</span>
      ),
    },
    {
      header: 'Stock Count',
      key: 'stock_count',
      render: (row) => (
        <Badge
          status={row.stock_count > 0 ? `${row.stock_count} in stock` : 'Out of stock'}
          variant={row.stock_count > 0 ? 'emerald' : 'rose'}
          size="sm"
        />
      ),
    },
    {
      header: 'Added / Updated',
      key: 'dates',
      render: (row) => (
        <div>
          <p className="text-xs text-slate-800 dark:text-slate-200">A: {formatDate(row.created_at)}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">U: {formatDate(row.updated_at)}</p>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Header
        title="EV Models & Stock"
        subtitle="Manage fleet inventory and pricing"
        action={
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setIsAddModalOpen(true)}
          >
            Add New EV Model
          </Button>
        }
      />

      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        <Table
          columns={columns}
          data={models}
          loading={loading}
          emptyText="No EV models registered yet. Click 'Add New EV Model' to add inventory."
        />
      </div>

      {/* Add Model Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New EV Model"
        subtitle="Add a new electric scooter model to available fleet inventory"
      >
        <form onSubmit={handleCreateModel} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Model Name"
            placeholder="e.g. Speedy Eco X1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Manufacturer / Company"
            placeholder="e.g. Go Speedy EV Motors"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
          />

          <Input
            label="Ward / Hub Location"
            placeholder="e.g. Okhla Depot / Karol Bagh Hub"
            value={ward}
            onChange={(e) => setWard(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Sticker Price (₹)"
              type="number"
              placeholder="80000"
              value={totalPrice}
              onChange={(e) => setTotalPrice(e.target.value)}
              required
            />

            <Input
              label="Initial Stock Quantity"
              type="number"
              placeholder="10"
              value={stockCount}
              onChange={(e) => setStockCount(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSubmitting}
            >
              Save Model
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
