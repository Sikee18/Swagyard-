'use client';

import React from 'react';

export interface ReceiptOrder {
  invoiceNo: string;
  customerName?: string | null;
  phone?: string | null;
  createdAt: string;
  cashierName?: string | null;
  subtotalInPaise: number;
  couponCode?: string | null;
  couponDiscountPaise?: number;
  manualDiscountPaise?: number;
  totalGstPaise?: number;
  gstEnabled?: boolean;
  deliveryChargePaise?: number;
  totalInPaise: number;
  paymentMode: string;
  splitDetails?: any;
  items: {
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
}

export function ThermalReceipt({ order }: { order: ReceiptOrder }) {
  if (!order) return null;

  return (
    <div
      id="thermal-receipt-container"
      className="max-w-[80mm] w-full bg-white text-black p-4 font-mono text-xs leading-tight mx-auto select-none border border-black/10 rounded-lg shadow-sm"
    >
      {/* Brand Header */}
      <div className="text-center mb-3">
        <h1 className="font-display font-black text-base uppercase tracking-widest text-black">
          SWAGYARD
        </h1>
        <div className="text-[10px] text-gray-700 mt-0.5">
          174, Brazzer Street, Opp. Apollo Medical
        </div>
        <div className="text-[10px] text-gray-700">Ammoor, Ranipet - 632501</div>
        <div className="text-[10px] text-gray-800 font-bold mt-0.5">Ph: +91 63853 68479</div>
        <div className="text-[9px] text-gray-600">
          swagyard.retail@gmail.com | @swagyard.retail
        </div>
      </div>

      {/* Invoice Meta */}
      <div className="border-t border-b border-dashed border-gray-400 py-1.5 my-2 text-[10px]">
        <div className="flex justify-between">
          <span data-testid="receipt-invoice-no" className="font-bold">#{order.invoiceNo}</span>
          <span>{new Date(order.createdAt).toLocaleDateString('en-IN')}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Cashier: {order.cashierName || 'Admin'}</span>
          <span>
            {new Date(order.createdAt).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        {order.customerName && (
          <div className="mt-1 font-bold">Customer: {order.customerName}</div>
        )}
        {order.phone && <div>Tel: {order.phone}</div>}
      </div>

      {/* Items Table */}
      <table className="w-full text-left my-2 text-[10px]">
        <thead>
          <tr className="border-b border-gray-300">
            <th className="py-1">Item</th>
            <th className="py-1 text-center">Qty</th>
            <th className="py-1 text-right">Price</th>
            <th className="py-1 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dotted divide-gray-200">
          {order.items.map((it, idx) => (
            <tr key={idx} className="py-1">
              <td className="py-1 pr-1 font-medium max-w-[35mm] truncate">{it.productName}</td>
              <td className="py-1 text-center">{it.quantity}</td>
              <td className="py-1 text-right">₹{(it.unitPrice / 100).toFixed(2)}</td>
              <td className="py-1 text-right font-bold">₹{(it.lineTotal / 100).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Financial Summary */}
      <div className="border-t border-dashed border-gray-400 pt-1.5 text-[10px] space-y-0.5">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>₹{(order.subtotalInPaise / 100).toFixed(2)}</span>
        </div>

        {order.couponDiscountPaise ? (
          <div className="flex justify-between text-emerald-800">
            <span>Coupon ({order.couponCode || 'PROMO'})</span>
            <span>-₹{(order.couponDiscountPaise / 100).toFixed(2)}</span>
          </div>
        ) : null}

        {order.manualDiscountPaise ? (
          <div className="flex justify-between text-emerald-800">
            <span>Manual Discount</span>
            <span>-₹{(order.manualDiscountPaise / 100).toFixed(2)}</span>
          </div>
        ) : null}

        {order.totalGstPaise ? (
          <div className="flex justify-between text-gray-700">
            <span>GST (CGST 2.5% + SGST 2.5%)</span>
            <span>+₹{(order.totalGstPaise / 100).toFixed(2)}</span>
          </div>
        ) : null}

        <div className="flex justify-between font-black text-xs pt-1 border-t border-black text-black">
          <span>GRAND TOTAL</span>
          <span>₹{(order.totalInPaise / 100).toFixed(2)}</span>
        </div>
      </div>

      {/* Payment Tender */}
      <div className="border-t border-dashed border-gray-400 mt-2 pt-1 text-[10px] text-gray-700">
        <div className="flex justify-between">
          <span className="font-bold">Payment Method:</span>
          <span className="uppercase font-bold">{order.paymentMode}</span>
        </div>
        {order.paymentMode === 'split' && order.splitDetails ? (
          <div className="pl-2 mt-0.5 text-[9px] text-gray-600 space-y-0.5">
            {order.splitDetails.cashInPaise ? (
              <div>Cash: ₹{(order.splitDetails.cashInPaise / 100).toFixed(2)}</div>
            ) : null}
            {order.splitDetails.qrInPaise ? (
              <div>QR/UPI: ₹{(order.splitDetails.qrInPaise / 100).toFixed(2)}</div>
            ) : null}
            {order.splitDetails.cardInPaise ? (
              <div>Card: ₹{(order.splitDetails.cardInPaise / 100).toFixed(2)}</div>
            ) : null}
            {order.splitDetails.otherInPaise ? (
              <div>Other: ₹{(order.splitDetails.otherInPaise / 100).toFixed(2)}</div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className="text-center mt-3 pt-2 border-t border-dotted border-gray-400 text-[9px] text-gray-600">
        <div className="font-bold text-black">Thank you for shopping with us!</div>
        <div>Please keep this receipt for exchanges within 7 days.</div>
      </div>
    </div>
  );
}
