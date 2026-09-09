'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { Zap } from 'lucide-react';

/**
 * /oauth-callback
 * 
 * The Google OAuth flow lands here after the backend sets auth cookies.
 * This page calls /api/auth/me (cookies already set) to populate the
 * auth store, then redirects to the dashboard.
 */
export default function OAuthCallbackPage() {
  const router = useRouter();
  const { checkAuth } = useAuthStore();
  const [status, setStatus] = useState('Completing sign-in…');
  const [error, setError] = useState('');

  useEffect(() => {
    // Check for error param in URL (e.g. user denied consent or deactivated)
    const params = new URLSearchParams(window.location.search);
    const errCode = params.get('error');
    if (errCode === 'not_registered') {
      setStatus('');
      setError('Access denied: Email is not registered. Kindly contact admin.');
      setTimeout(() => router.replace('/?error=not_registered'), 2000);
      return;
    }
    if (errCode === 'account_deactivated') {
      setStatus('');
      setError('Account is deactivated. Kindly contact admin.');
      setTimeout(() => router.replace('/?error=account_deactivated'), 2000);
      return;
    }
    if (errCode) {
      setStatus('');
      setError('Sign-in was cancelled or failed. Redirecting…');
      setTimeout(() => router.replace('/'), 2500);
      return;
    }

    // Verify session via cookies set by backend
    const verify = async () => {
      try {
        const user = await checkAuth();
        if (user) {
          setStatus('Welcome, ' + (user.name || 'User') + '! Redirecting…');
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 600);
        } else {
          throw new Error('No user session found');
        }
      } catch {
        setStatus('');
        setError('Authentication failed. Redirecting to login…');
        setTimeout(() => router.replace('/'), 2500);
      }
    };

    verify();
  }, [checkAuth, router]);

  return (
    <div className="fixed inset-0 bg-[#070c18] flex flex-col items-center justify-center text-white select-none">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/30">
          <Zap className="h-6 w-6 fill-white text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-black tracking-tight uppercase leading-none">
            Go<span className="text-emerald-400">Speedy</span>
          </span>
          <span className="text-[9px] font-bold text-slate-400 tracking-[0.22em] uppercase mt-0.5">
            EV Fleet Finance
          </span>
        </div>
      </div>

      {/* Spinner */}
      {!error && (
        <div className="mb-6 relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-400 animate-spin" />
        </div>
      )}

      {/* Error icon */}
      {error && (
        <div className="mb-6 w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
          <span className="text-rose-400 text-xl font-black">!</span>
        </div>
      )}

      {/* Status text */}
      <p className={`text-base font-semibold text-center max-w-xs ${error ? 'text-rose-300' : 'text-slate-200'}`}>
        {error || status}
      </p>
      <p className="text-xs text-slate-500 mt-2">
        {error ? 'Taking you back to login…' : 'Please wait a moment.'}
      </p>
    </div>
  );
}
