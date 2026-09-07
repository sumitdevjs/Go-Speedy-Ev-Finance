'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ChevronDown, ChevronUp, FileCode } from 'lucide-react';
import Header from '../../../components/layout/Header';
import Table from '../../../components/ui/Table';
import Pagination from '../../../components/ui/Pagination';
import Badge from '../../../components/ui/Badge';
import api from '../../../lib/api';
import { formatDate } from '../../../lib/constants';

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchAuditLogs(page);
  }, [page]);

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

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const columns = [
    {
      header: 'Timestamp',
      key: 'created_at',
      render: (row) => (
        <span className="text-xs text-slate-500 font-mono">
          {new Date(row.created_at).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </span>
      ),
    },
    {
      header: 'Operator / User',
      key: 'user',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-800 text-xs">
            {row.users?.name || 'System'}
          </span>
          <p className="text-[10px] text-slate-400">{row.user_role}</p>
        </div>
      ),
    },
    {
      header: 'Action Performed',
      key: 'action',
      render: (row) => (
        <Badge status={row.action} variant="blue" size="sm" />
      ),
    },
    {
      header: 'Entity',
      key: 'entity_type',
      render: (row) => (
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          {row.entity_type}
        </span>
      ),
    },
    {
      header: 'IP Address',
      key: 'ip_address',
      render: (row) => (
        <span className="text-xs text-slate-400 font-mono">{row.ip_address || '127.0.0.1'}</span>
      ),
    },
    {
      header: 'Change Diff',
      key: 'changes',
      render: (row) => {
        const changes = row.changes;
        if (!changes || Object.keys(changes).length === 0) {
          return <span className="text-xs text-slate-400">—</span>;
        }

        const isExpanded = expandedId === row.id;

        return (
          <div>
            <button
              type="button"
              onClick={() => toggleExpand(row.id)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              <FileCode className="h-3.5 w-3.5" />
              {Object.keys(changes).length} field(s)
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {isExpanded && (
              <pre className="mt-2 p-2 bg-slate-900 text-slate-100 rounded-lg text-[11px] overflow-x-auto max-w-xs font-mono">
                {JSON.stringify(changes, null, 2)}
              </pre>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <Header
        title="Audit & Compliance Ledger"
        subtitle="Immutable security trail of all administrative and operations modifications"
      />

      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <Table
          columns={columns}
          data={logs}
          loading={loading}
          emptyText="No audit logs recorded yet."
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
