'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Car,
  BarChart3,
  Zap,
  Shield,
} from 'lucide-react';
import ThemeToggle from '../components/ui/ThemeToggle';
import BrandLogo from '../components/ui/BrandLogo';
import { useAuthStore } from '../store/authStore';
import { gsap } from '../lib/gsap';
import api from '../lib/api';


/* Brand lock-up using BrandLogo */
function Brand({ size = 'nav' }) {
  return (
    <BrandLogo
      size={size}
      theme="auto"
      showText={true}
    />
  );
}

export default function RootPage() {
  const router = useRouter();
  const { login, checkAuth } = useAuthStore();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showVideo, setShowVideo] = useState(false);





  useEffect(() => {
    checkAuth().then((u) => {
      if (u) router.push('/dashboard');
    });
    setMounted(true);
  }, [checkAuth, router]);

  // Subtle GSAP entrance animation
  useEffect(() => {
    if (!showVideo && mounted) {
      gsap.fromTo(
        '.hero-bg-layer',
        { opacity: 0, scale: 1.02 },
        { opacity: 1, scale: 1, duration: 0.6, ease: 'power2.out', clearProps: 'transform' }
      );
      gsap.fromTo(
        '.gsap-left-content',
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', delay: 0.1 }
      );
      gsap.fromTo(
        '.gsap-login-card',
        { opacity: 0, y: 15, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power2.out', delay: 0.2 }
      );
    }
  }, [showVideo, mounted]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Specific validation messages for required fields
    if (!identifier?.trim() && !password?.trim()) {
      setError('Phone number/email and password are both required.');
      return;
    }
    if (!identifier?.trim()) {
      setError('Phone number or email is required.');
      return;
    }
    if (!password?.trim()) {
      setError('Password is required.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await login(identifier.trim(), password);
      if (res && res.success) {
        await checkAuth();
        window.location.href = '/dashboard';
      } else {
        setError(res?.error || 'Wrong password! Please check your password and try again.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Wrong password! Please check your password and try again.');
    } finally {
      setSubmitting(false);
    }
  };




  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#070c18] text-slate-900 dark:text-white flex flex-col overflow-x-hidden select-none transition-colors duration-300">
      {/* ── MOBILE AMBIENT BACKGROUND ── */}
      <div className="desk:hidden fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <img
          src="/ev-hero-bg.jpg"
          alt=""
          className="w-full h-full object-cover object-center opacity-15 dark:opacity-25 filter blur-[1px]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-100/90 via-slate-50/95 to-slate-50 dark:from-[#070c18]/90 dark:via-[#070c18]/95 dark:to-[#070c18]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] bg-emerald-500/10 rounded-full blur-[90px]" />
      </div>

      {/* ── DESKTOP HERO PHOTO (Cinematic EV fleet background) ── */}
      <div className="hero-bg-layer hidden desk:block fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-y-0 left-0 w-[64%] xl:w-[66%] 2xl:w-[68%] max-w-[calc(50vw_+_320px)] flex items-center">
          <div className="relative w-full h-[92%] max-h-[920px] overflow-hidden">
            <img
              src="/ev-hero-bg.jpg"
              alt="Go Speedy EV Fleet"
              className="w-full h-full object-cover object-right opacity-85 dark:opacity-100 transition-opacity"
            />
            {/* Left: typography readability gradient (only behind the text, leaving the scooter clear) */}
            <div className="absolute inset-y-0 left-0 w-[48%] xl:w-[42%] bg-gradient-to-r from-slate-50 via-slate-50/90 to-transparent dark:from-[#070c18] dark:via-[#070c18]/80 dark:to-transparent" />
            {/* Right: soft fade towards the login card */}
            <div className="absolute inset-y-0 right-0 w-[8%] bg-gradient-to-r from-transparent to-slate-50 dark:to-[#070c18]" />
            {/* Top & bottom melts */}
            <div className="absolute inset-x-0 top-0 h-[14%] bg-gradient-to-b from-slate-50 via-slate-50/60 to-transparent dark:from-[#070c18] dark:via-[#070c18]/50 dark:to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-[14%] bg-gradient-to-t from-slate-50 via-slate-50/60 to-transparent dark:from-[#070c18] dark:via-[#070c18]/50 dark:to-transparent" />
          </div>
        </div>
      </div>

      {/* ── NAVBAR ── */}
      <nav className="relative z-20 flex items-center justify-between px-4 xs:px-6 sm:px-8 desk:px-16 py-3 desk:py-5 [@media(max-height:720px)]:desk:!py-3 w-full max-w-[1720px] mx-auto">
        <Brand size="nav" />
        <ThemeToggle variant="glass" />
      </nav>

      {/* ── MAIN CONTENT (Split on desktop, streamlined single-column on mobile) ── */}
      <main className="relative z-10 flex-1 flex flex-col justify-center px-4 xs:px-5 sm:px-8 desk:px-16 py-2 xs:py-4 desk:py-8 [@media(max-height:720px)]:desk:!py-3 w-full max-w-[1720px] mx-auto">
        <div className="w-full grid grid-cols-1 desk:grid-cols-12 desk:gap-10 xl:gap-14 items-center">

          {/* DESKTOP LEFT SIDE: Enterprise Fleet Narrative & Metric Cards (constrained width so scooter stays 100% open) */}
          <div className="gsap-left-content hidden desk:flex desk:col-span-7 flex-col justify-center text-left max-w-[430px] xl:max-w-[460px]">
            {/* Live Ward Status Pill */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold tracking-wide self-start mb-5 backdrop-blur-md shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Delhi-NCR Smart EV Mobility Network • Live Operations</span>
            </div>

            {/* Authoritative Headline */}
            <h1 className="text-4xl xl:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.12]">
              Enterprise EV Fleet &amp; <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400">
                Rental Governance
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm xl:text-base text-slate-600 dark:text-slate-300/85 mt-3.5 leading-relaxed font-normal">
              Unified enterprise portal for city-wide scooter deployment, battery telemetry, automated rent reconciliation, and multi-tier fleet access.
            </p>

            {/* 3 Metric Cards */}
            <div className="grid grid-cols-3 gap-2.5 mt-6 max-w-[440px]">
              <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900/80 border border-slate-200/90 dark:border-white/[0.08] hover:border-emerald-500/40 backdrop-blur-md transition-all group shadow-sm dark:shadow-none">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 group-hover:scale-105 transition-transform">
                  <Car className="w-4 h-4" />
                </div>
                <div className="text-lg xl:text-xl font-bold text-slate-900 dark:text-white tracking-tight">Connected Fleet</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">Multi-Zone NCR Network</div>
              </div>

              <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900/80 border border-slate-200/90 dark:border-white/[0.08] hover:border-teal-500/40 backdrop-blur-md transition-all group shadow-sm dark:shadow-none">
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 mb-3 group-hover:scale-105 transition-transform">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div className="text-lg xl:text-xl font-bold text-slate-900 dark:text-white tracking-tight">100% Digital</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">Daily Ledger &amp; Collections</div>
              </div>

              <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900/80 border border-slate-200/90 dark:border-white/[0.08] hover:border-cyan-500/40 backdrop-blur-md transition-all group shadow-sm dark:shadow-none">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-3 group-hover:scale-105 transition-transform">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="text-lg xl:text-xl font-bold text-slate-900 dark:text-white tracking-tight">Live Telemetry</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">SoC &amp; Asset Protection</div>
              </div>
            </div>

            {/* Bottom Status / Security Bar */}
            <div className="mt-8 pt-5 border-t border-slate-200/80 dark:border-white/[0.08] max-w-[460px] flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2 min-w-0">
                <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="whitespace-nowrap font-medium">Enterprise RBAC Security</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold shrink-0 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span>Grid Operational</span>
              </div>
            </div>
          </div>

          {/* MOBILE BRAND HEADER (Compact, sleek, above card on phone/tablet) */}
          <div className="desk:hidden text-center mb-3 sm:mb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs font-semibold tracking-wider mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Delhi-NCR • Smart Fleet Operations</span>
            </div>
            <h1 className="text-2xl xs:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              EV Fleet &amp; Rental Portal
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-[320px] mx-auto leading-relaxed">
              Sign in to manage fleet operations, rentals, and daily collections.
            </p>
          </div>

          {/* LOGIN CARD */}
          <div className="gsap-login-card desk:col-span-5 w-full max-w-[450px] mx-auto desk:mr-0 desk:max-w-[460px] xl:max-w-[480px]">
            <div className="bg-white/95 dark:bg-[#0b1222]/90 backdrop-blur-2xl rounded-2xl sm:rounded-3xl p-5 sm:p-7 xl:p-8 shadow-xl dark:shadow-[0_25px_70px_rgba(0,0,0,0.7)] border border-slate-200/90 dark:border-white/[0.08] text-slate-900 dark:text-white transition-all">

              {/* Header: starts directly from Welcome Back */}
              <div className="mb-4 desk:mb-6">
                <div className="hidden desk:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs font-semibold tracking-wider mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Fleet Operations Portal</span>
                </div>
                <h2 className="text-xl sm:text-2xl desk:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Welcome Back
                </h2>
                <p className="hidden desk:block text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Sign in to access fleet operations, rentals, and finance.
                </p>
              </div>

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/40 rounded-xl p-3 flex items-start gap-2.5 text-rose-600 dark:text-rose-300 text-xs font-semibold font-sans mb-4 shadow-sm animate-in fade-in duration-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400 mt-0.5" />
                  <div className="flex-1 leading-relaxed">
                    <span>{error}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 font-sans" autoComplete="off">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 font-sans" htmlFor="identifier">
                    Phone Number or Email
                  </label>
                  <div className="relative group">
                    <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${error && (error.toLowerCase().includes('phone') || error.toLowerCase().includes('email') || error.toLowerCase().includes('account') || (!identifier && error))
                      ? 'text-rose-500'
                      : 'text-slate-400 group-focus-within:text-emerald-500'
                      }`}>
                      <User size={16} />
                    </span>
                    <input
                      id="identifier"
                      type="text"
                      className={`w-full bg-slate-50/90 hover:bg-slate-100/80 dark:bg-[#0d1629]/95 dark:hover:bg-[#101b33] border ${error && (error.toLowerCase().includes('phone') || error.toLowerCase().includes('email') || error.toLowerCase().includes('account') || (!identifier && error))
                        ? 'border-rose-500 ring-1 ring-rose-500/40 text-rose-600 dark:text-rose-300'
                        : 'border-slate-300/90 dark:border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white'
                        } rounded-xl pl-11 pr-4 py-3 sm:py-3.5 text-base sm:text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none transition-all font-sans`}
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="e.g. admin@gmail.com or wardadminrohini"
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 font-sans" htmlFor="password">
                    Password
                  </label>
                  <div className="relative group">
                    <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${error && (error.toLowerCase().includes('password') || error.toLowerCase().includes('pass') || (!password && error))
                      ? 'text-rose-500'
                      : 'text-slate-400 group-focus-within:text-emerald-500'
                      }`}>
                      <Lock size={16} />
                    </span>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      className={`w-full bg-slate-50/90 hover:bg-slate-100/80 dark:bg-[#0d1629]/95 dark:hover:bg-[#101b33] border ${error && (error.toLowerCase().includes('password') || error.toLowerCase().includes('pass') || (!password && error))
                        ? 'border-rose-500 ring-1 ring-rose-500/40 text-rose-600 dark:text-rose-300'
                        : 'border-slate-300/90 dark:border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white'
                        } rounded-xl pl-11 pr-11 py-3 sm:py-3.5 text-base sm:text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none transition-all font-sans`}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-2 py-3 sm:py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.99] text-slate-950 font-bold text-sm sm:text-base tracking-wide flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/25 cursor-pointer disabled:opacity-60 font-sans"
                >
                  {submitting ? (
                    <span>Signing In...</span>
                  ) : (
                    <>
                      <span>Sign In to Dashboard</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Enterprise Security Tag */}
              <div className="mt-5 pt-3.5 border-t border-slate-200/80 dark:border-slate-800/70 flex items-center justify-center gap-2 text-[11px] text-slate-500 font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Enterprise 256-Bit SSL Encrypted Session</span>
              </div>
            </div>

            {/* Mobile quick metrics strip (shown only on phone/tablet under the card) */}
            <div className="desk:hidden mt-3.5 w-full grid grid-cols-3 gap-2 text-center">
              <div className="p-2 sm:p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] backdrop-blur-sm shadow-xs">
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight">Delhi-NCR</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Smart Network</div>
              </div>
              <div className="p-2 sm:p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] backdrop-blur-sm shadow-xs">
                <div className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">100% Digital</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Daily Ledger</div>
              </div>
              <div className="p-2 sm:p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] backdrop-blur-sm shadow-xs">
                <div className="text-xs sm:text-sm font-bold text-teal-600 dark:text-teal-400 tracking-tight">Live SoC</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Fleet Telemetry</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 pt-2 pb-5 desk:py-5 px-3 xxs:px-4 xs:px-5 sm:px-8 desk:px-16 w-full max-w-[1720px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 text-[11px] xs:text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
        <div className="leading-relaxed space-y-0.5">
          <div>
            <span>© {new Date().getFullYear()} Go Speedy</span>
            <span className="hidden sm:inline"> • </span>
            <br className="sm:hidden" />
            <span>Electric Mobility Rental &amp; Finance</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer transition-colors text-[11px] xs:text-xs">
          <span>Need Help?</span>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <span className="flex items-center gap-1 font-medium">
            Contact Support <ArrowRight size={12} />
          </span>
        </div>
      </footer>
    </div>
  );
}
