'use client';

const STORE_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Swagyard';
const STORE_ADDRESS = process.env.NEXT_PUBLIC_STORE_ADDRESS || '';
const STORE_PHONE = process.env.NEXT_PUBLIC_STORE_PHONE || '';
const STORE_INSTA = process.env.NEXT_PUBLIC_STORE_INSTA || '';

export const escapeHtml = (s: string) =>
  s.replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c] || c);

/** Prints a standalone HTML document through a hidden iframe, so only the receipt is printed. */
export function printHtml(html: string) {
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1000);
  }, 250);
}

export const THERMAL_CSS = `
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; width: 72mm; padding: 4mm; color: #111; }
  .c { text-align: center; }
  .r { display: flex; justify-content: space-between; gap: 4px; margin: 5px 0; word-break: break-word; }
  .r span:first-child { flex-shrink: 0; max-width: 55%; }
  .r span:last-child { text-align: right; flex: 1; }
  .line { border-top: 1px dashed #555; margin: 8px 0; }
  .big { font-size: 15px; font-weight: bold; }
  .bold { font-weight: bold; }
  .label { font-size: 10px; color: #555; }
  .warn { font-size: 9px; font-weight: bold; margin-top: 10px; text-align: center; }
  .balance-row { font-size: 14px; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  td, th { padding: 2px 0; vertical-align: top; }
  .text-right { text-align: right; }
`;

export const storeHeaderHtml = () => `
<div class="c big">${escapeHtml(STORE_NAME)}</div>
<div class="c" style="font-size:10px;color:#555;">${escapeHtml(STORE_ADDRESS)}</div>
<div class="c" style="font-size:10px;color:#555;">${escapeHtml(STORE_PHONE)}</div>`;

export interface PrintableOrder {
  invoiceNo: string;
  customerName?: string | null;
  phone?: string | null;
  createdAt: string;
  subtotalInPaise: number;
  couponCode?: string | null;
  couponDiscountPaise?: number;
  manualDiscountPaise?: number;
  totalGstPaise?: number;
  deliveryChargePaise?: number;
  totalInPaise: number;
  paymentMode: string;
  items: { productName: string; quantity: number; lineTotal: number }[];
}

const money = (paise: number) =>
  `₹${((paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** 80mm thermal receipt for a completed sale. */
export function printOrderReceipt(o: PrintableOrder) {
  const items = (o.items || [])
    .map(
      (it) =>
        `<tr><td>${escapeHtml(it.productName)} x${it.quantity}</td><td class="text-right">${money(it.lineTotal)}</td></tr>`
    )
    .join('');
  const row = (label: string, value: string, bold = false) =>
    `<tr${bold ? ' class="bold" style="font-size:14px;"' : ''}><td>${label}</td><td class="text-right">${value}</td></tr>`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Invoice ${escapeHtml(o.invoiceNo)}</title>
<style>${THERMAL_CSS}</style></head><body>
${storeHeaderHtml()}
<div class="line"></div>
<div class="r"><span class="bold">#${escapeHtml(o.invoiceNo)}</span><span>${new Date(o.createdAt).toLocaleString('en-IN')}</span></div>
${o.customerName ? `<div class="r"><span class="label">Customer</span><span>${escapeHtml(o.customerName)}</span></div>` : ''}
${o.phone ? `<div class="r"><span class="label">Phone</span><span>${escapeHtml(o.phone)}</span></div>` : ''}
<div class="line"></div>
<table>${items}</table>
<div class="line"></div>
<table>
${row('Subtotal', money(o.subtotalInPaise))}
${(o.couponDiscountPaise || 0) > 0 ? row(`Coupon${o.couponCode ? ` (${escapeHtml(o.couponCode)})` : ''}`, `-${money(o.couponDiscountPaise || 0)}`) : ''}
${(o.manualDiscountPaise || 0) > 0 ? row('Manual Disc.', `-${money(o.manualDiscountPaise || 0)}`) : ''}
${(o.totalGstPaise || 0) > 0 ? row('GST', `+${money(o.totalGstPaise || 0)}`) : ''}
${row('Delivery', (o.deliveryChargePaise || 0) > 0 ? money(o.deliveryChargePaise || 0) : 'Free')}
${row('Total', money(o.totalInPaise), true)}
</table>
<div class="r"><span class="label">Payment</span><span>${escapeHtml(String(o.paymentMode || '').toUpperCase())}</span></div>
<div class="line"></div>
<div class="c" style="font-size:11px;"><div class="bold">Thank you for shopping at ${escapeHtml(STORE_NAME)}!</div>${
    STORE_INSTA ? `<div>Follow us on Instagram: @${escapeHtml(STORE_INSTA)}</div>` : ''
  }</div>
</body></html>`;
  printHtml(html);
}
