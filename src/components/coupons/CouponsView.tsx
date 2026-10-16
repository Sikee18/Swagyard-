'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CircleCheck, Info, Pen, Percent, RefreshCw, Sparkles, Tag, Ticket, Trash2 } from 'lucide-react';

interface Coupon {
  id: number;
  code: string;
  percentage: number;
  minOrderPaise: number;
  usageLimit: number | null;
  usageCount: number;
  expiryDate: string | null;
  isActive: boolean;
}

interface CouponForm {
  code: string;
  percentage: string;
  minOrderAmount: string;
  expiryDate: string;
  usageLimit: string;
}

const EMPTY_FORM: CouponForm = { code: '', percentage: '', minOrderAmount: '', expiryDate: '', usageLimit: '' };
const CODE_WORDS = ['SAVE', 'STYLE', 'BOUTIQUE', 'SHOP', 'SPECIAL', 'FASHION', 'NEW'];

const INPUT =
  'w-full rounded-xl border border-gray-300 bg-[#FAFAFA] px-3.5 py-2.5 text-[13px] font-bold text-[#111111] outline-none transition-all focus:border-[#111111] focus:bg-white focus:ring-1 focus:ring-[#111111]';
const LABEL = 'block text-[11px] font-bold uppercase tracking-wider text-gray-700';
const STAT_CARD =
  'bg-white rounded-card border border-borderLight p-5 shadow-soft flex flex-col justify-between hover:shadow-md transition-shadow';

export function CouponsView(_props: { lang?: 'en' | 'ta' }) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState<CouponForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadCoupons = useCallback(async () => {
    try {
      const res = await fetch('/api/coupons');
      if (res.ok) {
        const data: Coupon[] = await res.json();
        setCoupons([...data].sort((a, b) => b.id - a.id));
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const generateCode = () => {
    const word = CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)];
    const num = Math.floor(Math.random() * 90 + 10);
    setForm((f) => ({ ...f, code: `${word}${num}` }));
    clearMessages();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!form.code.trim()) {
      setError('Coupon code is required');
      return;
    }
    const pct = Number(form.percentage);
    if (!(pct > 0 && pct <= 100)) {
      setError('Discount must be between 1% and 100%');
      return;
    }
    const payload = {
      code: form.code.trim().toUpperCase(),
      percentage: pct,
      minOrderAmount: form.minOrderAmount || 0,
      expiryDate: form.expiryDate || null,
      usageLimit: form.usageLimit || null,
    };
    const res =
      editingId !== null
        ? await fetch(`/api/coupons/${editingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/coupons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || 'Failed to save coupon');
      return;
    }
    setForm(EMPTY_FORM);
    setEditingId(null);
    setSuccess(editingId !== null ? 'Coupon updated!' : 'Coupon created!');
    await loadCoupons();
  };

  const startEdit = (c: Coupon) => {
    setEditingId(c.id);
    setForm({
      code: c.code,
      percentage: String(c.percentage ?? ''),
      expiryDate: c.expiryDate ? c.expiryDate.slice(0, 10) : '',
      usageLimit: c.usageLimit !== null ? String(c.usageLimit) : '',
      minOrderAmount: c.minOrderPaise ? String(c.minOrderPaise / 100) : '',
    });
    clearMessages();
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    clearMessages();
  };

  const remove = async (c: Coupon) => {
    if (!window.confirm(`Delete coupon "${c.code}"? This cannot be undone.`)) return;
    await fetch(`/api/coupons/${c.id}`, { method: 'DELETE' });
    await loadCoupons();
  };

  const toggleActive = async (c: Coupon) => {
    await fetch(`/api/coupons/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    await loadCoupons();
  };

  const totalRedemptions = coupons.reduce((sum, c) => sum + (c.usageCount || 0), 0);
  const isEditing = editingId !== null;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-[24px] font-black text-[#111111] tracking-tight">Coupon Management</h2>
          <p className="text-[13px] text-[#6B7280]">Create and manage discount codes. Applies to product subtotal only.</p>
        </div>
        <button
          type="button"
          onClick={loadCoupons}
          title="Refresh coupons list"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#DDD2BE] text-[#111111] font-bold text-xs hover:bg-[#FBFAF6] transition-all cursor-pointer hover:scale-[1.02]"
        >
          <RefreshCw size={14} className="text-[#7A6A4F]" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={STAT_CARD}>
          <div>
            <div className="flex items-start justify-between gap-2 mb-3">
              <p className="text-[11px] font-bold text-[#111111] uppercase tracking-wider">Total Coupons</p>
              <div className="w-8 h-8 rounded-full bg-[#FBFAF6] border border-[#DDD2BE] flex items-center justify-center text-[#7A6A4F] shrink-0">
                <Tag size={15} />
              </div>
            </div>
            <p className="text-[24px] font-black leading-tight text-[#111111] mb-1">{coupons.length}</p>
          </div>
          <p className="text-[12px] text-[#6B7280] leading-snug">Configured promotional codes</p>
        </div>

        <div className={STAT_CARD}>
          <div>
            <div className="flex items-start justify-between gap-2 mb-3">
              <p className="text-[11px] font-bold text-[#111111] uppercase tracking-wider">Active Coupons</p>
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CircleCheck size={15} />
              </div>
            </div>
            <p className="text-[24px] font-black leading-tight text-emerald-600 mb-1">
              {coupons.filter((c) => c.isActive).length}
            </p>
          </div>
          <p className="text-[12px] text-[#6B7280] leading-snug">Live &amp; ready at POS checkout</p>
        </div>

        <div className={STAT_CARD}>
          <div>
            <div className="flex items-start justify-between gap-2 mb-3">
              <p className="text-[11px] font-bold text-[#111111] uppercase tracking-wider">Total Redemptions</p>
              <div className="w-8 h-8 rounded-full bg-[#111111] text-[#C9B79C] border border-[#C9B79C]/40 flex items-center justify-center shrink-0">
                <Percent size={15} />
              </div>
            </div>
            <p className="text-[24px] font-black leading-tight text-[#111111] mb-1">{totalRedemptions}</p>
          </div>
          <p className="text-[12px] text-[#6B7280] leading-snug">Total customer discount usages</p>
        </div>
      </div>

      <div className="rounded-xl border border-[#DDD2BE]/60 bg-[#FBFAF6] px-4 py-2.5 text-[12px] font-medium text-[#6C665C] flex items-center gap-2.5">
        <Info size={16} className="text-[#7A6A4F] shrink-0" />
        <span>Coupon discount applies to product subtotal only — delivery charges are excluded.</span>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
        <form
          onSubmit={submit}
          className="bg-white rounded-card border border-borderLight p-6 shadow-soft space-y-4 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#111111] text-[#C9B79C] border border-[#C9B79C]/30 text-[10px] font-black uppercase tracking-wider">
                  {isEditing ? 'EDIT MODE' : 'NEW COUPON'}
                </span>
                <h3 className="mt-1.5 text-[18px] font-black text-[#111111]">{isEditing ? 'Edit Coupon' : 'Create Coupon'}</h3>
              </div>
              {isEditing && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-3 py-1 rounded-full border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-[12px] font-bold text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-[12px] font-bold text-emerald-700">
                {success}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className={LABEL}>
                  Coupon Code <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 min-w-0 rounded-xl border border-gray-300 bg-[#FAFAFA] px-3.5 py-2.5 text-[13px] font-mono font-black uppercase tracking-wider text-[#111111] outline-none transition-all focus:border-[#111111] focus:bg-white focus:ring-1 focus:ring-[#111111] disabled:opacity-60"
                    placeholder="WELCOME10"
                    value={form.code}
                    disabled={isEditing}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }));
                      clearMessages();
                    }}
                  />
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={generateCode}
                      className="inline-flex items-center gap-1.5 shrink-0 rounded-xl bg-[#111111] border border-[#C9B79C] text-[#C9B79C] px-4 py-2.5 text-xs font-black uppercase tracking-wider hover:bg-[#262626] transition-all cursor-pointer hover:scale-[1.02]"
                    >
                      <Sparkles size={13} className="text-[#7A6A4F]" />
                      <span>Generate</span>
                    </button>
                  )}
                </div>
                {isEditing && <p className="text-[10px] font-medium text-[#6B7280]">Code cannot be changed when editing</p>}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className={LABEL}>
                    Discount % <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className={INPUT}
                    placeholder="10"
                    value={form.percentage}
                    onChange={(e) => setForm((f) => ({ ...f, percentage: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={LABEL}>Min Order (INR)</label>
                  <input
                    type="number"
                    min="0"
                    className={INPUT}
                    placeholder="0 = no minimum"
                    value={form.minOrderAmount}
                    onChange={(e) => setForm((f) => ({ ...f, minOrderAmount: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className={LABEL}>Expiry Date</label>
                  <input
                    type="date"
                    className={INPUT}
                    value={form.expiryDate}
                    onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={LABEL}>Usage Limit</label>
                  <input
                    type="number"
                    min="1"
                    className={INPUT}
                    placeholder="Unlimited"
                    value={form.usageLimit}
                    onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full rounded-xl bg-[#111111] border border-[#C9B79C] text-[#C9B79C] py-3 text-[13px] font-black uppercase tracking-wider shadow-md hover:bg-[#262626] hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Ticket size={15} className="text-[#7A6A4F]" />
              <span>{isEditing ? 'Update Coupon' : 'Create Coupon'}</span>
            </button>
          </div>
        </form>

        <div className="bg-white rounded-card border border-borderLight p-6 shadow-soft flex flex-col">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <h3 className="text-[18px] font-black text-[#111111]">All Coupons</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-[#111111] text-white text-[11px] font-black">{coupons.length}</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-[#FBFAF6] border border-[#DDD2BE] text-[#7A6A4F] text-[10px] font-black uppercase tracking-wider">
              Admin Only
            </span>
          </div>

          <div className="space-y-3 max-h-[34rem] overflow-y-auto pr-1">
            {coupons.map((c) => {
              const expired = c.expiryDate ? new Date(c.expiryDate) < new Date() : false;
              const used = c.usageCount || 0;
              const limitReached = c.usageLimit !== null && used >= c.usageLimit;
              const selected = editingId === c.id;
              const minOrder = c.minOrderPaise / 100;
              return (
                <div
                  key={c.id}
                  className={`rounded-xl border p-4 transition-all ${
                    selected
                      ? 'border-[#C9B79C] bg-[#FBFAF6] ring-2 ring-[#C9B79C]/30'
                      : 'border-gray-200 bg-white hover:border-[#C9B79C]/60 hover:shadow-md'
                  }`}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[16px] font-mono font-black uppercase tracking-wider text-[#111111]">{c.code}</p>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider border ${
                            c.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}
                        >
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {expired && (
                          <span className="rounded-full bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
                            Expired
                          </span>
                        )}
                        {!expired && limitReached && (
                          <span className="rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
                            Limit reached
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] font-black text-[#7A6A4F]">
                        {c.percentage}% OFF{minOrder > 0 && ` • min order ₹${minOrder}`}
                      </p>
                      <p className="text-[11px] font-medium text-[#6B7280]">
                        Used {used}
                        {c.usageLimit ? `/${c.usageLimit}` : ''} times
                        {c.expiryDate ? ` • expires ${new Date(c.expiryDate).toLocaleDateString('en-IN')}` : ' • no expiry'}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleActive(c)}
                        title={c.isActive ? 'Click to deactivate' : 'Click to activate'}
                        className={`rounded-lg px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          c.isActive
                            ? 'bg-[#111111] text-[#C9B79C] border border-[#C9B79C]/40 hover:bg-[#262626]'
                            : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {c.isActive ? 'Active' : 'Off'}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(c)}
                        title="Edit coupon"
                        className="w-8 h-8 rounded-lg border border-gray-200 bg-white hover:border-[#C9B79C] hover:bg-[#FBFAF6] text-gray-700 hover:text-[#7A6A4F] flex items-center justify-center transition-all cursor-pointer"
                      >
                        <Pen size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(c)}
                        title="Delete coupon"
                        className="w-8 h-8 rounded-lg border border-gray-200 bg-white hover:border-red-200 hover:bg-red-50 text-gray-400 hover:text-red-600 flex items-center justify-center transition-all cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {coupons.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[#DDD2BE] bg-[#FBFAF6] py-12 text-center text-[13px] font-bold text-[#6B7280]">
                No coupons yet. Create your first coupon!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
