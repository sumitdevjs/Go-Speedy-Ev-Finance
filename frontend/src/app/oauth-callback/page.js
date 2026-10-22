'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import BrandLogo from '../../components/ui/BrandLogo';
import { Zap } from 'lucide-react';

const exchangedCodes = new Set();

export default function OAuthCallbackPage() {
  const router = useRouter();
  const { checkAuth, setUser } = useAuthStore();
  const [status, setStatus] = useState('Completing sign-in…');
  const [error, setError] = useState('');

  useEffect(() => {
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

    const code = params.get('code');

    const verify = async () => {
      try {
        if (code && !exchangedCodes.has(code)) {
          exchangedCodes.add(code);
          await api.post('/api/auth/oauth/exchange', { code });
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        const user = await checkAuth();
        if (user) {
          setStatus('Welcome, ' + (user.name || 'User') + '! Redirecting…');
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 600);
        } else {
          throw new Error('No user session found after exchange');
        }
      } catch (err) {
        setStatus('');
        const msg = err?.response?.data?.message || '';
        if (msg.includes('expired') || msg.includes('Invalid')) {
          setError('Sign-in link expired. Please try signing in again.');
        } else {
          setError('Authentication failed. Redirecting to login…');
        }
        setTimeout(() => router.replace('/'), 2500);
      }
    };

    verify();
  }, [checkAuth, router]);

  return (
    <div className="fixed inset-0 bg-[#070c18] flex flex-col items-center justify-center text-white select-none">
      <div className="flex items-center justify-center mb-10">
        <BrandLogo size="lg" theme="dark" showText={true} />
      </div>

      {!error && (
        <div className="mb-6 relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-400 animate-spin" />
        </div>
      )}

      {error && (
        <div className="mb-6 w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
          <span className="text-rose-400 text-xl font-black">!</span>
        </div>
      )}

      <p className={`text-base font-semibold text-center max-w-xs ${error ? 'text-rose-300' : 'text-slate-200'}`}>
        {error || status}
      </p>
      <p className="text-xs text-slate-500 mt-2">
        {error ? 'Taking you back to login…' : 'Please wait a moment.'}
      </p>
    </div>
  );
}

