'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Lock, Phone, Eye, EyeOff, AlertCircle, ArrowRight, Shield } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import Button from '../components/ui/Button';

const MoltenMetal = dynamic(() => import('../components/ui/MoltenMetal'), { ssr: false });

export default function RootPage() {
  const router = useRouter();
  const { checkAuth, login } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const [user, setUser] = useState(null);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showVideo, setShowVideo] = useState(true);

  useEffect(() => {
    const hasPlayed = sessionStorage.getItem('introVideoPlayed');
    if (hasPlayed) {
      setShowVideo(false);
    }
  }, []);

  const handleVideoEnd = () => {
    setShowVideo(false);
    sessionStorage.setItem('introVideoPlayed', 'true');
  };

  useEffect(() => {
    checkAuth().then((u) => { setUser(u); setIsChecking(false); });
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, [checkAuth]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim()) { setError('Please enter your phone number or email'); return; }
    if (!password) { setError('Please enter your password'); return; }
    try {
      setSubmitting(true);
      const res = await login(identifier.trim(), password);
      if (res.success) { router.replace('/dashboard'); }
      else { setError(res.error || 'Invalid credentials'); }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally { setSubmitting(false); }
  };

  const fillCredentials = (type) => {
    setError('');
    if (type === 'admin') { setIdentifier('9999999999'); setPassword('Admin@123'); }
    else { setIdentifier('8888888888'); setPassword('Staff@123'); }
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
          className="absolute top-6 right-6 z-50 text-white/70 hover:text-white px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-all font-medium text-sm"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Skip Intro
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        /* ─── PAGE BACKGROUND ─── */
        .page-bg {
          position: fixed; inset: 0; z-index: 0;
          background: #020818;
          overflow: hidden;
        }

        /* ── NAVBAR ── */
        .gs-nav {
          position: relative; z-index: 20;
          display: flex; align-items: center;
          padding: 16px 36px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: rgba(1,4,15,0.55);
          backdrop-filter: blur(20px);
        }

        /* ── 3D Entry ── */
        .outer-container {
          position: relative; z-index: 10;
          opacity: 0;
          transform: rotateY(-16deg) rotateX(9deg) scale(0.84) translateY(50px);
          transition: opacity 0.85s cubic-bezier(0.22,1,0.36,1), transform 0.85s cubic-bezier(0.22,1,0.36,1);
          transform-style: preserve-3d;
        }
        .outer-container.is-visible {
          opacity: 1;
          transform: rotateY(0) rotateX(0) scale(1) translateY(0);
        }

        /* ── UNIFIED CARD ── */
        .login-card {
          display: flex; gap: 0; width: 100%;
          font-family: 'Inter', sans-serif;
          overflow: hidden; border-radius: 28px;
          padding: 14px 0 14px 14px;
          background: transparent;
          box-shadow: none;
        }

        /* ── LEFT: Form ── */
        .login-left {
          flex: 0.88;
          background: #ffffff;
          display: flex; flex-direction: column; justify-content: center;
          padding: 48px 44px;
          position: relative; z-index: 3;
          min-width: 360px;
          border-radius: 18px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.12);
        }

        .brand-title {
          font-size: 30px; font-weight: 900; color: #0f172a;
          letter-spacing: -0.5px; line-height: 1; margin-bottom: 6px;
        }
        .brand-sub {
          font-size: 10px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.14em; color: #64748b; margin-bottom: 32px;
        }
        .field-label {
          display: block; font-size: 10.5px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.08em;
          color: #475569; margin-bottom: 6px;
        }
        .input-wrap { position: relative; margin-bottom: 20px; }
        .input-icon {
          position: absolute; left: 13px; top: 50%;
          transform: translateY(-50%); color: #94a3b8;
          pointer-events: none; display: flex;
        }
        .field-input {
          width: 100%; border: 1.5px solid #e2e8f0; border-radius: 12px;
          padding: 13px 42px 13px 40px; font-size: 14px; color: #0f172a;
          background: #f8fafc; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          font-family: 'Inter', sans-serif;
        }
        .field-input::placeholder { color: #94a3b8; }
        .field-input:focus { border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
        .eye-btn {
          position: absolute; right: 13px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: #94a3b8;
          display: flex; align-items: center; padding: 4px; transition: color 0.15s;
        }
        .eye-btn:hover { color: #475569; }
        .error-box {
          background: #fff1f2; border: 1.5px solid #fecdd3; border-radius: 10px;
          padding: 11px 14px; display: flex; align-items: flex-start; gap: 8px;
          color: #be123c; font-size: 13px; margin-bottom: 18px;
        }
        .divider { border: none; border-top: 1.5px solid #f1f5f9; margin: 22px 0 16px; }
        .demo-label {
          font-size: 10.5px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.08em; color: #94a3b8; text-align: center;
          display: flex; align-items: center; justify-content: center;
          gap: 6px; margin-bottom: 12px;
        }
        .demo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .demo-btn {
          background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px;
          padding: 11px 13px; text-align: left; cursor: pointer;
          transition: background 0.18s, border-color 0.18s;
        }
        .demo-btn:hover { background: #eff6ff; border-color: #bfdbfe; }
        .demo-btn-title { font-size: 12px; font-weight: 700; color: #1e293b; display: block; margin-bottom: 2px; }
        .demo-btn:hover .demo-btn-title { color: #2563eb; }
        .demo-btn-creds { font-size: 10.5px; color: #64748b; display: block; }

        /* ── RIGHT: Scooty ── */
        .login-right {
          flex: 1.12;
          background: transparent;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          position: relative; overflow: hidden; min-height: 560px;
          border-radius: 0;
          margin-left: 20px;
        }
        .login-right::after {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(ellipse at center, transparent 50%, rgba(2,8,20,0.6) 100%);
          pointer-events: none; z-index: 2;
        }
        .scooty-wrap {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          animation: floatY 6s ease-in-out infinite; z-index: 1;
          transform: scale(1.1);
        }
        @keyframes floatY {
          0%,100% { transform: scale(1.1) translateY(0) rotate(-0.4deg); }
          50%      { transform: scale(1.1) translateY(-20px) rotate(0.4deg); }
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 780px) {
          .login-right { display: none; }
          .login-left { min-width: unset; padding: 36px 28px; }
          .login-card { border-radius: 24px; }
        }
      `}} />

      {/* ── BACKGROUND: MoltenMetal WebGL ── */}
      <div className="page-bg">
        <div style={{ position: 'absolute', inset: 0 }}>
          <MoltenMetal
            color1="#0a1628"
            color2="#1a4480"
            color3="#0ea5e9"
            speed={0.18}
            scale={3.5}
            detail={3}
            glow={1.8}
            coreSize={0.12}
            swirl={0.8}
            fold={-0.15}
            blackPoint={0.0}
            brightness={1.0}
            colorMode="molten"
            grain
            grainIntensity={0.03}
            mouseInteraction
            mouseStrength={0.2}
            opacity={1}
          />
        </div>
        {/* subtle dark vignette overlay so the card reads clearly */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.45) 100%)',
          pointerEvents: 'none'
        }} />
      </div>

      {/* ── NAVBAR ── */}
      <nav className="gs-nav">
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11 flex items-center justify-center rounded-[14px] shadow-[0_0_20px_rgba(16,185,129,0.35)]"
               style={{ background: 'linear-gradient(135deg, #10b981, #065f46)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            <div className="absolute inset-0 rounded-[14px] ring-1 ring-white/20" />
          </div>
          <div className="flex flex-col">
            <span className="text-[22px] font-black tracking-tight text-white uppercase leading-none">
              Go<span className="text-emerald-400">Speedy</span>
            </span>
            <span className="text-[9px] font-bold text-slate-400 tracking-[0.22em] uppercase mt-0.5">
              EV Fleet Finance
            </span>
          </div>
        </div>
      </nav>

      {/* ── MAIN ── */}
      <main className="relative flex-1 flex flex-col items-center justify-center p-6 md:p-10 overflow-hidden" style={{ perspective: '1400px' }}>
        <div className={`outer-container ${mounted ? 'is-visible' : ''}`} style={{ maxWidth: 1160, width: '100%' }}>
          <div className="login-card">

            {/* LEFT: Form */}
            <div className="login-left">
              <div className="brand-title">Go<span style={{ color: '#10b981' }}>Speedy</span></div>
              <div className="brand-sub">Electric Mobility Rental &amp; Finance System</div>

              {error && (
                <div className="error-box">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <label className="field-label" htmlFor="identifier">Phone Number or Email</label>
                <div className="input-wrap">
                  <span className="input-icon"><Phone size={15} /></span>
                  <input
                    id="identifier" type="text" className="field-input"
                    value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. 9999999999 or admin@gmail.com" autoComplete="username"
                  />
                </div>

                <label className="field-label" htmlFor="password">Password</label>
                <div className="input-wrap">
                  <span className="input-icon"><Lock size={15} /></span>
                  <input
                    id="password" type={showPassword ? 'text' : 'password'} className="field-input"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" autoComplete="current-password"
                  />
                  <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <Button type="submit" loading={submitting} variant="primary" size="lg" className="w-full">
                  Sign In to Dashboard <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </form>

              <hr className="divider" />
              <div className="demo-label"><Shield size={13} /> One-Click Demo Access</div>
              <div className="demo-grid">
                <button type="button" className="demo-btn" onClick={() => fillCredentials('admin')}>
                  <span className="demo-btn-title">Admin Account</span>
                  <span className="demo-btn-creds">9999999999 / Admin@123</span>
                </button>
                <button type="button" className="demo-btn" onClick={() => fillCredentials('staff')}>
                  <span className="demo-btn-title">Staff Account</span>
                  <span className="demo-btn-creds">8888888888 / Staff@123</span>
                </button>
              </div>
            </div>

            {/* RIGHT: EV Scooty */}
            <div className="login-right">
              <div className="scooty-wrap">
                <Image src="/hero-scooty.png" alt="Go Speedy EV Scooty" fill className="object-contain" priority />
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
