'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, Menu, ArrowLeft } from 'lucide-react';
import Button from '../ui/Button';
import ThemeToggle from '../ui/ThemeToggle';
import BranchSwitcher from './BranchSwitcher';
import { useAuthStore } from '../../store/authStore';
import { useSidebar } from '../../store/sidebarContext';

export default function Header({
  title,
  subtitle,
  action,
  backHref,
  onBack,
  hideBranchSwitcher = false,
}) {
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

  const isSuperAdmin = role === 'super_admin' || role === 'admin';
  const isHoAdmin = role === 'ho_admin';
  const canSwitch = isSuperAdmin || isHoAdmin;

  const showSwitcher = !hideBranchSwitcher && !backHref && !onBack && canSwitch;

  return (
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-30 transition-colors">
      {/* Primary Bar: Hamburger, Back, Page Title, BranchSwitcher, ThemeToggle, Action */}
      <div className="h-[56px] sm:h-[64px] md:h-[68px] px-2.5 xs:px-3.5 sm:px-5 md:px-6 flex items-center justify-between gap-2.5 sm:gap-3 md:gap-4 overflow-hidden">
        <div className="flex items-center gap-2 xs:gap-2.5 sm:gap-3 min-w-0 flex-1 overflow-hidden">
          {/* Hamburger Menu Toggle — only on mobile/tablet (< lg) */}
          <button
            type="button"
            onClick={toggle}
            className="p-1.5 sm:p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-smooth lg:hidden shrink-0 cursor-pointer"
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
              className="p-1.5 sm:p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-smooth shrink-0 cursor-pointer"
              aria-label="Go back"
              title="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}

          {/* Title & Subtitle block: gracefully wraps or truncates on narrow viewports */}
          <div className="min-w-0 flex flex-col justify-center shrink-0">
            <h1 className="text-sm xs:text-base md:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate max-w-[145px] xs:max-w-[185px] sm:max-w-[260px] md:max-w-none">
              {title || 'Dashboard'}
            </h1>
            {subtitle && (
              <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 truncate hidden lg:block leading-tight mt-0.5">
                {subtitle}
              </p>
            )}
          </div>

          {/* Desktop inline BranchSwitcher: vertically centered on the main navbar axis with divider */}
          {showSwitcher && (
            <div className="hidden md:flex items-center min-w-0 shrink pl-0.5">
              <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-2 sm:mx-2.5 shrink-0" />
              <BranchSwitcher />
            </div>
          )}
        </div>

        {/* Right side controls: ThemeToggle + Action (Always shrink-0 and fully visible) */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <ThemeToggle />
          {action || (
            <Link href="/rentals/new">
              <Button
                variant="primary"
                size="sm"
                icon={PlusCircle}
                className="h-9 px-3 sm:px-3.5 text-xs font-bold shrink-0 shadow-xs"
                title="Issue Rental"
              >
                <span className="hidden sm:inline">Issue New Rental</span>
                <span className="sm:hidden">New Rental</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Sub-Bar: Dedicated Full-Width Branch/Ward Switcher (< md only) */}
      {showSwitcher && (
        <div className="md:hidden px-2.5 xs:px-3.5 py-1.5 bg-slate-50/90 dark:bg-slate-900/90 border-t border-slate-100/90 dark:border-slate-800/80">
          <BranchSwitcher isMobileBar={true} />
        </div>
      )}
    </header>
  );
}
