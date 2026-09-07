'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Bike,
  CalendarCheck,
  ShoppingBag,
  UserCheck,
  ShieldCheck,
  LogOut,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import Badge from '../ui/Badge';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, role, logout } = useAuthStore();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Rentals', href: '/rentals', icon: Users },
    { name: 'New Rental', href: '/rentals/new', icon: UserPlus },
    { name: 'EV Models', href: '/models', icon: Bike },
    { name: 'Bookings', href: '/bookings', icon: CalendarCheck },
    { name: 'Purchases', href: '/purchases', icon: ShoppingBag },
  ];

  const adminNavItems = [
    { name: 'Staff Management', href: '/staff', icon: UserCheck },
    { name: 'Audit Logs', href: '/audit', icon: ShieldCheck },
  ];

  const isActive = (href) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between h-screen sticky top-0">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-100 gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Zap className="h-5 w-5 fill-current" />
          </div>
          <div>
            <span className="font-extrabold text-slate-900 tracking-tight text-base block leading-none">
              GO SPEEDY
            </span>
            <span className="text-[10px] font-semibold tracking-wider text-blue-600 uppercase">
              EV Finance Monitor
            </span>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="p-4 space-y-1 overflow-y-auto">
          <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Operations
          </p>
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-smooth ${
                  active
                    ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}

          {role === 'admin' && (
            <>
              <div className="pt-4 pb-1">
                <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Administration
                </p>
              </div>
              {adminNavItems.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-smooth ${
                      active
                        ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </>
          )}
        </nav>
      </div>

      {/* User Card & Logout */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">
              {user?.name || 'Operator'}
            </p>
            <p className="text-[11px] text-slate-500 truncate">{user?.phone || user?.email}</p>
          </div>
          <Badge status={role || 'staff'} size="sm" />
        </div>

        <button
          type="button"
          onClick={() => logout()}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2 text-xs font-medium text-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-smooth cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
