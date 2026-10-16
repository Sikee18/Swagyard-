'use client';

import React, { useState } from 'react';
import { X, PlusCircle } from 'lucide-react';

interface CustomItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: { name: string; priceInPaise: number; quantity: number }) => void;
}

export function CustomItemModal({ isOpen, onClose, onAdd }: CustomItemModalProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Item Name is required');
      return;
    }
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setError('Valid price is required');
      return;
    }

    onAdd({
      name: name.trim(),
      priceInPaise: Math.round(numPrice * 100),
      quantity: Math.max(1, Number(quantity) || 1),
    });

    setName('');
    setPrice('');
    setQuantity(1);
    setError(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in"
    >
      <div className="w-full max-w-sm bg-[#191919] border border-[#C9B79C]/40 rounded-2xl shadow-2xl p-6 text-white">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <PlusCircle size={18} className="text-[#C9B79C]" />
            <h3 className="text-sm font-black text-white">Add Custom / Ad-Hoc Item</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-white/80 mb-1">Item Name *</label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alteration Service / Gift Wrap"
              className="w-full bg-[#111111] border border-white/20 rounded-xl p-2.5 text-white placeholder-white/30 outline-none focus:border-[#C9B79C]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-white/80 mb-1">Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#111111] border border-white/20 rounded-xl p-2.5 text-white placeholder-white/30 outline-none focus:border-[#C9B79C]"
              />
            </div>
            <div>
              <label className="block font-bold text-white/80 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full bg-[#111111] border border-white/20 rounded-xl p-2.5 text-white outline-none focus:border-[#C9B79C]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-white/70 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#C9B79C] hover:bg-[#A8946F] text-[#111111] font-black transition-all shadow-md cursor-pointer"
            >
              Add to Bill
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
