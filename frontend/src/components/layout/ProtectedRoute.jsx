'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import Spinner from '../ui/Spinner';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, role, isLoggedIn, isLoading, hasCheckedAuth, checkAuth } = useAuthStore();

  useEffect(() => {
    if (!hasCheckedAuth) {
      checkAuth();
    }
  }, [hasCheckedAuth, checkAuth]);

  useEffect(() => {
    if (hasCheckedAuth && !isLoading) {
      if (!isLoggedIn) {
        router.replace('/');
      } else if (adminOnly && role !== 'admin') {
        router.replace('/dashboard');
      }
    }
  }, [isLoading, isLoggedIn, role, adminOnly, router, hasCheckedAuth]);

  if (!hasCheckedAuth || isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-[#090d16] transition-colors">
        <div className="text-center">
          <Spinner size="lg" className="text-blue-600 dark:text-blue-400 mb-3 mx-auto" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  if (adminOnly && role !== 'admin') {
    return null;
  }

  return <>{children}</>;
}
