'use client';

import React, { useEffect, useRef } from 'react';
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
  X,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import Badge from '../ui/Badge';
import { gsap } from '../../lib/gsap';

/**
 * A group of nav links with one shared "pill" that glides behind whichever
 * item is active — instead of the highlight just popping on/off, it slides
 * and resizes to its new spot every time the route changes.
 */
function NavGroup({ items, isActive }) {
  const containerRef = useRef(null);
  const indicatorRef = useRef(null);
  const isFirstRun = useRef(true);

  useEffect(() => {
    const container = containerRef.current;
    const indicator = indicatorRef.current;
    if (!container || !indicator) return;

    const place = (animate) => {
      const activeLink = container.querySelector('a[data-active="true"]');
      if (!activeLink) {
        gsap.set(indicator, { opacity: 0 });
        return;
      }

      // This same nav renders twice — a desktop copy and a mobile-drawer copy — and
      // whichever one is currently `display:none` measures a zero-size link. Skip it;
      // the resize listener below re-places it correctly once that copy becomes visible.
      if (activeLink.offsetHeight === 0) return;

      const target = { top: activeLink.offsetTop, height: activeLink.offsetHeight, opacity: 1 };
      if (animate) {
        gsap.to(indicator, { ...target, duration: 0.45, ease: 'power3.out' });
      } else {
        gsap.set(indicator, target);
      }
    };

    place(!isFirstRun.current);
    isFirstRun.current = false;

    // Re-place (snapping, no animation) whenever this copy's visibility/layout could have
    // changed — e.g. resizing across the lg breakpoint swaps which sidebar copy is shown.
    const onResize = () => place(false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  });

  return (
    <div ref={containerRef} className="relative">
      <div
        ref={indicatorRef}
        className="absolute left-0 right-0 rounded-xl bg-blue-50 dark:bg-blue-950/60 shadow-xs pointer-events-none opacity-0"
        style={{ zIndex: 0 }}
      />
      <div className="relative space-y-1" style={{ zIndex: 1 }}>
        {items.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              data-active={active}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 ${
                active
                  ? 'text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function SidebarInner({ isOpen, onClose }) {
  const pathname = usePathname();
  const { user, role, logout } = useAuthStore();
  const logoRef = useRef(null);

  // A tiny "wake up" wiggle on the logo whenever the drawer opens on mobile —
  // makes the panel feel alive rather than just sliding into place.
  useEffect(() => {
    if (isOpen && logoRef.current) {
      gsap.fromTo(
        logoRef.current,
        { rotate: -8, scale: 0.85 },
        { rotate: 0, scale: 1, duration: 0.5, ease: 'back.out(3)' }
      );
    }
  }, [isOpen]);

  const staffNavItems = [
    { name: "Today's Desk", href: '/dashboard', icon: LayoutDashboard },
    { name: 'Rentals', href: '/rentals', icon: Users },
    { name: 'Issue Rental', href: '/rentals/new', icon: UserPlus },
    { name: 'Walk-in Bookings', href: '/bookings', icon: CalendarCheck },
    { name: 'EV Fleet & Stock', href: '/models', icon: Bike },
    { name: 'Payments / Ledger', href: '/purchases', icon: ShoppingBag },
  ];

  const adminNavItemsList = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Rentals', href: '/rentals', icon: Users },
    { name: 'EV Models', href: '/models', icon: Bike },
    { name: 'Bookings', href: '/bookings', icon: CalendarCheck },
    { name: 'Purchases', href: '/purchases', icon: ShoppingBag },
  ];

  const navItems = role === 'staff' ? staffNavItems : adminNavItemsList;

  const adminNavItems = [
    { name: 'Staff Management', href: '/staff', icon: UserCheck },
    { name: 'Audit Logs', href: '/audit', icon: ShieldCheck },
  ];

  const isActive = (href) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 flex flex-col h-full select-none transition-colors">
      {/* Brand Header */}
      <div className="h-16 shrink-0 flex items-center px-6 border-b border-slate-100 dark:border-slate-800 gap-3">
        <div
          ref={logoRef}
          className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0"
        >
          <Zap className="h-5 w-5 fill-current" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="font-extrabold text-slate-900 dark:text-white tracking-tight text-base block leading-none truncate">
            GO SPEEDY
          </span>
          <span className="text-[10px] font-semibold tracking-wider text-blue-600 dark:text-blue-400 uppercase block mt-1 truncate">
            EV Finance Monitor
          </span>
        </div>

        {/* Close button for mobile drawer */}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-smooth lg:hidden shrink-0"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1">
        <div className="px-3 pb-1 flex items-center justify-between">
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {role === 'staff' ? 'Staff Desk' : 'Operations'}
          </p>
          {role === 'staff' && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </div>

        <NavGroup items={navItems} isActive={isActive} />

        {role === 'admin' && (
          <>
            <div className="pt-4 pb-1">
              <p className="px-3 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Administration
              </p>
            </div>
            <NavGroup items={adminNavItems} isActive={isActive} />
          </>
        )}
      </nav>

      {/* User Card & Logout */}
      <div className="shrink-0 p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
        <div className="flex items-center justify-between gap-2.5 mb-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {user?.name || (role === 'staff' ? 'Staff Operator' : 'Administrator')}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {user?.phone || user?.email || (role === 'staff' ? 'Staff Console' : 'Admin Console')}
            </p>
          </div>
          <Badge
            status={role === 'staff' ? 'Staff Desk' : 'Admin'}
            variant={role === 'staff' ? 'emerald' : 'blue'}
            size="sm"
          />
        </div>

        <button
          type="button"
          onClick={() => logout()}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-800 transition-smooth cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();

  // Close mobile sidebar on route change
  useEffect(() => {
    onClose?.();
  }, [pathname]);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Desktop static fixed sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 w-64 z-30 h-screen">
        <SidebarInner isOpen={isOpen} onClose={onClose} />
      </div>

      {/* Mobile Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Mobile Slide-in Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 h-full transition-transform duration-300 ease-in-out lg:hidden shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarInner isOpen={isOpen} onClose={onClose} />
      </div>
    </>
  );
}
