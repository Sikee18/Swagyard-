'use client';

import React, { useState, useEffect } from 'react';
import { X, Split, Banknote, QrCode, CreditCard, Globe, CheckCircle2, AlertCircle } from 'lucide-react';
import { validateSplitPayment, SplitDetailsInput } from '@/lib/business-rules';

interface SplitPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalInPaise: number;
  initialSplit?: SplitDetailsInput;
  onConfirm: (split: SplitDetailsInput) => void;
}

export function SplitPaymentModal({
  isOpen,
  onClose,
  totalInPaise,
  initialSplit,
  onConfirm,
}: SplitPaymentModalProps) {
  const [cash, setCash] = useState(
    initialSplit?.cashInPaise !== undefined ? (initialSplit.cashInPaise / 100).toString() : ''
  );
  const [card, setCard] = useState(
    initialSplit?.cardInPaise !== undefined ? (initialSplit.cardInPaise / 100).toString() : ''
  );
  const [qr, setQr] = useState(
    initialSplit?.qrInPaise !== undefined ? (initialSplit.qrInPaise / 100).toString() : ''
  );
  const [other, setOther] = useState(
    initialSplit?.otherInPaise !== undefined ? (initialSplit.otherInPaise / 100).toString() : ''
  );

  useEffect(() => {
    if (isOpen && !cash && !card && !qr && !other) {
      // Default initial split with cash matching total
      setCash((totalInPaise / 100).toString());
    }
  }, [isOpen, totalInPaise]);

  if (!isOpen) return null;

  const cashPaise = Math.round(Number(cash || 0) * 100);
  const cardPaise = Math.round(Number(card || 0) * 100);
  const qrPaise = Math.round(Number(qr || 0) * 100);
  const otherPaise = Math.round(Number(other || 0) * 100);

  const check = validateSplitPayment(totalInPaise, {
    cashInPaise: cashPaise,
    cardInPaise: cardPaise,
    qrInPaise: qrPaise,
    otherInPaise: otherPaise,
  });

  const sumPaise = cashPaise + cardPaise + qrPaise + otherPaise;

  const handleSave = () => {
    if (!check.valid) return;
    onConfirm({
      cashInPaise: cashPaise,
      cardInPaise: cardPaise,
      qrInPaise: qrPaise,
      otherInPaise: otherPaise,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in"
    >
      <div className="w-full max-w-md bg-[#191919] border border-[#C9B79C]/40 rounded-2xl shadow-2xl p-6 text-white">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#C9B79C]/20 text-[#C9B79C] flex items-center justify-center border border-[#C9B79C]/30">
              <Split size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Split Tender Calculator</h3>
              <p className="text-xs text-white/60">Divide bill across multiple tender modes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        {/* Bill Total Target Display */}
        <div className="bg-[#111111] border border-white/10 rounded-xl p-3 mb-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block">
              Required Bill Total
            </span>
            <span className="text-xl font-black text-white">₹{(totalInPaise / 100).toFixed(2)}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block">
              Sum of Tenders
            </span>
            <span
              className={`text-xl font-black ${
                check.valid ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              ₹{(sumPaise / 100).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Status indicator */}
        <div className="mb-4">
          {check.valid ? (
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2 text-emerald-400 text-xs font-bold">
              <CheckCircle2 size={16} />
              <span>Matched ✓ (Split tenders equal total bill)</span>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2 text-rose-400 text-xs font-bold">
              <AlertCircle size={16} />
              <span>{check.error}</span>
            </div>
          )}
        </div>

        {/* Breakdown Input Fields */}
        <div className="space-y-3 text-xs">
          <div>
            <label className="flex items-center gap-1.5 font-bold text-white/80 mb-1">
              <Banknote size={14} className="text-emerald-400" />
              <span>Cash Tender (₹)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              placeholder="0.00"
              className="w-full bg-[#111111] border border-white/20 rounded-xl p-2.5 text-white outline-none focus:border-[#C9B79C]"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 font-bold text-white/80 mb-1">
              <QrCode size={14} className="text-cyan-400" />
              <span>QR / UPI Tender (₹)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={qr}
              onChange={(e) => setQr(e.target.value)}
              placeholder="0.00"
              className="w-full bg-[#111111] border border-white/20 rounded-xl p-2.5 text-white outline-none focus:border-[#C9B79C]"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 font-bold text-white/80 mb-1">
              <CreditCard size={14} className="text-amber-400" />
              <span>Card Tender (₹)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={card}
              onChange={(e) => setCard(e.target.value)}
              placeholder="0.00"
              className="w-full bg-[#111111] border border-white/20 rounded-xl p-2.5 text-white outline-none focus:border-[#C9B79C]"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 font-bold text-white/80 mb-1">
              <Globe size={14} className="text-purple-400" />
              <span>Other / Online Tender (₹)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={other}
              onChange={(e) => setOther(e.target.value)}
              placeholder="0.00"
              className="w-full bg-[#111111] border border-white/20 rounded-xl p-2.5 text-white outline-none focus:border-[#C9B79C]"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-white/70 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!check.valid}
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-[#C9B79C] hover:bg-[#A8946F] text-[#111111] font-black transition-all shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Apply Split Tender
          </button>
        </div>
      </div>
    </div>
  );
}
