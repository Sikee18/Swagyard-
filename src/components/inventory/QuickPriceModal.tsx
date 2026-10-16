'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleAlert, Pen, X } from 'lucide-react';
import type { InventorySku } from '@/lib/inventory';

export function QuickPriceModal({
  item,
  onClose,
  onSuccess,
}: {
  item: InventorySku;
  onClose: () => void;
  onSuccess: (price: number, costPrice?: number) => void;
}) {
  const [price, setPrice] = useState(String(item.price ?? ''));
  const [cost, setCost] = useState(item.purchasePrice ? String(item.purchasePrice) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const selling = Number(price);
    if (isNaN(selling) || selling < 0) return setError('Please enter a valid selling price.');
    const costValue = cost.trim() !== '' ? Number(cost) : undefined;
    if (costValue !== undefined && (isNaN(costValue) || costValue < 0)) return setError('Please enter a valid cost price.');
    setSaving(true);
    try {
      const res = await fetch('/api/inventory/price', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: item.productId, variantId: item.variantId, price: selling, costPrice: costValue }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to update price');
      onSuccess(selling, costValue);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update price');
    } finally {
      setSaving(false);
    }
  };

  const input =
    'w-full h-11 pl-8 pr-3 rounded-xl border border-gray-300 bg-slate-50 text-sm font-bold text-gray-900 outline-none focus:border-[#111111] focus:bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-3xl max-w-sm w-full border border-[#DDD2BE] shadow-2xl overflow-hidden">
        <div className="px-5 py-4 bg-[#111111] text-white flex items-center justify-between border-b border-[#C9B79C]/30">
          <div>
            <h3 className="text-sm font-black flex items-center gap-2">
              <Pen size={15} className="text-[#C9B79C]" /> Quick Edit Price
            </h3>
            <p className="text-[10px] text-[#7A6A4F] font-semibold mt-0.5">Barcode is linked — changing price updates live POS instantly</p>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer">
            <X size={15} />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4 text-xs">
          <div className="p-3 bg-[#FBFAF6] border border-gray-200 rounded-xl space-y-1.5 text-xs">
            <div className="font-black text-gray-900">{item.name}</div>
            {item.variantName && (
              <div>
                <span className="text-gray-500">Variant: </span>
                <span className="font-bold">{item.variantName}</span>
              </div>
            )}
            {item.barcode && (
              <div>
                <span className="text-gray-500">Barcode: </span>
                <strong className="font-mono">{item.barcode}</strong>
              </div>
            )}
          </div>
          {error && (
            <div className="flex items-center gap-2 text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 p-3 rounded-xl">
              <CircleAlert size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div>
            <label htmlFor="quick-selling-price" className="block text-[11px] font-bold text-gray-700 mb-1">
              Selling Price (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-sm">₹</span>
              <input id="quick-selling-price" type="number" step="0.01" min="0" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} className={input} />
            </div>
            <p className="text-[10px] text-gray-500 mt-1">Reflected immediately in POS scanning &amp; digital invoice</p>
          </div>
          <div>
            <label htmlFor="quick-cost-price" className="block text-[11px] font-bold text-gray-700 mb-1">
              Purchase / Cost Price (₹) <span className="text-gray-400 font-medium">(Optional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-sm">₹</span>
              <input id="quick-cost-price" type="number" step="0.01" min="0" placeholder="0.00" value={cost} onChange={(e) => setCost(e.target.value)} className={input} />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-[1.5] h-11 rounded-xl bg-[#111111] border border-[#C9B79C]/60 text-[#C9B79C] text-xs font-black hover:bg-[#262626] shadow-md cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Update Price'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
