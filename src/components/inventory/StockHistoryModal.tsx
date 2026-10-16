'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDownRight, ArrowUpRight, History, RefreshCw, X } from 'lucide-react';
import { MOVEMENT_BADGE, type InventorySku, type Movement } from '@/lib/inventory';

const STORE_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Swagyard';

export function StockHistoryModal({ item, onClose }: { item: InventorySku; onClose: () => void }) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const qs = new URLSearchParams({ productId: String(item.productId), limit: '50' });
    if (item.variantId) qs.set('variantId', String(item.variantId));
    fetch(`/api/inventory/movements?${qs}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to load stock movements');
        if (alive) setMovements(body.movements);
      })
      .catch((err) => alive && setError(err.message || 'Failed to load stock movements'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [item]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-hidden bg-black/60 flex justify-end">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 h-full w-full max-w-md bg-white shadow-2xl flex flex-col border-l border-[#DDD2BE]">
        <div className="shrink-0 px-5 py-4 bg-[#111111] text-white flex items-center justify-between border-b border-[#C9B79C]/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#262626] border border-[#C9B79C] flex items-center justify-center text-[#C9B79C]">
              <History size={16} />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wide">Stock Audit Ledger</h2>
              <p className="text-[11px] text-[#7A6A4F] font-semibold">{STORE_NAME} Immutable History</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer">
            <X size={15} />
          </button>
        </div>

        <div className="shrink-0 p-4 border-b border-gray-100 bg-[#FBFAF6]">
          <div className="text-[10px] font-black uppercase tracking-wider text-[#7A6A4F]">Target SKU</div>
          <div className="text-sm font-black text-gray-900">{item.name}</div>
          {item.variantName && (
            <div className="mt-1 inline-block text-xs font-bold text-[#111111] bg-[#FAF7F2] px-2 py-0.5 rounded border border-[#DDD2BE]">Variant: {item.variantName}</div>
          )}
          <div className="mt-2 flex items-center justify-between text-xs font-semibold text-gray-700">
            <span>
              Live Stock: <strong>{item.stock} Units</strong>
            </span>
            {item.barcode && (
              <span>
                Barcode: <strong>{item.barcode}</strong>
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-gray-500 text-sm flex flex-col items-center gap-2">
              <RefreshCw size={20} className="animate-spin text-[#7A6A4F]" />
              Loading audit movements...
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">{error}</div>
          ) : movements.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs font-bold">No stock movements recorded yet for this SKU.</div>
          ) : (
            movements.map((m) => {
              const up = m.quantityDelta > 0;
              const badge = MOVEMENT_BADGE[m.movementType];
              return (
                <div key={m.id} className="bg-[#FBFAF6] border border-gray-200 hover:border-[#DDD2BE] rounded-2xl p-3.5 space-y-2 transition-all">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${badge.cls}`}>{m.movementType.replace(/_/g, ' ')}</span>
                    <span className="text-[11px] text-gray-500 font-medium">
                      {new Date(m.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${up ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      </div>
                      <span className={`text-base font-black ${up ? 'text-emerald-700' : 'text-rose-700'}`}>{up ? `+${m.quantityDelta}` : m.quantityDelta}</span>
                    </div>
                    <div className="text-right text-xs font-semibold text-gray-600">
                      <span>{m.quantityBefore}</span> → <strong>{m.quantityAfter}</strong>
                    </div>
                  </div>
                  {(m.note || m.createdByName) && (
                    <div className="text-[11px] text-gray-600 bg-white p-2 rounded-xl border border-gray-100 space-y-0.5">
                      {m.note && <div>{m.note}</div>}
                      {m.createdByName && <div className="text-gray-400">By: {m.createdByName}</div>}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
