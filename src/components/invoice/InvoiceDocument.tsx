import React from 'react';
import {
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  QrCode,
  Split,
} from 'lucide-react';

export interface InvoiceStore {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
}

export const STORE_INFO: InvoiceStore = {
  name: (process.env.NEXT_PUBLIC_APP_NAME || 'Swagyard').toUpperCase(),
  tagline: 'Retail POS & Billing System',
  address: process.env.NEXT_PUBLIC_STORE_ADDRESS || '',
  phone: process.env.NEXT_PUBLIC_STORE_PHONE || '',
  email: process.env.NEXT_PUBLIC_STORE_EMAIL || '',
};

/** The printable tax invoice card, shared by the public invoice page and the Order History preview. */
export function InvoiceDocument({ store, order }: { store: InvoiceStore; order: any }) {
  return (
    <div
      id="digital-invoice-card"
      className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-black/10 p-6 sm:p-8"
    >
      {/* Header section */}
      <div className="border-b border-black/10 pb-6 mb-6">
        {/* TAX INVOICE label */}
        <div className="text-center mb-4">
          <span className="text-[10px] font-black tracking-[0.3em] text-black/40 uppercase border border-black/15 px-3 py-1 rounded-full">
            TAX INVOICE
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-2xl tracking-widest text-[#111111] uppercase">
              {store.name}
            </h1>
            <p className="text-xs text-black/60 font-medium tracking-wide mt-0.5">
              {store.tagline}
            </p>
            <div className="mt-3 space-y-0.5 text-xs text-black/70">
              <div className="flex items-center gap-1.5">
                <MapPin size={13} className="text-[#7A6A4F] shrink-0" />
                <span>{store.address}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone size={13} className="text-[#7A6A4F] shrink-0" />
                <span>{store.phone}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Mail size={13} className="text-[#7A6A4F] shrink-0" />
                <span>{store.email}</span>
              </div>
            </div>
          </div>

          {/* Status and Invoice Meta */}
          <div className="sm:text-right">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-800 text-xs font-black border border-emerald-500/20 mb-3">
              <CheckCircle2 size={13} />
              <span>PAID & VERIFIED</span>
            </div>
            <div className="space-y-1 text-xs">
              <div>
                <span className="text-black/50">Invoice No:</span>{' '}
                <span className="font-mono font-black text-black">#{order.invoiceNo}</span>
              </div>
              <div className="flex items-center sm:justify-end gap-1 text-black/60">
                <Clock size={12} />
                <span>{new Date(order.createdAt).toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-black/50">Cashier:</span>{' '}
                <span className="font-semibold">{order.cashierName || 'Admin'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Meta */}
      <div className="bg-[#FAF7F2] border border-black/5 rounded-2xl p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-black/50 block text-[10px] font-bold uppercase tracking-wider mb-0.5">
            Billed To
          </span>
          <p className="font-black text-sm text-black">
            {order.customerName || 'Valued Walk-in Customer'}
          </p>
        </div>
        <div>
          <span className="text-black/50 block text-[10px] font-bold uppercase tracking-wider mb-0.5">
            Customer Phone
          </span>
          <p className="font-mono font-bold text-black">
            {order.phone ? `+91 ${order.phone}` : 'Not registered'}
          </p>
        </div>
      </div>

      {/* Itemized Table */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-black/10 text-black/60 uppercase font-black tracking-wider text-[10px]">
              <th className="py-2.5 text-left">Item Description</th>
              <th className="py-2.5 text-center">Qty</th>
              <th className="py-2.5 text-right">Price</th>
              <th className="py-2.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {order.items?.map((item: any, idx: number) => (
              <tr key={idx} className="hover:bg-black/[0.02]">
                <td className="py-3">
                  <div className="font-bold text-black">{item.productName}</div>
                  {item.isManual && (
                    <span className="text-[10px] text-amber-700 bg-amber-500/10 px-1.5 py-0.2 rounded font-semibold">
                      Custom Item
                    </span>
                  )}
                </td>
                <td className="py-3 text-center font-mono font-semibold">{item.quantity}</td>
                <td className="py-3 text-right font-mono text-black/70">
                  ₹{(item.unitPrice / 100).toFixed(2)}
                </td>
                <td className="py-3 text-right font-mono font-bold text-black">
                  ₹{(item.lineTotal / 100).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Financial Breakdown Section */}
      <div className="border-t border-black/10 pt-4 flex flex-col sm:flex-row justify-between gap-6">
        {/* Payment method note */}
        <div className="space-y-2 max-w-xs text-xs">
          <span className="text-black/50 block text-[10px] font-bold uppercase tracking-wider">
            Payment Breakdown
          </span>
          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 rounded-lg bg-black/5 border border-black/10 font-bold flex items-center gap-1.5">
              {order.paymentMode === 'cash' && <Banknote size={14} />}
              {order.paymentMode === 'card' && <CreditCard size={14} />}
              {order.paymentMode === 'qr' && <QrCode size={14} />}
              {order.paymentMode === 'split' && <Split size={14} />}
              <span className="uppercase text-[11px]">{order.paymentMode}</span>
            </div>
          </div>

          {order.paymentMode === 'split' && order.splitDetails && (
            <div className="p-2.5 rounded-xl bg-black/[0.03] border border-black/5 space-y-1 font-mono text-[11px] text-black/80">
              {order.splitDetails.cashInPaise > 0 && (
                <div className="flex justify-between">
                  <span>Cash:</span>
                  <span>₹{(order.splitDetails.cashInPaise / 100).toFixed(2)}</span>
                </div>
              )}
              {order.splitDetails.cardInPaise > 0 && (
                <div className="flex justify-between">
                  <span>Card:</span>
                  <span>₹{(order.splitDetails.cardInPaise / 100).toFixed(2)}</span>
                </div>
              )}
              {order.splitDetails.qrInPaise > 0 && (
                <div className="flex justify-between">
                  <span>QR/UPI:</span>
                  <span>₹{(order.splitDetails.qrInPaise / 100).toFixed(2)}</span>
                </div>
              )}
              {order.splitDetails.otherInPaise > 0 && (
                <div className="flex justify-between">
                  <span>Other:</span>
                  <span>₹{(order.splitDetails.otherInPaise / 100).toFixed(2)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Totals column */}
        <div className="w-full sm:w-64 space-y-2 text-xs">
          <div className="flex justify-between text-black/60">
            <span>Subtotal:</span>
            <span className="font-mono">₹{(order.subtotalInPaise / 100).toFixed(2)}</span>
          </div>

          {order.couponDiscountPaise > 0 && (
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Coupon Discount ({order.couponCode || 'PROMO'}):</span>
              <span className="font-mono">-₹{(order.couponDiscountPaise / 100).toFixed(2)}</span>
            </div>
          )}

          {order.manualDiscountPaise > 0 && (
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Manual Discount:</span>
              <span className="font-mono">-₹{(order.manualDiscountPaise / 100).toFixed(2)}</span>
            </div>
          )}

          {order.totalGstPaise > 0 && (
            <>
              <div className="flex justify-between text-black/60">
                <span>CGST (2.5%):</span>
                <span className="font-mono">₹{((order.totalGstPaise / 2) / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-black/60">
                <span>SGST (2.5%):</span>
                <span className="font-mono">₹{((order.totalGstPaise / 2) / 100).toFixed(2)}</span>
              </div>
            </>
          )}

          <div className="flex justify-between text-base font-black text-black pt-2 border-t border-black/15">
            <span>Grand Total:</span>
            <span className="font-mono text-lg">₹{(order.totalInPaise / 100).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div className="mt-8 pt-6 border-t border-dashed border-black/15 text-center text-[11px] text-black/50">
        <p className="font-bold text-black/70 mb-1">Thank you for choosing Swagyard!</p>
        <p>Please preserve this digital tax invoice for warranty & exchanges within 7 days.</p>
      </div>
    </div>
  );
}
