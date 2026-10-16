'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, Eye, EyeOff, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [lang, setLang] = useState<'en' | 'ta'>('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError(
        lang === 'en'
          ? 'Invalid Admin or Staff credentials'
          : 'தவறான நிர்வாகி அல்லது பணியாளர் விவரங்கள்'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(
          lang === 'en'
            ? data.error || 'Invalid Admin or Staff credentials'
            : 'தவறான நிர்வாகி அல்லது பணியாளர் விவரங்கள்'
        );
        setLoading(false);
        return;
      }

      // Successful login -> Redirect to POS dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(
        lang === 'en'
          ? 'Network error. Please try again.'
          : 'பிணையப் பிழை. மீண்டும் முயற்சிக்கவும்.'
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111111] flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background ambient gold luxury glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#C9B79C]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#C9B79C]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Language Toggle in Top Right */}
      <div className="absolute top-6 right-6 z-10">
        <button
          onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#C9B79C] text-xs font-semibold border border-[#C9B79C]/30 transition-all flex items-center gap-1.5"
        >
          <span>{lang === 'en' ? 'தமிழ்' : 'English'}</span>
        </button>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-[#191919] border border-[#C9B79C]/40 rounded-2xl shadow-[0_0_40px_rgba(201,183,156,0.15),0_20px_50px_rgba(0,0,0,0.6)] p-8 relative z-10 backdrop-blur-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#111111] to-[#262626] border border-[#C9B79C]/50 text-[#C9B79C] shadow-lg mb-3">
            <Sparkles size={28} className="text-[#C9B79C]" />
          </div>
          <h1 className="text-2xl font-black tracking-wider uppercase text-white font-display">
            Swagyard
          </h1>
          <p className="text-xs text-[#C9B79C] font-medium tracking-wide mt-1">
            {lang === 'en' ? 'Retail Billing & Inventory' : 'சில்லறை பில்லிங் & சரக்கு மேலாண்மை'}
          </p>
          <div className="inline-flex items-center gap-1 mt-3 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-white/70">
            <ShieldCheck size={12} className="text-[#C9B79C]" />
            <span>{lang === 'en' ? 'Admin / Staff Portal' : 'நிர்வாக நுழைவு'}</span>
          </div>
        </div>

        {/* Error Alert Banner */}
        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-rose-400 text-xs animate-shake">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-1.5">
              {lang === 'en' ? 'Portal ID' : 'பயனர் அடையாளம்'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
                <User size={16} />
              </div>
              <input
                id="admin-portal-id"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={lang === 'en' ? 'Enter admin portal ID' : 'பயனர் பெயரை உள்ளிடவும்'}
                className="w-full pl-10 pr-4 py-2.5 bg-[#111111] border border-white/15 focus:border-[#C9B79C] rounded-xl text-sm text-white placeholder-white/30 outline-none transition-colors"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-1.5">
              {lang === 'en' ? 'Portal Password' : 'கடவுச்சொல்'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
                <Lock size={16} />
              </div>
              <input
                id="admin-portal-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-[#111111] border border-white/15 focus:border-[#C9B79C] rounded-xl text-sm text-white placeholder-white/30 outline-none transition-colors"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-white/40 hover:text-white transition-colors"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm tracking-wide bg-[#C9B79C] hover:bg-[#A8946F] text-[#111111] transition-all shadow-lg active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>{lang === 'en' ? 'Sign In' : 'உள்நுழைக'}</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-[11px] text-white/40">
          <span>Swagyard Retail POS • Secure Server-Side Authentication</span>
        </div>
      </div>
    </div>
  );
}
