'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ChevronDown, ChevronUp, User, Clock } from 'lucide-react';
import Header from '../../../components/layout/Header';
import Table from '../../../components/ui/Table';
import Pagination from '../../../components/ui/Pagination';
import Badge from '../../../components/ui/Badge';
import api from '../../../lib/api';

// ── Human-readable action descriptions ──────────────────────────────────────
const ACTION_LABELS = {
  CREATE_STAFF:      'Added a new staff member',
  UPDATE_STAFF:      'Updated staff details',
  DELETE_STAFF:      'Removed a staff member',
  CREATE_RENTAL:     'Created a new rental agreement',
  UPDATE_RENTAL:     'Updated rental details',
  DELETE_RENTAL:     'Deleted a rental agreement',
  CREATE_BOOKING:    'Created a new booking',
  UPDATE_BOOKING:    'Updated booking details',
  DELETE_BOOKING:    'Deleted a booking',
  CONVERT_BOOKING:   'Converted booking to a purchase',
  RECORD_PAYMENT:    'Recorded a payment',
  UPDATE_PAYMENT:    'Updated payment details',
  DELETE_PAYMENT:    'Deleted a payment record',
  CREATE_PURCHASE:   'Created a new purchase',
  UPDATE_PURCHASE:   'Updated purchase details',
  DELETE_PURCHASE:   'Deleted a purchase',
  CREATE_MODEL:      'Added a new EV model',
  UPDATE_MODEL:      'Updated EV model details',
  DELETE_MODEL:      'Removed an EV model',
  LOGIN:             'User logged in',
  LOGOUT:            'User logged out',
};

// ── Human-readable entity names ──────────────────────────────────────────────
const ENTITY_LABELS = {
  USERS:       'Staff / Users',
  PAYMENTS:    'Payments',
  BOOKINGS:    'Bookings',
  PURCHASES:   'Purchases',
  TENANTS:     'Rental Tenants',
  EV_MODELS:   'EV Models',
};

// ── Format a single change field label ──────────────────────────────────────
const FIELD_LABELS = {
  name:               'Name',
  email:              'Email',
  phone:              'Phone',
  role:               'Role',
  is_active:          'Active Status',
  amount:             'Amount (₹)',
  payment_date:       'Payment Date',
  payment_method:     'Payment Method',
  status:             'Status',
  notes:              'Notes',
  emi_amount:         'EMI Amount (₹)',
  emi_start_date:     'EMI Start Date',
  total_amount:       'Total Amount (₹)',
  down_payment:       'Down Payment (₹)',
  model_name:         'Model Name',
  brand:              'Brand',
  price:              'Price (₹)',
  tenant_name:        'Tenant Name',
  address:            'Address',
  booking_date:       'Booking Date',
  converted_at:       'Converted On',
};

function formatFieldName(key) {
  return FIELD_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatValue(val) {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'object') return JSON.stringify(val);
  // Try to detect ISO date strings
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
    return new Date(val).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  return String(val);
}

// ── Change diff renderer ─────────────────────────────────────────────────────
function ChangeDiff({ changes, isExpanded, onToggle }) {
  if (!changes || Object.keys(changes).length === 0) {
    return <span className="text-xs text-slate-400">No changes recorded</span>;
  }

  const keys = Object.keys(changes);

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
      >
        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {isExpanded ? 'Hide' : `View`} {keys.length} change{keys.length !== 1 ? 's' : ''}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-2 max-w-sm">
          {keys.map(key => {
            const entry = changes[key];
            const hasFromTo = entry && typeof entry === 'object' && ('from' in entry || 'to' in entry);

            if (hasFromTo) {
              return (
                <div key={key} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    {formatFieldName(key)}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {'from' in entry && (
                      <span className="text-xs bg-red-50 text-red-600 border border-red-200 rounded px-2 py-0.5 line-through">
                        {formatValue(entry.from)}
                      </span>
                    )}
                    {('from' in entry && 'to' in entry) && (
                      <span className="text-slate-400 text-xs">→</span>
                    )}
                    {'to' in entry && (
                      <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded px-2 py-0.5 font-semibold">
                        {formatValue(entry.to)}
                      </span>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div key={key} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                  {formatFieldName(key)}
                </p>
                <p className="text-xs text-slate-700 font-medium">{formatValue(entry)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { fetchAuditLogs(page); }, [page]);

  const fetchAuditLogs = async (p = 1) => {
    try {
      setLoading(true);
      const res = await api.get(`/api/audit?page=${p}&limit=20`);
      if (res.data?.success) {
        setLogs(res.data.data || []);
        setTotalPages(res.data.meta?.totalPages || 1);
        setTotalRecords(res.data.meta?.totalRecords || 0);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'When',
      key: 'created_at',
      render: (row) => (
        <div className="flex items-start justify-center gap-1.5 text-left">
          <Clock className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-slate-700">
              {new Date(row.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
            <p className="text-[10px] text-slate-400">
              {new Date(row.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: 'Done By',
      key: 'user',
      render: (row) => (
        <div className="flex items-center justify-center gap-2 text-left">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
            <User className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-800">{row.users?.name || 'System'}</p>
            <p className="text-[10px] text-slate-400 capitalize">{row.user_role}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'What Happened',
      key: 'action',
      render: (row) => (
        <span className="text-xs font-medium text-slate-700">
          {ACTION_LABELS[row.action] || row.action?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
        </span>
      ),
    },
    {
      header: 'Section',
      key: 'entity_type',
      render: (row) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
          {ENTITY_LABELS[row.entity_type] || row.entity_type?.replace(/_/g, ' ')}
        </span>
      ),
    },
  ];

  return (
    <div>
      <Header
        title="Activity Log"
        subtitle="A clear record of every action taken in the system"
      />

      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <Table
          columns={columns}
          data={logs}
          loading={loading}
          emptyText="No activity recorded yet."
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
