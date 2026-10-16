'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Sparkles, Printer, Download, Share2, AlertCircle } from 'lucide-react';
import { generatePdfInvoice } from '@/lib/pdf-invoice';
import { InvoiceDocument } from '@/components/invoice/InvoiceDocument';

export default function PublicInvoicePage() {
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/invoices/${id}`);
        if (!res.ok) {
          setError('Invoice not found or expired.');
          return;
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || 'Error loading invoice');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111111] flex flex-col items-center justify-center p-4 text-white">
        <div className="w-8 h-8 border-3 border-[#C9B79C] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-[#C9B79C] tracking-wide font-medium">Loading Digital Tax Invoice...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#111111] flex flex-col items-center justify-center p-4 text-white text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
          <AlertCircle size={24} />
        </div>
        <h2 className="text-lg font-bold text-white mb-1">Invoice Not Found</h2>
        <p className="text-xs text-white/60 max-w-sm mb-6">
          The requested invoice #{id} could not be located in our records. Please verify the URL or contact store support.
        </p>
        <a
          href="tel:+916385368479"
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-[#C9B79C] transition-all"
        >
          Call Store Support (+91 63853 68479)
        </a>
      </div>
    );
  }

  const { store, order } = data;

  const handleDownloadPdf = () => {
    generatePdfInvoice({
      invoiceNo: order.invoiceNo,
      customerName: order.customerName,
      phone: order.phone,
      createdAt: order.createdAt,
      cashierName: order.cashierName,
      subtotalInPaise: order.subtotalInPaise,
      couponCode: order.couponCode,
      couponDiscountPaise: order.couponDiscountPaise,
      manualDiscountPaise: order.manualDiscountPaise,
      totalGstPaise: order.totalGstPaise,
      gstEnabled: order.gstEnabled,
      deliveryChargePaise: order.deliveryChargePaise,
      totalInPaise: order.totalInPaise,
      paymentMode: order.paymentMode,
      splitDetails: order.splitDetails,
      items: order.items || [],
    });
  };

  const shareText = `Hello! Here is the digital tax invoice #${order.invoiceNo} for ₹${(
    order.totalInPaise / 100
  ).toFixed(2)} from Swagyard Clothing: ${typeof window !== 'undefined' ? window.location.href : ''}`;

  return (
    <div className="min-h-screen bg-[#111111] py-8 px-4 sm:px-6 relative text-black">
      {/* Background ambient gold glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#C9B79C]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#C9B79C]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Top Action Bar (Hidden in print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 no-print">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#191919] border border-[#C9B79C]/40 text-[#C9B79C] flex items-center justify-center shadow-sm">
              <Sparkles size={16} />
            </div>
            <span className="font-display font-black text-white text-lg tracking-wider uppercase">
              SWAGYARD
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-[#191919] hover:bg-[#262626] border border-white/10 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Printer size={14} className="text-[#C9B79C]" />
              <span>Print</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              className="px-3.5 py-2 rounded-xl bg-[#C9B79C] hover:bg-[#B5A489] text-[#111111] text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <Download size={14} />
              <span>Download PDF</span>
            </button>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Share2 size={14} />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>

        <InvoiceDocument store={store} order={order} />
      </div>
    </div>
  );
}
