'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Lock, Phone, Eye, EyeOff, AlertCircle, ArrowRight, Shield } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import Button from '../../../components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('Please enter your phone number or email');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    try {
      setSubmitting(true);
      const res = await login(identifier.trim(), password);
      if (res.success) {
        router.replace('/dashboard');
      } else {
        setError(res.error || 'Invalid credentials');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const fillCredentials = (type) => {
    setError('');
    if (type === 'admin') {
      setIdentifier('9999999999');
      setPassword('Admin@123');
    } else {
      setIdentifier('8888888888');
      setPassword('Staff@123');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 mb-4">
          <Zap className="h-8 w-8 fill-current" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Go Speedy EV
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Electric Mobility Rental & Finance Monitor System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200 sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 flex items-start gap-2.5 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="identifier"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Phone Number or Email
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. 9999999999 or admin@gmail.com"
                  className="block w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition-smooth focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Password
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-10 text-sm text-slate-900 placeholder:text-slate-400 transition-smooth focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <Button
                type="submit"
                loading={submitting}
                variant="primary"
                size="lg"
                className="w-full"
              >
                Sign In to Dashboard <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 text-center flex items-center justify-center gap-1">
              <Shield className="w-3.5 h-3.5 text-slate-400" /> One-Click Demo Access
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials('admin')}
                className="rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 p-2 text-left transition-smooth group cursor-pointer"
              >
                <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600">Admin Account</p>
                <p className="text-[10px] text-slate-500">9999999999 / Admin@123</p>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('staff')}
                className="rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 p-2 text-left transition-smooth group cursor-pointer"
              >
                <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600">Staff Account</p>
                <p className="text-[10px] text-slate-500">8888888888 / Staff@123</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
