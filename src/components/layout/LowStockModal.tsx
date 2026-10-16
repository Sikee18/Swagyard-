'use client';

import React from 'react';
import { AlertTriangle, Volume2, BellOff, X } from 'lucide-react';

export interface LowStockItem {
  id: number;
  name: string;
  stock: number;
  limit: number;
}

interface LowStockModalProps {
  isOpen: boolean;
  items: LowStockItem[];
  onSilence: () => void;
  onTestSound: () => void;
}

export function LowStockModal({ isOpen, items, onSilence, onTestSound }: LowStockModalProps) {
  if (!isOpen || items.length === 0) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-[#191919] border-2 border-rose-500/60 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.25)] p-6 relative z-10 text-white">
        {/* Header with pulsing alert badge */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0 text-rose-500 animate-pulse">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-wide text-rose-400">
              Low Stock Alarm Active
            </h2>
            <p className="text-xs text-white/80 font-medium mt-0.5">
              {items.length === 1 ? '1 item requires' : `${items.length} items require`} immediate restocking
            </p>
          </div>
        </div>

        <p className="text-xs text-white/60 mb-4">
          The audible alarm and visual alert will sound until acknowledged.
        </p>

        {/* Low Stock Items List */}
        <div className="bg-[#111111] border border-white/10 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2 mb-5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#C9B79C] mb-1">
            Item Limits Active
          </div>
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5"
            >
              <div>
                <div className="text-xs font-bold text-white">{item.name}</div>
                <div className="text-[10px] text-white/40">Alert limit: {item.limit}</div>
              </div>
              <div className="text-right">
                <span className="inline-block px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-xs font-black">
                  {item.stock} in Stock
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onTestSound}
            className="flex-1 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-white/10"
          >
            <Volume2 size={15} />
            <span>Test Sound</span>
          </button>
          <button
            type="button"
            onClick={onSilence}
            className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-rose-900/40"
          >
            <BellOff size={15} />
            <span>Silence Alarm & Acknowledge</span>
          </button>
        </div>

        <div className="text-center mt-3 text-[10px] text-white/40">
          Silences sound until next new low-stock item
        </div>
      </div>
    </div>
  );
}
