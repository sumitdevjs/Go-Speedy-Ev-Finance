'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, MapPin, Menu, ArrowLeft } from 'lucide-react';
import Button from '../ui/Button';
import ThemeToggle from '../ui/ThemeToggle';
import { useAuthStore } from '../../store/authStore';
import { useSidebar } from '../../store/sidebarContext';

export default function Header({ title, subtitle, action, backHref, onBack }) {
  const router = useRouter();
  const { user, role } = useAuthStore();
  const { toggle } = useSidebar();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <header className="h-[60px] xs:h-[64px] sm:h-[76px] bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-2.5 xs:px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 gap-2 sm:gap-3 transition-colors">
      <div className="flex items-center gap-1.5 xs:gap-2.5 sm:gap-3 min-w-0 flex-1">
        {/* Hamburger Menu Toggle — only on mobile */}
        <button
          type="button"
          onClick={toggle}
          className="p-1.5 sm:p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-smooth lg:hidden shrink-0 cursor-pointer"
          aria-label="Open navigation menu"
          id="mobile-menu-btn"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Back Button (if provided) */}
        {(backHref || onBack) && (
          <button
            type="button"
            onClick={handleBack}
            className="p-1.5 sm:p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-smooth shrink-0 cursor-pointer"
            aria-label="Go back"
            title="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-sm xs:text-base md:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
              {title || 'Dashboard'}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 shrink-0">
              <MapPin className="h-3 w-3 text-slate-500 dark:text-slate-400" /> Delhi HQ
            </span>
          </div>
          {subtitle && (
            <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 xs:gap-2 md:gap-3 shrink-0">
        <ThemeToggle />
        {action || (
          <Link href="/rentals/new">
            <Button
              variant="primary"
              size="sm"
              icon={PlusCircle}
              className="h-8 w-8 p-0 xs:h-auto xs:w-auto xs:px-3 xs:py-1.5"
              title="Issue Rental"
            >
              <span className="hidden sm:inline">Issue Rental</span>
              <span className="hidden xs:inline sm:hidden">New</span>
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
