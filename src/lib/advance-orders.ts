/**
 * Advance (deposit) order lifecycle shared by the API and the Advance Orders screen.
 *
 * Deposits are tracked separately from sales: the full order value is only recognised
 * as revenue when the final payment is received and an invoice/order is created.
 */

export type AdvanceStatus =
  | 'pending_deposit'
  | 'waiting_final_payment'
  | 'ready_for_delivery'
  | 'completed'
  | 'cancelled';

export type AdvancePaymentMethod = 'cash' | 'qr' | 'card' | 'split';

/** Split amounts in paise. Advance orders split between cash and QR only. */
export interface SplitPaise {
  cash: number;
  qr: number;
  card?: number;
}

export interface AdvancePayment {
  id: number | string;
  paymentType: 'deposit' | 'remaining' | string;
  amountInPaise: number;
  paymentMode: string;
  splitDetails?: SplitPaise | null;
  remarks?: string | null;
  createdAt: string;
}

export interface AdvanceTimelineEvent {
  id: number | string;
  eventType: string;
  label: string;
  remarks?: string | null;
  createdAt: string;
}

export interface AdvanceOrder {
  id: string;
  depositId: string;
  customerName: string;
  phone: string;
  address?: string | null;
  productName: string;
  category?: string | null;
  description?: string | null;
  totalAmountPaise: number;
  depositAmountPaise: number;
  remainingBalancePaise: number;
  depositPaymentMode: string;
  expectedDeliveryDate?: string | null;
  status: AdvanceStatus;
  referenceNumber?: string | null;
  remarks?: string | null;
  completedOrderId?: string | null;
  invoiceNo?: string | null;
  completedAt?: string | null;
  finalPaymentMode?: string | null;
  finalSplitDetails?: SplitPaise | null;
  createdByName?: string | null;
  createdAt: string;
  payments: AdvancePayment[];
  timeline: AdvanceTimelineEvent[];
}

export const STATUS_LABELS: Record<AdvanceStatus, string> = {
  pending_deposit: 'Pending Deposit',
  ready_for_delivery: 'Ready for Delivery',
  waiting_final_payment: 'Waiting for Final Payment',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const STATUS_STYLES: Record<AdvanceStatus, string> = {
  pending_deposit: 'bg-amber-50 text-amber-700 border-amber-200',
  ready_for_delivery: 'bg-gray-50 text-gray-700 border-gray-200',
  waiting_final_payment: 'bg-gray-50 text-gray-700 border-gray-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};

/** Timeline label recorded when an order moves to a (non-completed) status. */
export const STATUS_EVENT_LABELS: Record<Exclude<AdvanceStatus, 'completed'>, string> = {
  pending_deposit: 'Pending Deposit',
  waiting_final_payment: 'Customer Contacted',
  ready_for_delivery: 'Ready for Delivery',
  cancelled: 'Cancelled',
};

const LEGACY_STATUS: Record<string, AdvanceStatus> = {
  deposit_received: 'pending_deposit',
  in_progress: 'pending_deposit',
  customer_contacted: 'waiting_final_payment',
  ready_for_pickup: 'ready_for_delivery',
};

export function normalizeStatus(status: string): AdvanceStatus {
  if (status in STATUS_LABELS) return status as AdvanceStatus;
  return LEGACY_STATUS[status] || 'pending_deposit';
}

export const isLocked = (o: Pick<AdvanceOrder, 'status' | 'invoiceNo' | 'completedOrderId'>) =>
  o.status === 'completed' || o.status === 'cancelled' || !!o.invoiceNo || !!o.completedOrderId;

export const rupees = (paise: number) => (paise || 0) / 100;
export const formatInr = (paise: number) =>
  `₹${rupees(paise).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function sumSplit(split?: SplitPaise | null) {
  if (!split) return 0;
  return (split.cash || 0) + (split.qr || 0) + (split.card || 0);
}

/** "Cash", "QR", "Card" or "Split (Cash ₹x + QR ₹y)". */
export function paymentMethodLabel(method?: string | null, split?: SplitPaise | null): string {
  const m = String(method || '').trim().toLowerCase();
  if (m === 'split') {
    const parts: string[] = [];
    if (split?.cash) parts.push(`Cash ${formatInr(split.cash)}`);
    if (split?.qr) parts.push(`QR ${formatInr(split.qr)}`);
    if (split?.card) parts.push(`Card ${formatInr(split.card)}`);
    return parts.length ? `Split (${parts.join(' + ')})` : 'Split';
  }
  if (m === 'cash') return 'Cash';
  if (m === 'qr' || m === 'upi') return 'QR';
  if (m === 'card') return 'Card';
  return m ? m.charAt(0).toUpperCase() + m.slice(1) : '';
}

/** Payment label shown on receipts: the final method once completed, else Cash. */
export function receiptPaymentLabel(o: AdvanceOrder): string {
  if (!o.finalPaymentMode) return 'Cash';
  if (o.finalPaymentMode === 'qr') return 'UPI / QR';
  if (o.finalPaymentMode === 'split') return paymentMethodLabel('split', o.finalSplitDetails);
  return o.finalPaymentMode.toUpperCase();
}

export function financialBreakdown(o: AdvanceOrder) {
  const completed = o.status === 'completed' || !!o.invoiceNo;
  const total = o.totalAmountPaise;
  const balancePaid = completed ? Math.max(0, total - o.depositAmountPaise) : 0;
  const remaining = completed ? 0 : Math.max(0, o.remainingBalancePaise);
  return {
    subtotal: total,
    delivery: 0,
    discount: 0,
    cgst: 0,
    sgst: 0,
    total,
    deposit: o.depositAmountPaise,
    balancePaid,
    remaining,
    settled: remaining === 0,
    completed,
  };
}

/** Delivery dates are stored as ISO strings at UTC midnight; show the calendar date. */
export function formatDeliveryDate(iso?: string | null, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return '-';
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', opts);
}

interface StoreInfo {
  name: string;
  address: string;
  phone: string;
  instagram: string;
}

export function advanceReceiptMessage(o: AdvanceOrder, store: StoreInfo, paymentMethod?: string) {
  const name = o.customerName?.trim() || 'Customer';
  const delivery = formatDeliveryDate(o.expectedDeliveryDate, { day: '2-digit', month: 'short', year: 'numeric' });
  const method = paymentMethod ? ` (${paymentMethodLabel(paymentMethod).toUpperCase()})` : '';
  return `*${store.name} - Advance Order Receipt*
━━━━━━━━━━━━━━━━━━━
Dear ${name}, thank you for choosing ${store.name}!

We have successfully received your initial advance payment:

🧾 *ADVANCE ORDER DETAILS*
📦 *Deposit ID:* #${o.depositId}
👔 *Product:* ${o.productName}
💵 *Total Order Amount:* ₹${rupees(o.totalAmountPaise)}
💰 *Advance Paid:* ₹${rupees(o.depositAmountPaise)}${method}
🔴 *Balance to Pay on Delivery:* ₹${rupees(o.remainingBalancePaise)}
📅 *Expected Delivery Date:* ${delivery}

Your garments are being prepared with utmost care. We will have everything ready on or before ${delivery}!

📍 *Address:* ${store.address}
📞 *Contact:* ${store.phone}
📷 *Instagram:* @${store.instagram}`;
}

export function finalInvoiceMessage(
  o: AdvanceOrder,
  store: StoreInfo,
  invoiceUrl: string
) {
  const name = o.customerName?.trim() || 'Customer';
  return `*${store.name} - Purchase Invoice*
━━━━━━━━━━━━━━━━━━━
Dear ${name}, thank you for shopping with us!

🧾 *INVOICE DETAILS*
📌 *Invoice No:* #${o.invoiceNo || o.depositId}

📄 *View & Download Digital Invoice / PDF:*
👉 ${invoiceUrl}

📍 *Address:* ${store.address}
📞 *Contact:* ${store.phone}
📷 *Instagram:* @${store.instagram}

Thank you, and visit us again!`;
}

export function whatsappUrl(phone: string, text: string) {
  const digits = String(phone || '').replace(/\D/g, '');
  const intl = digits.length === 10 ? `91${digits}` : digits;
  return `https://api.whatsapp.com/send?phone=${intl}&text=${encodeURIComponent(text)}`;
}
