'use client';

import React from 'react';
import { User, Phone, Mail, Shield, LogOut, CheckCircle2 } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { useAuthStore } from '../../store/authStore';

export default function StaffProfileModal({ isOpen, onClose }) {
  const { user, role, logout } = useAuthStore();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Operator Profile"
      subtitle="Your active shift session & credentials"
      maxWidth="max-w-sm"
    >
      <div className="space-y-4">
        {/* Avatar and Name */}
        <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'ST'}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">{user?.name || 'Staff Operator'}</h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge status="Staff Desk" variant="emerald" size="sm" />
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Active on Shift
              </span>
            </div>
          </div>
        </div>

        {/* Contact details */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-slate-400" /> Phone:
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.phone || '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-slate-400" /> Email:
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.email || '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-slate-400" /> Access Role:
            </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[11px]">Operations Staff</span>
          </div>
        </div>

        {/* Sign Out Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/40 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors"
          >
            <LogOut className="h-4 w-4" /> End Shift & Sign Out
          </button>
        </div>
      </div>
    </Modal>
  );
}
