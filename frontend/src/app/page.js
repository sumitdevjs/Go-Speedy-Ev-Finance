'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import Spinner from '../components/ui/Spinner';

export default function RootPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth().then((u) => {
      if (u) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    });
  }, [router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
      <Spinner size="lg" className="text-blue-600" />
    </div>
  );
}
