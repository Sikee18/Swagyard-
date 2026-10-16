'use client';

import { jsPDF } from 'jspdf';
import { generatePdfInvoice } from './pdf-invoice';
import { THERMAL_CSS, escapeHtml as esc, printHtml, storeHeaderHtml } from './thermal-print';
import {
  financialBreakdown,
  formatDeliveryDate,
  formatInr,
  receiptPaymentLabel,
  type AdvanceOrder,
} from './advance-orders';

const STORE_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Swagyard';
const STORE_ADDRESS = process.env.NEXT_PUBLIC_STORE_ADDRESS || '';
const STORE_PHONE = process.env.NEXT_PUBLIC_STORE_PHONE || '';

const formatPhone = (phone: string) => {
  const d = phone.replace(/\D/g, '');
  const local = d.length === 12 && d.startsWith('91') ? d.slice(2) : d;
  return local.length === 10 ? `+91 ${local.slice(0, 5)} ${local.slice(5)}` : phone;
};

/** Advance receipt while open; final receipt (with invoice number) once completed. */
export function printAdvanceReceipt(o: AdvanceOrder) {
  const b = financialBreakdown(o);
  const title = b.completed ? 'FINAL RECEIPT' : 'ADVANCE RECEIPT';
  const subtitle = b.completed ? `Invoice ${esc(o.invoiceNo || '')}` : 'Not a final tax invoice';
  const row = (label: string, value: string, bold = false) =>
    `<div class="r"><span${bold ? ' class="bold"' : ''}>${label}</span><span class="bold">${value}</span></div>`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title} ${esc(o.depositId)}</title>
<style>${THERMAL_CSS}</style></head><body>
${storeHeaderHtml()}
<div class="line"></div>
<div class="c big">${title}</div>
<div class="c" style="font-size:10px;">${subtitle}</div>
<div class="line"></div>
<div><span class="bold">${esc(o.depositId)}</span></div>
<div style="font-size:10px;color:#555;">${new Date(o.createdAt).toLocaleString('en-IN')}</div>
<div class="line"></div>
<div class="r"><span class="label">Customer</span><span class="bold">${esc(o.customerName)}</span></div>
<div class="r"><span class="label">Phone</span><span>${esc(formatPhone(o.phone))}</span></div>
${o.address ? `<div class="r"><span class="label">Address</span><span>${esc(o.address)}</span></div>` : ''}
<div class="r"><span class="label">Product</span><span>${esc(o.productName)}</span></div>
${o.category ? `<div class="r"><span class="label">Category</span><span>${esc(o.category)}</span></div>` : ''}
<div class="r"><span class="label">Delivery</span><span>${esc(formatDeliveryDate(o.expectedDeliveryDate))}</span></div>
<div class="r"><span class="label">Payment</span><span>${esc(receiptPaymentLabel(o))}</span></div>
<div class="line"></div>
<div class="r"><span>Subtotal</span><span>${formatInr(b.subtotal)}</span></div>
<div class="r"><span>Delivery</span><span>Free</span></div>
<div class="r"><span>Discount</span><span>${formatInr(b.discount)}</span></div>
<div class="r"><span>CGST</span><span>${formatInr(b.cgst)}</span></div>
<div class="r"><span>SGST</span><span>${formatInr(b.sgst)}</span></div>
${row('Total Amount', formatInr(b.total), true)}
${row('Deposit Paid', formatInr(b.deposit))}
${b.completed ? row('Balance Paid', formatInr(b.balancePaid)) : ''}
<div class="r balance-row"><span>${b.completed ? 'Remaining Balance' : 'Balance Due'}</span><span>${formatInr(b.remaining)}</span></div>
<div class="line"></div>
<div class="warn">${b.completed ? 'FULLY SETTLED &mdash; THANK YOU!' : 'ADVANCE PAYMENT ONLY &mdash; NOT A FINAL INVOICE'}</div>
</body></html>`;
  printHtml(html);
}

/** A4 advance receipt PDF (not a tax invoice). */
function downloadAdvanceReceiptPdf(o: AdvanceOrder) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const money = (paise: number) => formatInr(paise).replace(/^₹/, 'Rs. ');
  doc.setFillColor('#111111');
  doc.rect(0, 0, 210, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor('#111111');
  doc.text(STORE_NAME, 16, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor('#6B7280');
  doc.text('ADVANCE RECEIPT - NOT A TAX INVOICE', 16, 26);
  doc.text(STORE_ADDRESS, 194, 20, { align: 'right', maxWidth: 76 });
  doc.text(STORE_PHONE, 194, 30, { align: 'right' });
  doc.setDrawColor('#C9B79C');
  doc.line(16, 38, 194, 38);

  doc.setTextColor('#1F1F1F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(o.depositId, 16, 51);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#6B7280');
  doc.text(`Created: ${new Date(o.createdAt).toLocaleString('en-IN')}`, 194, 51, { align: 'right' });

  let y = 66;
  const details: [string, string][] = [
    ['Customer', o.customerName],
    ['Phone', formatPhone(o.phone)],
    ['Address', o.address || '-'],
    ['Product', o.productName],
    ['Category', o.category || '-'],
    ['Expected delivery', formatDeliveryDate(o.expectedDeliveryDate)],
  ];
  for (const [label, value] of details) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#6B7280');
    doc.text(label.toUpperCase(), 16, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#1F1F1F');
    doc.text(String(value), 64, y, { maxWidth: 126 });
    y += 10;
  }

  const b = financialBreakdown(o);
  const lines: [string, number, boolean][] = [
    ['Subtotal', b.subtotal, false],
    ['Delivery charges', b.delivery, false],
    ['Discount', b.discount, false],
    ['CGST', b.cgst, false],
    ['SGST', b.sgst, false],
    ['Total order amount', b.total, true],
    ['Deposit paid', b.deposit, false],
    ['Remaining balance', b.remaining, true],
  ];
  y += 4;
  const boxHeight = 10 + lines.length * 8;
  doc.setFillColor('#FBFAF6');
  doc.roundedRect(16, y, 178, boxHeight, 3, 3, 'F');
  lines.forEach(([label, value, bold], i) => {
    const rowY = y + 9 + i * 8;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(bold ? '#7A6A4F' : '#374151');
    doc.text(label, 22, rowY);
    doc.text(label === 'Delivery charges' && value === 0 ? 'Free' : money(value), 188, rowY, { align: 'right' });
  });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#374151');
  doc.text(`Payment: ${receiptPaymentLabel(o)}`, 16, y + boxHeight + 8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#b45309');
  doc.text('This receipt records an advance payment only. It is not a final invoice.', 105, y + boxHeight + 20, {
    align: 'center',
  });
  doc.save(`Advance-Receipt-${o.depositId}.pdf`);
}

/** Advance receipt PDF while open; the official invoice PDF once completed. */
export function downloadAdvancePdf(o: AdvanceOrder) {
  if (o.status !== 'completed' || !o.invoiceNo) {
    downloadAdvanceReceiptPdf(o);
    return;
  }
  generatePdfInvoice({
    invoiceNo: o.invoiceNo,
    customerName: o.customerName,
    phone: o.phone,
    createdAt: o.completedAt || new Date().toISOString(),
    cashierName: o.createdByName,
    subtotalInPaise: o.totalAmountPaise,
    totalInPaise: o.totalAmountPaise,
    paymentMode: o.finalPaymentMode || 'cash',
    splitDetails: o.finalSplitDetails,
    items: [{ productName: o.productName, quantity: 1, unitPrice: o.totalAmountPaise, lineTotal: o.totalAmountPaise }],
  });
}
