import { jsPDF } from 'jspdf';

export interface InvoicePdfData {
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

export function generatePdfInvoice(data: InvoicePdfData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header background banner
  doc.setFillColor(17, 17, 17); // #111111
  doc.rect(0, 0, pageWidth, 35, 'F');

  // Brand Name
  doc.setTextColor(201, 183, 156); // #C9B79C gold
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('SWAGYARD', 15, y);

  // Brand Tagline
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('RETAIL CLOTHING POS & INVENTORY', 15, y + 6);

  // Store Contact Right Aligned
  doc.setFontSize(8);
  doc.setTextColor(220, 220, 220);
  doc.text('174, Brazzer Street, Opp. Apollo Medical', pageWidth - 15, 14, { align: 'right' });
  doc.text('Ammoor, Ranipet - 632501, Tamil Nadu', pageWidth - 15, 19, { align: 'right' });
  doc.text('Ph: +91 63853 68479 | swagyard.retail@gmail.com', pageWidth - 15, 24, { align: 'right' });

  y = 45;

  // Invoice Meta Section
  doc.setFillColor(250, 247, 242); // #FAF7F2
  doc.roundedRect(15, y, pageWidth - 30, 24, 3, 3, 'F');
  doc.setDrawColor(220, 215, 205);
  doc.roundedRect(15, y, pageWidth - 30, 24, 3, 3, 'D');

  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TAX INVOICE', 20, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Invoice No: ${data.invoiceNo}`, 20, y + 13);
  doc.text(`Date & Time: ${new Date(data.createdAt).toLocaleString('en-IN')}`, 20, y + 19);

  doc.text(`Billed To: ${data.customerName || 'Walk-in Customer'}`, pageWidth / 2 + 10, y + 7);
  doc.text(`Contact: ${data.phone ? '+91 ' + data.phone : 'Not Provided'}`, pageWidth / 2 + 10, y + 13);
  doc.text(`Cashier: ${data.cashierName || 'Admin'}`, pageWidth / 2 + 10, y + 19);

  y += 32;

  // Items Table Header
  doc.setFillColor(17, 17, 17);
  doc.rect(15, y, pageWidth - 30, 9, 'F');

  doc.setTextColor(201, 183, 156);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('SL', 18, y + 6);
  doc.text('ITEM DESCRIPTION', 30, y + 6);
  doc.text('QTY', 115, y + 6, { align: 'center' });
  doc.text('RATE (INR)', 145, y + 6, { align: 'right' });
  doc.text('TOTAL (INR)', pageWidth - 20, y + 6, { align: 'right' });

  y += 9;

  // Item Rows
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  data.items.forEach((item, index) => {
    const isEven = index % 2 === 0;
    if (isEven) {
      doc.setFillColor(252, 250, 247);
      doc.rect(15, y, pageWidth - 30, 8, 'F');
    }
    doc.setDrawColor(240, 235, 225);
    doc.line(15, y + 8, pageWidth - 15, y + 8);

    doc.text(String(index + 1), 18, y + 5.5);
    doc.text(item.productName.substring(0, 45), 30, y + 5.5);
    doc.text(String(item.quantity), 115, y + 5.5, { align: 'center' });
    doc.text(`Rs. ${(item.unitPrice / 100).toFixed(2)}`, 145, y + 5.5, { align: 'right' });
    doc.text(`Rs. ${(item.lineTotal / 100).toFixed(2)}`, pageWidth - 20, y + 5.5, { align: 'right' });

    y += 8;
  });

  y += 6;

  // Financial Breakdown Box (Right Aligned)
  const boxWidth = 85;
  const boxX = pageWidth - 15 - boxWidth;
  const startBoxY = y;

  doc.setFillColor(250, 247, 242);
  doc.roundedRect(boxX, startBoxY, boxWidth, 48, 2, 2, 'F');
  doc.setDrawColor(220, 215, 205);
  doc.roundedRect(boxX, startBoxY, boxWidth, 48, 2, 2, 'D');

  let lineY = startBoxY + 6;
  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 70);

  doc.text('Subtotal:', boxX + 5, lineY);
  doc.text(`Rs. ${(data.subtotalInPaise / 100).toFixed(2)}`, boxX + boxWidth - 5, lineY, { align: 'right' });
  lineY += 6;

  if (data.couponDiscountPaise && data.couponDiscountPaise > 0) {
    doc.setTextColor(30, 130, 60);
    doc.text(`Coupon (${data.couponCode || 'PROMO'}):`, boxX + 5, lineY);
    doc.text(`- Rs. ${(data.couponDiscountPaise / 100).toFixed(2)}`, boxX + boxWidth - 5, lineY, { align: 'right' });
    lineY += 6;
    doc.setTextColor(70, 70, 70);
  }

  if (data.manualDiscountPaise && data.manualDiscountPaise > 0) {
    doc.setTextColor(30, 130, 60);
    doc.text('Manual Discount:', boxX + 5, lineY);
    doc.text(`- Rs. ${(data.manualDiscountPaise / 100).toFixed(2)}`, boxX + boxWidth - 5, lineY, { align: 'right' });
    lineY += 6;
    doc.setTextColor(70, 70, 70);
  }

  if (data.totalGstPaise && data.totalGstPaise > 0) {
    const halfGst = data.totalGstPaise / 2;
    doc.text('CGST (2.5%):', boxX + 5, lineY);
    doc.text(`+ Rs. ${(halfGst / 100).toFixed(2)}`, boxX + boxWidth - 5, lineY, { align: 'right' });
    lineY += 5;

    doc.text('SGST (2.5%):', boxX + 5, lineY);
    doc.text(`+ Rs. ${(halfGst / 100).toFixed(2)}`, boxX + boxWidth - 5, lineY, { align: 'right' });
    lineY += 6;
  }

  // Grand Total highlight bar
  doc.setFillColor(17, 17, 17);
  doc.roundedRect(boxX, lineY, boxWidth, 10, 1, 1, 'F');
  doc.setTextColor(201, 183, 156);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('GRAND TOTAL:', boxX + 5, lineY + 7);
  doc.text(`Rs. ${(data.totalInPaise / 100).toFixed(2)}`, boxX + boxWidth - 5, lineY + 7, { align: 'right' });

  // Payment Mode details on left
  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('PAYMENT INFORMATION', 15, startBoxY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Payment Tender: ${data.paymentMode.toUpperCase()}`, 15, startBoxY + 12);

  if (data.paymentMode === 'split' && data.splitDetails) {
    const s = data.splitDetails;
    let splitY = startBoxY + 18;
    if (s.cashInPaise) {
      doc.text(`• Cash: Rs. ${(s.cashInPaise / 100).toFixed(2)}`, 18, splitY);
      splitY += 5;
    }
    if (s.cardInPaise) {
      doc.text(`• Card: Rs. ${(s.cardInPaise / 100).toFixed(2)}`, 18, splitY);
      splitY += 5;
    }
    if (s.qrInPaise) {
      doc.text(`• QR/UPI: Rs. ${(s.qrInPaise / 100).toFixed(2)}`, 18, splitY);
      splitY += 5;
    }
    if (s.otherInPaise) {
      doc.text(`• Online/Other: Rs. ${(s.otherInPaise / 100).toFixed(2)}`, 18, splitY);
    }
  }

  // Footer / Terms
  const footerY = 265;
  doc.setDrawColor(220, 215, 205);
  doc.line(15, footerY, pageWidth - 15, footerY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('TERMS & CONDITIONS:', 15, footerY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('1. Goods once sold can be exchanged within 7 days with original invoice and tag intact.', 15, footerY + 10);
  doc.text('2. No cash refunds. Items on sale/discount are not eligible for exchange.', 15, footerY + 14);
  doc.text('3. This is a computer-generated tax invoice and requires no physical signature.', 15, footerY + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(17, 17, 17);
  doc.text('Thank you for shopping at Swagyard!', pageWidth / 2, footerY + 24, { align: 'center' });

  // Download PDF file
  const filename = `Swagyard-Invoice-${data.invoiceNo}.pdf`;
  doc.save(filename);
}
