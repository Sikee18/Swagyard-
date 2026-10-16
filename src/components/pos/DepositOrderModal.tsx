'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  priceInPaise: number;
  quantity: number;
}

interface DepositOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  totalInPaise: number;
  customerName: string;
  customerPhone: string;
  onSuccess: (orderRef: string) => void;
}

export function DepositOrderModal({
  isOpen,
  onClose,
  cart,
  totalInPaise,
  customerName,
  customerPhone,
  onSuccess,
}: DepositOrderModalProps) {
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [expectedDelivery, setExpectedDelivery] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [split, setSplit] = useState({ cash: '', qr: '' });
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set default deposit to 50% or full amount when opened
  useEffect(() => {
    if (isOpen) {
      const half = Math.round((totalInPaise / 2) / 100);
      setDepositAmount(half.toString());
      // Default expected delivery date: 3 days from now
      const d = new Date();
      d.setDate(d.getDate() + 3);
      setExpectedDelivery(d.toISOString().split('T')[0]);
      setError(null);
    }
  }, [isOpen, totalInPaise]);

  if (!isOpen) return null;

  const depositPaise = Math.round(Number(depositAmount || 0) * 100);
  const remainingPaise = Math.max(0, totalInPaise - depositPaise);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      setError('Please provide Customer Name and WhatsApp Number before saving deposit order.');
      return;
    }
    if (depositPaise <= 0) {
      setError('Deposit amount must be greater than 0.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const productName = cart.map((it) => `${it.quantity}× ${it.name}`).join(', ');

      const payload = {
        customerName: customerName.trim(),
        phone: customerPhone.trim(),
        productName: productName || 'Retail Order',
        category: 'Deposit / Advance',
        description: `Items: ${productName}. Delivery to: ${deliveryAddress || 'Store Pickup'}`,
        totalAmountPaise: totalInPaise,
        depositAmountPaise: depositPaise,
        depositPaymentMode: paymentMethod.toLowerCase(),
        splitDetails: paymentMethod === 'Split' ? split : undefined,
        address: deliveryAddress.trim() || null,
        expectedDeliveryDate: expectedDelivery || null,
        remarks: remarks.trim() || null,
      };

      const res = await fetch('/api/advance-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save deposit order');
      }

      onSuccess(data.depositId || 'ADV-ORDER');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error creating deposit order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-black/10 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 pt-5 pb-3 border-b border-black/10 flex items-start justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-black/40">
              ADVANCE PAYMENT ONLY
            </span>
            <h2 className="text-lg font-black text-black">Save as Deposit Order</h2>
            <p className="text-xs font-bold text-amber-700 mt-0.5">
              No sale or tax invoice will be created now.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 text-black/60 hover:text-black flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Order Total & Items Summary */}
          <div className="bg-[#FAF7F2] border border-black/10 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between items-center text-sm font-black text-black">
              <span>Order total</span>
              <span className="font-mono">₹{(totalInPaise / 100).toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-black/10 space-y-1">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between text-xs text-black/70">
                  <span className="truncate pr-2">
                    {item.quantity}× {item.name}
                  </span>
                  <span className="font-mono font-bold shrink-0">
                    ₹{((item.priceInPaise * item.quantity) / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Deposit Received & Remaining Balance */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-black/60 mb-1">
                DEPOSIT RECEIVED *
              </label>
              <input
                type="number"
                step="1"
                min="1"
                max={(totalInPaise / 100).toString()}
                required
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-black/15 rounded-xl text-xs font-mono font-bold outline-none focus:border-black"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-black/60 mb-1">
                REMAINING BALANCE
              </label>
              <div className="w-full px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700 font-mono font-black rounded-xl text-xs flex items-center">
                ₹{(remainingPaise / 100).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Expected Delivery & Payment Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-black/60 mb-1">
                EXPECTED DELIVERY *
              </label>
              <input
                type="date"
                required
                value={expectedDelivery}
                onChange={(e) => setExpectedDelivery(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-black/15 rounded-xl text-xs outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-black/60 mb-1">
                PAYMENT METHOD *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-black/15 rounded-xl text-xs outline-none focus:border-black"
              >
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="QR">QR / UPI</option>
                <option value="Split">Split</option>
              </select>
              {paymentMethod === 'Split' && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(['cash', 'qr'] as const).map((key) => (
                    <label key={key} className="block">
                      <span className="block text-[10px] font-black uppercase tracking-wider text-black/60 mb-0.5">
                        {key === 'cash' ? 'Cash' : 'QR'} (₹)
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={split[key]}
                        onChange={(e) => setSplit((s) => ({ ...s, [key]: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-black/15 rounded-xl text-xs outline-none focus:border-black"
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Delivery Address */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-black/60 mb-1">
              DELIVERY ADDRESS
            </label>
            <textarea
              rows={2}
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Delivery address or store pickup instructions..."
              className="w-full px-3 py-2 bg-white border border-black/15 rounded-xl text-xs outline-none focus:border-black resize-none"
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-black/60 mb-1">
              REMARKS
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Internal remarks, customer sizing notes..."
              className="w-full px-3 py-2 bg-white border border-black/15 rounded-xl text-xs outline-none focus:border-black resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-black/20 hover:bg-black/5 text-black font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-[#1e293b] hover:bg-[#0f172a] text-white font-black text-xs shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Confirm Deposit Order</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
