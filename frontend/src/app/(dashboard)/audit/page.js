'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ChevronDown, ChevronUp, User, Clock } from 'lucide-react';
import Header from '../../../components/layout/Header';
import Table from '../../../components/ui/Table';
import Pagination from '../../../components/ui/Pagination';
import Badge from '../../../components/ui/Badge';
import ProtectedRoute from '../../../components/layout/ProtectedRoute';
import api from '../../../lib/api';

// ── Human-readable action descriptions ──────────────────────────────────────
const ACTION_LABELS = {
  CREATE_STAFF:      'Added a new staff member',
  UPDATE_STAFF:      'Updated staff details',
  DELETE_STAFF:      'Removed a staff member',
  ACTIVATE_STAFF:    'Reactivated a staff account',
  DEACTIVATE_STAFF:  'Deactivated a staff account',
  CHANGE_PASSWORD:   'Reset a password',
  RESET_PASSWORD_OTP:'Reset their own password (forgot password)',
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

function formatValue(val, key) {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'object') return JSON.stringify(val);
  // Try to detect ISO date strings
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
    return new Date(val).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  // role / status are stored lowercase (admin, staff, active...) — capitalize for readability
  if ((key === 'role' || key === 'status') && typeof val === 'string') {
    return val.charAt(0).toUpperCase() + val.slice(1);
  }
  return String(val);
}

// ── Change diff renderer ─────────────────────────────────────────────────────
// Shown expanded by default (admin should see "who changed what" without an
// extra click) — the toggle only lets them collapse a noisy row if they want.
function ChangeDiff({ changes, isExpanded, onToggle, targetName }) {
  if (!changes || Object.keys(changes).length === 0) {
    return <span className="text-xs text-slate-400">No changes recorded</span>;
  }

  const keys = Object.keys(changes);

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
      >
        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {isExpanded ? 'Hide' : `View`} {keys.length} change{keys.length !== 1 ? 's' : ''}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-2 max-w-sm">
          {keys.map(key => {
            const entry = changes[key];
            const hasFromTo = entry && typeof entry === 'object' && ('from' in entry || 'to' in entry);
            const isRoleChange = key === 'role' && hasFromTo;

            if (hasFromTo) {
              return (
                <div
                  key={key}
                  className={`rounded-lg p-2.5 border ${
                    isRoleChange
                      ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-white/10'
                  }`}
                >
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                    isRoleChange ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {isRoleChange ? '⚠ Role Changed' : formatFieldName(key)}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {'from' in entry && (
                      <span className="text-xs bg-red-50 dark:bg-rose-500/15 text-red-600 dark:text-rose-400 border border-red-200 dark:border-rose-500/30 rounded px-2 py-0.5 line-through">
                        {formatValue(entry.from, key)}
                      </span>
                    )}
                    {('from' in entry && 'to' in entry) && (
                      <span className="text-slate-400 dark:text-slate-500 text-xs">→</span>
                    )}
                    {'to' in entry && (
                      <span className="text-xs bg-green-50 dark:bg-emerald-500/15 text-green-700 dark:text-emerald-400 border border-green-200 dark:border-emerald-500/30 rounded px-2 py-0.5 font-semibold">
                        {formatValue(entry.to, key)}
                      </span>
                    )}
                  </div>
                  {isRoleChange && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1.5 font-medium">
                      {entry.to === 'admin'
                        ? `Made ${targetName || 'this user'} an Admin (was ${formatValue(entry.from, key)})`
                        : `Removed Admin access from ${targetName || 'this user'} (now ${formatValue(entry.to, key)})`}
                    </p>
                  )}
                </div>
              );
            }

            return (
              <div key={key} className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-lg p-2.5">
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
                  {formatFieldName(key)}
                </p>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{formatValue(entry, key)}</p>
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
  // Track only rows the admin has *manually collapsed* — everything else
  // shows its full change diff open by default, no click required.
  const [collapsedIds, setCollapsedIds] = useState(() => new Set());
  const toggleRow = (id) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

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
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
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
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{row.users?.name || 'System'}</p>
            <p className="text-[10px] text-slate-400 capitalize">{row.user_role}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'What Happened',
      key: 'action',
      render: (row) => {
        // Skip the " — name" suffix when the actor acted on themselves (e.g. a
        // self-service forgot-password reset) — "Done By" already shows that name,
        // repeating it right next to it would just be noise.
        const targetName = row.entity_type === 'users' && row.entity_id !== row.user_id
          ? row.entity_name
          : null;
        return (
          <div className="text-left">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
              {ACTION_LABELS[row.action] || row.action?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              {targetName && (
                <span className="text-slate-500 dark:text-slate-400 font-normal"> — {targetName}</span>
              )}
            </span>
            <ChangeDiff
              changes={row.changes}
              isExpanded={!collapsedIds.has(row.id)}
              onToggle={() => toggleRow(row.id)}
              targetName={targetName}
            />
          </div>
        );
      },
    },
    {
      header: 'Section',
      key: 'entity_type',
      render: (row) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
          {ENTITY_LABELS[row.entity_type] || row.entity_type?.replace(/_/g, ' ')}
        </span>
      ),
    },
  ];

  return (
    <ProtectedRoute adminOnly={true}>
      <div>
        <Header
          title="Activity Log"
          subtitle="A clear record of every action taken in the system"
        />

        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
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
    </ProtectedRoute>
  );
}
