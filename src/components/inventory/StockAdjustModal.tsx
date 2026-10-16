'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, CircleAlert, CircleCheck, CircleMinus, CirclePlus, Package, SlidersHorizontal, Target, X } from 'lucide-react';
import type { InventorySku } from '@/lib/inventory';

type Mode = 'RESTOCK' | 'REMOVE' | 'CORRECTION';
type RemoveReason = 'DAMAGE' | 'RETURN' | 'CORRECTION';

const STORE_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Swagyard';

function Stepper({
  id,
  value,
  onChange,
  tone,
  max,
}: {
  id: string;
  value: number;
  onChange: (v: number) => void;
  tone: 'emerald' | 'rose' | 'amber';
  max?: number;
}) {
  const ring = tone === 'emerald' ? 'border-emerald-300 focus:border-emerald-600' : tone === 'rose' ? 'border-rose-300 focus:border-rose-600' : 'border-[#C9B79C] focus:border-[#7A6A4F]';
  const btn = tone === 'emerald' ? 'border-emerald-300 text-emerald-800 hover:bg-emerald-100' : tone === 'rose' ? 'border-rose-300 text-rose-800 hover:bg-rose-100' : 'border-[#C9B79C] text-amber-950 hover:bg-amber-100';
  const clamp = (v: number) => Math.max(0, max !== undefined ? Math.min(max, v) : v);
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onChange(clamp(value - 1))} className={`w-10 h-10 rounded-xl border bg-white font-black text-lg cursor-pointer ${btn}`}>
        -
      </button>
      <input
        id={id}
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(clamp(Math.floor(Number(e.target.value) || 0)))}
        className={`flex-1 h-10 rounded-xl border-2 bg-white text-center text-xl font-black text-gray-900 outline-none ${ring}`}
      />
      <button type="button" onClick={() => onChange(clamp(value + 1))} className={`w-10 h-10 rounded-xl border bg-white font-black text-lg cursor-pointer ${btn}`}>
        +
      </button>
    </div>
  );
}

export function StockAdjustModal({ item, onClose, onSuccess }: { item: InventorySku; onClose: () => void; onSuccess: () => void }) {
  const [mode, setMode] = useState<Mode>('RESTOCK');
  const [addQty, setAddQty] = useState(0);
  const [removeQty, setRemoveQty] = useState(0);
  const [removeReason, setRemoveReason] = useState<RemoveReason>('DAMAGE');
  const [counted, setCounted] = useState(item.stock);
  const [note, setNote] = useState('');
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

  const current = item.stock;
  let next = current;
  let delta = 0;
  let reason: string = 'RESTOCK';
  if (mode === 'RESTOCK') {
    next = current + addQty;
    delta = addQty;
  } else if (mode === 'REMOVE') {
    next = Math.max(0, current - removeQty);
    delta = -Math.min(current, removeQty);
    reason = removeReason;
  } else {
    next = Math.max(0, counted);
    delta = next - current;
    reason = 'CORRECTION';
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'RESTOCK' && addQty <= 0) return setError('Please enter a valid quantity to add (minimum 1 unit)');
    if (mode === 'REMOVE') {
      if (removeQty <= 0) return setError('Please enter a valid quantity to remove (minimum 1 unit)');
      if (current <= 0) return setError('Current stock is 0. Cannot remove units from an empty stock.');
      if (removeQty > current) return setError(`Cannot remove ${removeQty} units. Maximum available stock to remove is ${current}.`);
    }
    if (mode === 'CORRECTION' && counted < 0) return setError('Reconciled stock quantity cannot be negative.');
    if (delta === 0) return setError('No stock change detected. Please adjust the quantity.');
    setSaving(true);
    try {
      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: item.productId, variantId: item.variantId, newQuantity: next, reason, note: note.trim() || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to adjust stock');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adjust stock');
    } finally {
      setSaving(false);
    }
  };

  const modeBtn = (m: Mode, on: string) =>
    `flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
      mode === m ? on : 'bg-[#FBFAF6] border-gray-200 text-gray-700 hover:bg-gray-100'
    }`;
  const reasonBtn = (r: RemoveReason) =>
    `py-1.5 px-1.5 rounded-lg text-[11px] font-black border transition-all ${
      removeReason === r ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-white text-rose-900 border-rose-200 hover:bg-rose-100'
    }`;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col justify-end sm:justify-center items-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 overflow-hidden">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[100dvh] h-full sm:h-auto sm:max-h-[92vh] border-0 sm:border border-[#DDD2BE] shadow-2xl overflow-hidden flex flex-col">
        <div className="shrink-0 bg-[#111111] px-4 py-3 sm:px-5 sm:py-3.5 border-b border-[#C9B79C]/30 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#262626] border border-[#C9B79C] flex items-center justify-center text-[#C9B79C]">
              <SlidersHorizontal size={16} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-wide text-white leading-tight">Adjust Inventory Stock ({STORE_NAME})</h2>
              <p className="text-[11px] text-[#7A6A4F] font-semibold leading-tight">Restock, remove stock, or reconcile physical count</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-3.5 min-h-0 overscroll-contain">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2">
                <CircleAlert size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="bg-[#FBFAF6] border border-[#DDD2BE] rounded-2xl p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-wider text-[#7A6A4F] flex items-center gap-1">
                  <Package size={12} /> Target SKU / Product
                </div>
                <div className="text-sm font-black text-gray-900 truncate">{item.name}</div>
                {item.variantName && (
                  <span className="mt-1 inline-block px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-bold">
                    Variant: {item.variantName}
                  </span>
                )}
                {item.barcode && (
                  <div className="mt-1 text-[11px] text-gray-500">
                    <span className="font-bold">Barcode:</span> <span className="font-mono">{item.barcode}</span>
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] font-black uppercase tracking-wider text-gray-500">Current Stock</div>
                <div className="text-lg font-black text-gray-900">
                  {current} <span className="text-xs font-bold text-gray-500">units</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-gray-700 mb-1.5">
                Select Adjustment Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => setMode('RESTOCK')} className={modeBtn('RESTOCK', 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm ring-2 ring-emerald-500/20')}>
                  <CirclePlus size={17} />
                  <span className="text-xs font-black mt-0.5">Restock</span>
                  <span className="text-[10px] font-semibold opacity-80">+ Add Units</span>
                </button>
                <button type="button" onClick={() => setMode('REMOVE')} className={modeBtn('REMOVE', 'bg-rose-50 border-rose-500 text-rose-900 shadow-sm ring-2 ring-rose-500/20')}>
                  <CircleMinus size={17} />
                  <span className="text-xs font-black mt-0.5">Remove Stock</span>
                  <span className="text-[10px] font-semibold opacity-80">- Deduct Units</span>
                </button>
                <button type="button" onClick={() => setMode('CORRECTION')} className={modeBtn('CORRECTION', 'bg-amber-50 border-[#C9B79C] text-amber-950 shadow-sm ring-2 ring-[#C9B79C]/30')}>
                  <Target size={17} />
                  <span className="text-xs font-black mt-0.5">Reconciliation</span>
                  <span className="text-[10px] font-semibold opacity-80">Set Exact Count</span>
                </button>
              </div>
            </div>

            {mode === 'RESTOCK' && (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 space-y-2">
                <label htmlFor="adjust-add-quantity" className="block text-[11px] font-black uppercase tracking-wider text-emerald-900 mb-1">
                  Quantity to Add (Restock) <span className="text-red-500">*</span>
                </label>
                <Stepper id="adjust-add-quantity" value={addQty} onChange={setAddQty} tone="emerald" />
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-emerald-900">Quick Add:</span>
                  {[1, 5, 10, 25, 50, 100].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAddQty(n)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                        addQty === n ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      +{n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'REMOVE' && (
              <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-3 space-y-2.5">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-rose-900 mb-1">
                    Removal Reason <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button type="button" onClick={() => setRemoveReason('DAMAGE')} className={reasonBtn('DAMAGE')}>
                      Damaged / Defect
                    </button>
                    <button type="button" onClick={() => setRemoveReason('RETURN')} className={reasonBtn('RETURN')}>
                      Vendor Return
                    </button>
                    <button type="button" onClick={() => setRemoveReason('CORRECTION')} className={reasonBtn('CORRECTION')}>
                      Lost / Shrinkage
                    </button>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="adjust-remove-quantity" className="block text-[11px] font-black uppercase tracking-wider text-rose-900">
                      Quantity to Remove <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] font-bold text-rose-700">Max: {current} units</span>
                  </div>
                  <Stepper id="adjust-remove-quantity" value={removeQty} onChange={setRemoveQty} tone="rose" max={current} />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-rose-900">Quick Remove:</span>
                  {[1, 2, 5, 10]
                    .filter((n) => n <= current)
                    .map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRemoveQty(n)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                          removeQty === n ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-rose-900 border-rose-200 hover:bg-rose-100'
                        }`}
                      >
                        -{n}
                      </button>
                    ))}
                  {current > 0 && (
                    <button
                      type="button"
                      onClick={() => setRemoveQty(current)}
                      className="px-2 py-0.5 rounded-md text-[11px] font-bold border bg-white text-rose-900 border-rose-200 hover:bg-rose-100 cursor-pointer"
                    >
                      Clear All ({current})
                    </button>
                  )}
                </div>
              </div>
            )}

            {mode === 'CORRECTION' && (
              <div className="bg-amber-50/70 border border-[#C9B79C] rounded-2xl p-3 space-y-2">
                <label htmlFor="adjust-corrected-quantity" className="block text-[11px] font-black uppercase tracking-wider text-amber-950 mb-1">
                  Actual Audited Physical Count <span className="text-red-500">*</span>
                </label>
                <Stepper id="adjust-corrected-quantity" value={counted} onChange={setCounted} tone="amber" />
              </div>
            )}

            <div className="flex items-center justify-between gap-2 bg-[#FBFAF6] border border-[#DDD2BE] rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-gray-500">Current:</span>
                <span className="font-black text-gray-900">{current}</span>
                <ArrowRight size={13} className="text-gray-400" />
                <span className="font-bold text-gray-500">New Stock:</span>
                <span className={`text-xs sm:text-sm font-black ${next > current ? 'text-emerald-700' : next < current ? 'text-rose-700' : 'text-gray-700'}`}>{next} units</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                  delta > 0 ? 'bg-emerald-100 text-emerald-800' : delta < 0 ? 'bg-rose-100 text-rose-800' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {delta > 0 ? `+${delta}` : delta}
              </span>
            </div>

            <div>
              <label htmlFor="adjust-note" className="block text-[11px] font-bold text-gray-700 mb-1">
                Adjustment Note / Reason Description (Optional)
              </label>
              <input
                id="adjust-note"
                type="text"
                placeholder={
                  mode === 'RESTOCK'
                    ? 'e.g. Received new stock shipment / batch delivery'
                    : mode === 'REMOVE'
                      ? 'e.g. Broken packaging, water damage, supplier return'
                      : 'e.g. Physical inventory count reconciliation'
                }
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full py-2 px-3 rounded-xl border border-gray-300 bg-white text-xs text-gray-900 outline-none focus:border-[#111111]"
              />
            </div>
          </div>

          <div className="shrink-0 px-4 py-3 sm:px-5 border-t border-gray-200 bg-[#FBFAF6] flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || delta === 0}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-md disabled:opacity-50 cursor-pointer ${
                mode === 'REMOVE' ? 'bg-rose-700 text-white hover:bg-rose-800 border border-rose-800' : 'bg-[#111111] border border-[#C9B79C] text-[#C9B79C] hover:bg-[#262626]'
              }`}
            >
              <CircleCheck size={14} />
              {saving
                ? 'Saving...'
                : mode === 'RESTOCK'
                  ? `Confirm Restock (+${addQty} Units)`
                  : mode === 'REMOVE'
                    ? `Confirm Removal (-${removeQty} Units)`
                    : `Confirm Reconciliation (${next} Units)`}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
