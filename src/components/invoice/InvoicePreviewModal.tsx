'use client';

import React, { useEffect } from 'react';
import { Download, Printer, X } from 'lucide-react';
import { generatePdfInvoice } from '@/lib/pdf-invoice';
import { printOrderReceipt } from '@/lib/thermal-print';
import { InvoiceDocument, STORE_INFO } from './InvoiceDocument';

/** Order shape as returned by /api/orders. */
export interface PreviewOrder {
  id: string;
  invoiceNo: string;
  customerName: string | null;
  phone: string | null;
  createdAt: string;
  cashierName?: string | null;
  subtotalInPaise: number;
  couponCode: string | null;
  couponDiscountPaise: number;
  manualDiscountPaise: number;
  totalGstPaise: number;
  gstEnabled?: boolean;
  deliveryChargePaise: number;
  totalInPaise: number;
  paymentMode: string;
  splitDetails?: any;
  items: { productName: string; quantity: number; unitPrice: number; lineTotal: number; isManual?: boolean }[];
}

export function downloadOrderPdf(o: PreviewOrder) {
  generatePdfInvoice({
    invoiceNo: o.invoiceNo,
    customerName: o.customerName,
    phone: o.phone,
    createdAt: o.createdAt,
    cashierName: o.cashierName || 'Admin',
    subtotalInPaise: o.subtotalInPaise,
    couponCode: o.couponCode,
    couponDiscountPaise: o.couponDiscountPaise,
    manualDiscountPaise: o.manualDiscountPaise,
    totalGstPaise: o.totalGstPaise,
    gstEnabled: o.gstEnabled,
    deliveryChargePaise: o.deliveryChargePaise,
    totalInPaise: o.totalInPaise,
    paymentMode: o.paymentMode,
    splitDetails: o.splitDetails,
    items: o.items || [],
  });
}

export function InvoicePreviewModal({ order, onClose }: { order: PreviewOrder; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Invoice ${order.invoiceNo}`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-[#FAF7F2] shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-[#DDD2BE]/60 bg-white px-4 py-3 sm:px-6">
          <div>
            <h2 className="text-base font-black text-[#111111]">Invoice Preview</h2>
            <p className="text-xs font-semibold text-[#6B7280]">{order.invoiceNo}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => printOrderReceipt(order)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#DDD2BE]/70 px-3 text-xs font-black text-[#111111] hover:bg-[#FAF7F2]"
            >
              <Printer size={15} /> Print
            </button>
            <button
              type="button"
              onClick={() => downloadOrderPdf(order)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#111111] px-3 text-xs font-black text-white hover:bg-[#C9B79C]"
            >
              <Download size={15} /> Download
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close invoice preview"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#6B7280] hover:bg-[#FAF7F2] hover:text-[#111111]"
            >
              <X size={19} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 sm:p-5">
          <div className="mx-auto max-w-3xl">
            <InvoiceDocument store={STORE_INFO} order={order} />
          </div>
        </div>
      </div>
    </div>
  );
}
