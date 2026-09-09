'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Lock,
  ArrowRight,
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  Zap,
  Leaf,
  Car,
  Calendar,
  BarChart3,
  Crown,
  Users,
  Mail,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  X,
} from 'lucide-react';
import ThemeToggle from '../components/ui/ThemeToggle';
import { useAuthStore } from '../store/authStore';
import { gsap } from '../lib/gsap';
import api from '../lib/api';

const FEATURES = [
  { icon: Car, title: 'Fleet Management', desc: 'Track and manage your EV fleet' },
  { icon: Calendar, title: 'Rental Operations', desc: 'Streamline bookings and rentals' },
  { icon: BarChart3, title: 'Finance & Collections', desc: 'Stay in control of your revenue' },
];


/* Brand lock-up: "GoSpeedy" + "EV FLEET FINANCE". `nav` scales up on the desktop split layout.
   `nav` always sits over the (theme-invariant) hero photo, so it stays white. `lg` sits inside the
   login card instead, which now follows the page theme, so it needs light/dark text of its own. */
function Brand({ size = 'nav' }) {
  const s =
    size === 'lg'
      ? {
          box: 'w-14 h-14 rounded-2xl',
          bolt: 'h-6 w-6',
          name: 'text-[30px]',
          sub: 'text-[11px] tracking-[0.2em] mt-1',
          nameColor: 'text-slate-900 dark:text-white',
          subColor: 'text-slate-500 dark:text-slate-400',
        }
      : {
          box: 'w-9 h-9 rounded-xl desk:w-14 desk:h-14 desk:rounded-2xl',
          bolt: 'h-[18px] w-[18px] desk:h-6 desk:w-6',
          name: 'text-[22px] desk:text-[30px]',
          sub: 'text-[8px] tracking-[0.2em] mt-0.5 desk:text-[11px] desk:mt-1',
          nameColor: 'text-white',
          subColor: 'text-slate-400',
        };
  return (
    <div className="flex items-center gap-2.5 desk:gap-3">
      <div
        className={`${s.box} flex items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-600 shadow-md shadow-emerald-500/25`}
      >
        <Zap className={`${s.bolt} fill-white text-white`} />
      </div>
      <div className="flex flex-col leading-none">
        <span className={`${s.name} font-extrabold tracking-tight ${s.nameColor} leading-none`}>
          Go<span className="text-emerald-400">Speedy</span>
        </span>
        <span className={`${s.sub} font-bold ${s.subColor} uppercase`}>EV Fleet Finance</span>
      </div>
    </div>
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
  const [showVideo, setShowVideo] = useState(true);

  // Forgot Password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState('request'); // 'request' | 'verify' | 'success'
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // Resend OTP countdown timer
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes('@')) {
      setForgotError('Please enter a valid email address.');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    try {
      const res = await api.post('/api/auth/forgot-password', { email: forgotEmail });
      setForgotSuccess(res.data?.message || 'Verification code sent to your email!');
      setForgotStep('verify');
      setResendTimer(60);
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Failed to send OTP. Please check your email and try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    if (!forgotOtp || forgotOtp.trim().length !== 6) {
      setForgotError('Please enter the 6-digit OTP code sent to your email.');
      return;
    }
    if (!forgotNewPass || forgotNewPass.length < 6) {
      setForgotError('Password must be at least 6 characters long.');
      return;
    }
    if (forgotNewPass !== forgotConfirmPass) {
      setForgotError('Passwords do not match. Please re-enter.');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    try {
      const res = await api.post('/api/auth/reset-password', {
        email: forgotEmail,
        otp: forgotOtp.trim(),
        newPassword: forgotNewPass,
      });
      setForgotStep('success');
      setForgotSuccess(res.data?.message || 'Password reset successful!');
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Failed to reset password. Please check your OTP.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleBackToLoginFromForgot = () => {
    setIsForgotModalOpen(false);
    if (forgotEmail) {
      setIdentifier(forgotEmail);
    }
    setForgotStep('request');
    setForgotError('');
    setForgotSuccess('');
    setForgotOtp('');
    setForgotNewPass('');
    setForgotConfirmPass('');
  };

  useEffect(() => {
    const hasPlayed = sessionStorage.getItem('introVideoPlayed');
    if (hasPlayed) {
      setShowVideo(false);
    }

    // Check for OAuth error query params (e.g. ?error=account_deactivated)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const errParam = params.get('error');
      if (errParam === 'not_registered') {
        setError('Access denied. Your email is not registered. Kindly contact admin to get an account.');
        window.history.replaceState({}, '', window.location.pathname);
      } else if (errParam === 'account_deactivated') {
        setError('Your account is deactivated. Kindly contact admin.');
        window.history.replaceState({}, '', window.location.pathname);
      } else if (errParam === 'oauth_failed') {
        setError('Google sign-in failed or was cancelled. Please try again.');
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const handleVideoEnd = () => {
    setShowVideo(false);
    sessionStorage.setItem('introVideoPlayed', 'true');
  };

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
        router.push('/dashboard');
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


  if (showVideo) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center overflow-hidden">
        <video
          src="/generate_a_video_in_which_the (1).mp4"
          autoPlay
          muted
          playsInline
          onEnded={handleVideoEnd}
          className="w-full h-full object-cover"
        />
        <button
          onClick={handleVideoEnd}
          className="absolute top-6 right-6 z-50 text-white/70 hover:text-white px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-all font-medium text-sm cursor-pointer"
        >
          Skip Intro
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#070c18] text-white flex flex-col overflow-x-hidden select-none">
      {/* ── DESKTOP HERO PHOTO (split layout only): cinematic, near full-height photo on the left ~62% of the
          screen. It is anchored to its right edge so the scooter sits centre-left and the charging station
          ends just before the login-card column; only the far-left (tree) is trimmed, under the headline. ── */}
      <div className="hero-bg-layer hidden desk:block fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-y-0 left-0 w-[60%] xl:w-[61%] 2xl:w-[63%] min-[1700px]:w-[65%] max-w-[calc(50vw_+_260px)] flex items-center">
          <div className="relative w-full h-[90%] max-h-[900px] overflow-hidden">
            <img
              src="/ev-hero-bg.jpg"
              alt=""
              className="w-full h-full object-cover object-right"
            />
            {/* Left: typography contrast (wider on smaller desktops where the copy reaches further right) */}
            <div className="absolute inset-y-0 left-0 w-[64%] xl:w-[56%] bg-gradient-to-r from-[#070c18]/90 via-[#070c18]/45 to-transparent" />
            {/* Right: soft fade towards the login card */}
            <div className="absolute inset-y-0 right-0 w-[5%] bg-gradient-to-r from-transparent to-[#070c18]" />
            {/* Top / bottom: melt into the page */}
            <div className="absolute inset-x-0 top-0 h-[14%] bg-gradient-to-b from-[#070c18] via-[#070c18]/55 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-[12%] bg-gradient-to-t from-[#070c18] via-[#070c18]/55 to-transparent" />
          </div>
        </div>
      </div>

      {/* ── NAVBAR ── */}
      <nav className="relative z-20 flex items-center justify-between px-5 sm:px-8 desk:px-16 py-3 desk:py-5 [@media(max-height:720px)]:desk:!py-3 w-full max-w-[1720px] mx-auto">
        <Brand size="nav" />
        <ThemeToggle variant="glass" />
      </nav>

      {/* ── MOBILE / TABLET HERO (stacked layout): the photo sits behind the copy, scooter on the right,
          copy on the darkened left, and it melts into the page just above the login card. ── */}
      <section className="hero-bg-layer desk:hidden relative isolate -mt-[60px] pt-[60px] overflow-hidden">
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <img
            src="/ev-hero-bg.jpg"
            alt=""
            className="w-full h-full object-cover object-[80%_center] sm:object-[70%_center]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070c18]/95 via-[#070c18]/60 to-[#070c18]/10" />
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#070c18]/80 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-[#070c18] via-[#070c18]/60 to-transparent" />
        </div>

        <div className="gsap-left-content px-5 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6 w-full max-w-[1720px] mx-auto [text-shadow:0_1px_2px_rgba(7,12,24,0.9),0_2px_14px_rgba(7,12,24,0.8)]">
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.18em] text-emerald-400 leading-relaxed">
            Clean Mobility.
            <br className="sm:hidden" />
            <span className="hidden sm:inline"> </span>
            Better Tomorrow.
          </p>

          <h1 className="mt-2 sm:mt-3 text-[26px] sm:text-5xl font-black tracking-tight leading-[1.12] sm:leading-[1.1] max-w-[70%] sm:max-w-[60%] text-white">
            Powering Smarter <br />
            <span className="text-emerald-400">Electric Mobility.</span>
          </h1>

          <p className="mt-2.5 sm:mt-4 text-[13px] sm:text-lg text-slate-300/90 leading-relaxed max-w-[68%] sm:max-w-[58%]">
            Manage EV rentals, fleet operations and finance — all from one simple platform.
          </p>

          {/* Feature row (icon + title) */}
          <div className="mt-5 sm:mt-7 grid grid-cols-3 gap-2 sm:gap-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <h4 className="text-[11px] sm:text-sm font-bold text-white leading-tight">{f.title}</h4>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── MAIN: desktop = split (copy left / card right); stacked = card only (copy lives in the hero above) ── */}
      <main className="relative z-10 flex-1 flex items-center px-5 sm:px-8 desk:px-16 pt-1 pb-6 sm:pb-8 desk:py-8 [@media(max-height:720px)]:desk:!py-3 w-full max-w-[1720px] mx-auto">
        <div className="w-full grid grid-cols-1 desk:grid-cols-12 desk:gap-12 items-center">
          {/* LEFT SIDE (desktop only): intro & features */}
          <div className="gsap-left-content hidden desk:flex desk:col-span-7 flex-col justify-center text-left [text-shadow:0_1px_2px_rgba(7,12,24,0.9),0_2px_14px_rgba(7,12,24,0.8)]">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 text-sm font-semibold tracking-wide self-start mb-6">
              <Leaf className="w-4 h-4 fill-emerald-400 text-emerald-400" />
              <span>Clean Mobility. Better Tomorrow.</span>
            </div>

            {/* Headline */}
            <h1 className="text-[52px] xl:text-[58px] 2xl:text-[64px] font-black text-white tracking-tight leading-[1.08]">
              Powering Smarter <br />
              <span className="text-emerald-400">Electric Mobility.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg xl:text-xl text-slate-300/90 mt-5 max-w-[520px] leading-relaxed">
              Manage EV rentals, fleet operations and finance — all from one simple platform.
            </p>

            {/* Feature columns */}
            <div className="grid grid-cols-3 gap-6 mt-9 max-w-[640px]">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="max-w-[140px]">
                      <h4 className="text-[17px] font-bold text-white leading-snug">{f.title}</h4>
                      <p className="hidden xl:block text-[13px] text-slate-400 mt-1 leading-snug">{f.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tagline */}
            <div className="mt-9 pt-4 border-t border-emerald-500/20 max-w-[640px] flex items-center gap-2 text-sm text-slate-400">
              <span className="w-1 h-4 bg-emerald-400 rounded-full inline-block" />
              <span>Built for a cleaner, smarter, and more sustainable future.</span>
            </div>
          </div>

          {/* LOGIN CARD */}
          <div className="gsap-login-card desk:col-span-5 w-full max-w-[540px] mx-auto desk:mr-0 desk:max-w-[520px] xl:max-w-[540px]">
            <div className="bg-white/90 dark:bg-[#0b1222]/85 backdrop-blur-2xl rounded-2xl desk:rounded-[28px] p-5 sm:p-7 desk:p-8 xl:p-9 [@media(max-height:720px)]:desk:!p-6 shadow-[0_25px_60px_rgba(15,23,42,0.15)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.7)] border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white transition-all">
              {/* Card brand header (desktop only) */}
              <div className="hidden desk:block mb-7 [@media(max-height:720px)]:desk:!hidden">
                <Brand size="lg" />
              </div>

              <div className="mb-5 desk:mb-6 [@media(max-height:720px)]:desk:!mb-4">
                <h2 className="text-[22px] desk:text-[34px] [@media(max-height:720px)]:desk:!text-[26px] font-black text-slate-900 dark:text-white tracking-tight leading-tight">Welcome back</h2>
                <p className="text-[13px] desk:text-base text-slate-500 dark:text-slate-400 mt-1 desk:mt-1.5">Sign in to continue to your dashboard.</p>
              </div>

              {error && (
                <div className="bg-rose-500/10 dark:bg-rose-950/60 border border-rose-400 dark:border-rose-600/80 rounded-xl p-3.5 flex items-start gap-3 text-rose-600 dark:text-rose-300 text-xs font-semibold mb-4 shadow-md shadow-rose-950/20 animate-in fade-in duration-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                  <div className="flex-1 leading-relaxed">
                    <span className="font-bold">{error}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 desk:space-y-5 [@media(max-height:720px)]:desk:!space-y-4">
                <div>
                  <label className="block text-[10px] desk:text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5 desk:mb-2" htmlFor="identifier">
                    Phone Number or Email
                  </label>
                  <div className="relative">
                    <span className={`absolute left-3.5 desk:left-4 top-1/2 -translate-y-1/2 ${
                      error && (error.toLowerCase().includes('phone') || error.toLowerCase().includes('email') || error.toLowerCase().includes('account') || (!identifier && error))
                        ? 'text-rose-500'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      <User size={16} />
                    </span>
                    <input
                      id="identifier"
                      type="text"
                      className={`w-full bg-slate-50 dark:bg-[#131d35]/90 border ${
                        error && (error.toLowerCase().includes('phone') || error.toLowerCase().includes('email') || error.toLowerCase().includes('account') || (!identifier && error))
                          ? 'border-rose-500 ring-1 ring-rose-500/40 text-rose-600 dark:text-rose-300'
                          : 'border-slate-200 dark:border-slate-700/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 text-slate-900 dark:text-white'
                      } rounded-xl pl-10 desk:pl-11 pr-4 py-3 desk:py-3.5 [@media(max-height:720px)]:desk:!py-3 text-sm desk:text-base placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none transition-all font-sans`}
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="e.g. 9999999999 or admin@gmail.com"
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 desk:mb-2">
                    <label className="block text-[10px] desk:text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300" htmlFor="password">
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <span className={`absolute left-3.5 desk:left-4 top-1/2 -translate-y-1/2 ${
                      error && (error.toLowerCase().includes('password') || error.toLowerCase().includes('pass') || (!password && error))
                        ? 'text-rose-500'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      <Lock size={16} />
                    </span>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      className={`w-full bg-slate-50 dark:bg-[#131d35]/90 border ${
                        error && (error.toLowerCase().includes('password') || error.toLowerCase().includes('pass') || (!password && error))
                          ? 'border-rose-500 ring-1 ring-rose-500/40 text-rose-600 dark:text-rose-300'
                          : 'border-slate-200 dark:border-slate-700/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 text-slate-900 dark:text-white'
                      } rounded-xl pl-10 desk:pl-11 pr-11 py-3 desk:py-3.5 [@media(max-height:720px)]:desk:!py-3 text-sm desk:text-base placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none transition-all font-sans`}
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
                  className="w-full mt-1 py-3 desk:py-3.5 [@media(max-height:720px)]:desk:!py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white font-bold text-sm desk:text-base tracking-wide flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/25 cursor-pointer disabled:opacity-60"
                >
                  {submitting ? (
                    <span>Signing In...</span>
                  ) : (
                    <>
                      <span>Sign In to Dashboard</span>
                      <ArrowRight className="h-4 w-4 desk:h-5 desk:w-5" />
                    </>
                  )}
                </button>
              </form>

              {/* ── Google OAuth Button ── */}
              <a
                href="/api/auth/google"
                className="mt-3 w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl
                           bg-white hover:bg-slate-50 active:bg-slate-100
                           text-slate-800 font-semibold text-sm tracking-wide
                           shadow-md shadow-black/10 dark:shadow-black/20 border border-slate-200 dark:border-white/20
                           transition-all duration-200 cursor-pointer group"
              >
                {/* Official Google "G" SVG */}
                <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
                <span>Continue with Google</span>
              </a>

              {/* ── Forgot Password Section (Bottom) ── */}
              <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col items-center justify-center text-center">
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(identifier.includes('@') ? identifier : '');
                    setForgotStep('request');
                    setForgotError('');
                    setForgotSuccess('');
                    setForgotOtp('');
                    setForgotNewPass('');
                    setForgotConfirmPass('');
                    setIsForgotModalOpen(true);
                  }}
                  className="group inline-flex items-center gap-2 text-xs desk:text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer py-1.5 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  <KeyRound size={15} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                  <span>Forgot your password?</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 underline underline-offset-2">Reset Password</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 pt-2 pb-5 desk:py-5 px-5 sm:px-8 desk:px-16 w-full max-w-[1720px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 text-xs text-slate-400 text-center sm:text-left">
        <div className="leading-relaxed">
          <span>© {new Date().getFullYear()} Go Speedy</span>
          <span className="hidden sm:inline"> • </span>
          <br className="sm:hidden" />
          <span>Electric Mobility Rental &amp; Finance</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400 hover:text-white cursor-pointer transition-colors">
          <span>Need Help?</span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1 font-medium">
            Contact Support <ArrowRight size={12} />
          </span>
        </div>
      </footer>

      {/* ── FORGOT PASSWORD MODAL ── */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-md bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/40 text-slate-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsForgotModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* STEP 1: REQUEST OTP */}
            {forgotStep === 'request' && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                    <KeyRound size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Reset Password</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Receive a 6-digit OTP on your registered email</p>
                  </div>
                </div>

                {forgotError && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                      Registered Email Address
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <Mail size={16} />
                      </span>
                      <input
                        type="email"
                        required
                        placeholder="e.g. staff@gmail.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#131d35] border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-sans"
                        autoFocus
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Enter the email address associated with your staff or admin account.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {forgotLoading ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Verification Code</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* STEP 2: VERIFY OTP & RESET */}
            {forgotStep === 'verify' && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                    <Shield size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Enter OTP &amp; New Password</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Code sent to <span className="text-emerald-500 font-semibold">{forgotEmail}</span>
                    </p>
                  </div>
                </div>

                {forgotSuccess && (
                  <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{forgotSuccess}</span>
                  </div>
                )}

                {forgotError && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-4">
                  {/* OTP Input */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                      6-Digit OTP Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="000000"
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-slate-50 dark:bg-[#131d35] border border-slate-200 dark:border-slate-700 rounded-xl py-3 text-center text-2xl font-mono tracking-[8px] font-black text-emerald-600 dark:text-emerald-400 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                      autoFocus
                    />
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <Lock size={16} />
                      </span>
                      <input
                        type={showForgotPass ? 'text' : 'password'}
                        required
                        minLength={6}
                        placeholder="Min 6 characters"
                        value={forgotNewPass}
                        onChange={(e) => setForgotNewPass(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#131d35] border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-sans"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotPass(!showForgotPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        {showForgotPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <Lock size={16} />
                      </span>
                      <input
                        type={showForgotPass ? 'text' : 'password'}
                        required
                        minLength={6}
                        placeholder="Re-enter new password"
                        value={forgotConfirmPass}
                        onChange={(e) => setForgotConfirmPass(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#131d35] border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-sans"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => setForgotStep('request')}
                      className="text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors underline cursor-pointer"
                    >
                      Change email
                    </button>
                    {resendTimer > 0 ? (
                      <span className="text-slate-400">Resend code in {resendTimer}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRequestOtp}
                        className="text-emerald-500 hover:underline font-semibold cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw size={12} /> Resend OTP
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {forgotLoading ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <span>Reset Password</span>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* STEP 3: SUCCESS */}
            {forgotStep === 'success' && (
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Password Reset Successfully!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-6 leading-relaxed">
                  Your GoSpeedy password has been updated. You can now sign in using your new password.
                </p>
                <button
                  type="button"
                  onClick={handleBackToLoginFromForgot}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Sign In Now</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
