'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDays,
  CircleCheck,
  Clock3,
  Download,
  Eye,
  FileText,
  MessageCircle,
  PackageCheck,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  STATUS_LABELS,
  STATUS_STYLES,
  advanceReceiptMessage,
  finalInvoiceMessage,
  financialBreakdown,
  formatDeliveryDate,
  formatInr,
  isLocked,
  paymentMethodLabel,
  whatsappUrl,
  type AdvanceOrder,
  type AdvanceStatus,
} from '@/lib/advance-orders';
import { downloadAdvancePdf, printAdvanceReceipt } from '@/lib/advance-receipt';
import { useIsAdmin } from '@/components/layout/RoleContext';

type StatusFilter = 'all' | 'pending' | 'ready' | 'completed' | 'cancelled';
type DateFilter = 'all' | 'today' | 'week' | 'month';
type FinalMethod = 'cash' | 'qr' | 'card' | 'split';

const STORE = {
  name: process.env.NEXT_PUBLIC_APP_NAME || 'Swagyard',
  address: process.env.NEXT_PUBLIC_STORE_ADDRESS || '',
  phone: process.env.NEXT_PUBLIC_STORE_PHONE || '',
  instagram: process.env.NEXT_PUBLIC_STORE_INSTA || '',
};

const INPUT =
  'w-full rounded-xl border border-[#DDD2BE] bg-white px-3.5 py-2.5 text-sm text-[#1F1F1F] outline-none transition focus:border-[#6B7280] focus:ring-2 focus:ring-gray-100';

const QUICK_EVENTS: [string, string][] = [
  ['order_confirmed', 'Order Confirmed'],
  ['order_packed', 'Order Packed'],
  ['ready_for_delivery', 'Ready for Delivery'],
  ['customer_contacted', 'Customer Contacted'],
  ['delivered', 'Delivered'],
];

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const formatPhone = (phone: string) => {
  const d = (phone || '').replace(/\D/g, '');
  const local = d.length === 12 && d.startsWith('91') ? d.slice(2) : d;
  return local.length === 10 ? `+91 ${local.slice(0, 5)} ${local.slice(5)}` : phone;
};

/** Square ₹ badge used on the money stat cards. */
const RupeeSquare = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="4" />
    <text x="12" y="16" textAnchor="middle" fontSize="9" fontWeight="bold" stroke="none" fill="currentColor" fontFamily="Arial, sans-serif">
      ₹
    </text>
  </svg>
);

async function readJson(res: Response, fallback: string) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || fallback);
  return body;
}

function SplitInput({
  idPrefix,
  totalPaise,
  value,
  onChange,
}: {
  idPrefix: string;
  totalPaise: number;
  value: { cash: string; qr: string };
  onChange: (v: { cash: string; qr: string }) => void;
}) {
  const entered = Math.round(((Number(value.cash) || 0) + (Number(value.qr) || 0)) * 100);
  const diff = totalPaise - entered;
  const matched = diff === 0 && totalPaise > 0;
  return (
    <div className="rounded-xl border border-[#DDD2BE] bg-white p-2.5">
      <div className="grid grid-cols-2 gap-2">
        {(['cash', 'qr'] as const).map((key) => (
          <label key={key} htmlFor={`${idPrefix}-${key}`} className="block">
            <span className="mb-0.5 block text-[10px] font-black uppercase tracking-wider text-[#374151]">
              {key === 'cash' ? 'Cash' : 'QR'} (₹)
            </span>
            <input
              id={`${idPrefix}-${key}`}
              type="number"
              min="0"
              step="0.01"
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
              value={value[key]}
              onChange={(e) => onChange({ ...value, [key]: e.target.value })}
              placeholder="0.00"
              className="h-9 w-full rounded-xl border border-gray-200 bg-[#FAF7F2] px-2 text-[13px] font-black text-[#111111] focus:border-[#111111] focus:bg-white focus:outline-none"
            />
          </label>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between rounded-lg border border-[#DDD2BE] bg-[#FAF7F2] px-3 py-1.5 text-[11px] font-bold">
        <span className="text-[#374151]">
          Entered {formatInr(entered)} of {formatInr(totalPaise)}
        </span>
        <span className={matched ? 'text-emerald-700' : diff < 0 ? 'text-red-600' : 'text-[#111111]'}>
          {matched ? 'Matched ✓' : diff < 0 ? `Over by ${formatInr(-diff)}` : `Remaining ${formatInr(diff)}`}
        </span>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-[#6B7280]">{label}</span>
      {children}
    </label>
  );
}

export function AdvanceOrdersView(_props: { lang?: 'en' | 'ta' }) {
  const isAdmin = useIsAdmin();
  const [orders, setOrders] = useState<AdvanceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [detail, setDetail] = useState<AdvanceOrder | null>(null);
  const [settling, setSettling] = useState<AdvanceOrder | null>(null);
  const [finalPayment, setFinalPayment] = useState<{ method: FinalMethod; remarks: string }>({ method: 'cash', remarks: '' });
  const [finalSplit, setFinalSplit] = useState({ cash: '', qr: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setOrders(await readJson(await fetch('/api/advance-orders'), 'Unable to load advance orders'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load advance orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!detail && !settling) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (detail) setDetail(null);
      else setSettling(null);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [detail, settling]);

  const replaceOrder = (updated: AdvanceOrder) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    setDetail((d) => (d && d.id === updated.id ? updated : d));
  };

  const flash = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(''), 3000);
  };

  const stats = useMemo(
    () => ({
      total: orders.length,
      pending: orders.filter((o) => o.status === 'pending_deposit' || o.status === 'waiting_final_payment').length,
      deposits: orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.depositAmountPaise, 0),
      outstanding: orders
        .filter((o) => o.status !== 'completed' && o.status !== 'cancelled')
        .reduce((s, o) => s + o.remainingBalancePaise, 0),
      ready: orders.filter((o) => o.status === 'ready_for_delivery').length,
      completed: orders.filter((o) => o.status === 'completed').length,
    }),
    [orders]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = new Date();
    return orders.filter((o) => {
      const haystack = [o.depositId, o.customerName, o.phone, o.productName, STATUS_LABELS[o.status]].join(' ').toLowerCase();
      if (q && !haystack.includes(q)) return false;
      if (statusFilter === 'pending' && !['pending_deposit', 'waiting_final_payment'].includes(o.status)) return false;
      if (statusFilter === 'ready' && o.status !== 'ready_for_delivery') return false;
      if (statusFilter === 'completed' && o.status !== 'completed') return false;
      if (statusFilter === 'cancelled' && o.status !== 'cancelled') return false;
      if (dateFilter !== 'all') {
        const created = new Date(o.createdAt);
        if (dateFilter === 'today' && dayKey(created) !== dayKey(now)) return false;
        if (dateFilter === 'week' && created < new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)) return false;
        if (dateFilter === 'month' && (created.getMonth() !== now.getMonth() || created.getFullYear() !== now.getFullYear()))
          return false;
      }
      return true;
    });
  }, [orders, search, statusFilter, dateFilter]);

  const openDetail = async (o: AdvanceOrder) => {
    setDetail(o);
    try {
      setDetail(await readJson(await fetch(`/api/advance-orders/${o.id}`), 'Unable to load order details'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load order details');
    }
  };

  const remove = async (o: AdvanceOrder) => {
    if (!window.confirm(`Are you sure you want to delete advance order "${o.customerName}"? This action cannot be undone.`)) return;
    try {
      await readJson(await fetch(`/api/advance-orders/${o.id}`, { method: 'DELETE' }), 'Failed to delete order');
      setOrders((prev) => prev.filter((x) => x.id !== o.id));
      flash('Order deleted successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete order');
    }
  };

  const changeStatus = async (o: AdvanceOrder, status: AdvanceStatus) => {
    if (o.status === 'cancelled') {
      setError('A cancelled order cannot be modified.');
      return;
    }
    if (isLocked(o)) {
      setError('This order is already completed and has an official invoice.');
      return;
    }
    if (status === 'completed') {
      setSettling(o);
      return;
    }
    try {
      const updated = await readJson(
        await fetch(`/api/advance-orders/${o.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }),
        'Unable to update status'
      );
      replaceOrder(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update status');
    }
  };

  const shareAdvance = (o: AdvanceOrder) => {
    window.open(whatsappUrl(o.phone, advanceReceiptMessage(o, STORE)), '_blank', 'noopener,noreferrer');
  };

  const shareInvoice = (o: AdvanceOrder) => {
    const ref = o.invoiceNo || o.depositId;
    const url = `${window.location.origin}/invoice/${encodeURIComponent(ref)}`;
    window.open(whatsappUrl(o.phone, finalInvoiceMessage(o, STORE, url)), '_blank', 'noopener,noreferrer');
  };

  const share = (o: AdvanceOrder) => (o.status === 'completed' ? shareInvoice(o) : shareAdvance(o));

  const completePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settling) return;
    setSubmitting(true);
    setError('');
    try {
      const updated: AdvanceOrder = await readJson(
        await fetch(`/api/advance-orders/${settling.id}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentMethod: finalPayment.method,
            remarks: finalPayment.remarks,
            splitDetails: finalPayment.method === 'split' ? finalSplit : undefined,
          }),
        }),
        'Unable to complete payment'
      );
      replaceOrder(updated);
      setSettling(null);
      setFinalPayment({ method: 'cash', remarks: '' });
      setFinalSplit({ cash: '', qr: '' });
      setNotice(
        `${updated.invoiceNo} generated once. The full ${formatInr(updated.totalAmountPaise)} is now recognized as revenue.`
      );
      shareInvoice(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete payment');
    } finally {
      setSubmitting(false);
    }
  };

  const addTimeline = async (o: AdvanceOrder, eventType: string, label: string) => {
    try {
      const updated = await readJson(
        await fetch(`/api/advance-orders/${o.id}/timeline`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventType }),
        }),
        'Unable to add timeline event'
      );
      replaceOrder(updated);
      flash(`${label} added to ${o.depositId}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add timeline event');
    }
  };

  const statCards: [string, React.ReactNode, React.ReactNode, string][] = [
    ['Total Deposits', stats.total, <FileText key="i" size={21} />, 'text-[#111111] bg-[#FAF7F2] border border-[#DDD2BE]'],
    ['Pending Deposit Orders', stats.pending, <Clock3 key="i" size={21} />, 'text-amber-700 bg-amber-50 border border-amber-200'],
    ['Total Deposit Amount', formatInr(stats.deposits), <RupeeSquare key="i" size={21} />, 'text-[#7A6A4F] bg-amber-50 border border-amber-200'],
    ['Outstanding Balance', formatInr(stats.outstanding), <RupeeSquare key="i" size={21} />, 'text-red-700 bg-red-50 border border-red-200'],
    ['Ready For Collection', stats.ready, <PackageCheck key="i" size={21} />, 'text-gray-700 bg-gray-50 border border-gray-200'],
    ['Completed Deposit Orders', stats.completed, <CircleCheck key="i" size={21} />, 'text-emerald-700 bg-emerald-50 border border-emerald-200'],
  ];

  const iconBtn = 'w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0';

  return (
    <div className="p-4 md:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-[#7A6A4F]">Separate from sales</p>
          <h2 className="text-2xl font-black text-[#111111]">Advance Orders</h2>
          <p className="mt-1 text-sm text-gray-500">
            Deposits never count as revenue. Full order value is recognized only after final payment.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={load}
            title="Refresh"
            className="rounded-xl border border-gray-200 bg-white p-3 text-gray-600 hover:text-[#111111] transition-colors cursor-pointer"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
      )}
      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {statCards.map(([label, value, icon, tone]) => (
          <div key={label} className="rounded-2xl border border-[#DDD2BE] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wide text-gray-500">{label}</p>
                <p className="mt-2 text-2xl font-black text-gray-900">{value}</p>
              </div>
              <div className={`rounded-xl p-3 ${tone}`}>{icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[#DDD2BE] bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <label className="relative">
            <Search className="absolute left-3 top-3 text-[#A8946F]" size={17} />
            <input
              className={`${INPUT} pl-10`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Deposit ID, customer, phone, product or status"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {(['all', 'pending', 'ready', 'completed', 'cancelled'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={`rounded-lg px-3 py-2 text-xs font-black capitalize transition-all cursor-pointer ${
                  statusFilter === f ? 'bg-[#111111] text-[#C9B79C]' : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <select className={INPUT} value={dateFilter} onChange={(e) => setDateFilter(e.target.value as DateFilter)}>
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#DDD2BE] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-gray-200 text-[10px] font-black uppercase tracking-wider text-gray-600">
              <tr>
                {['Deposit ID / Created', 'Customer', 'Product', 'Total / Deposit / Balance', 'Delivery', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3.5 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    Loading advance orders...
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    No advance orders match these filters.
                  </td>
                </tr>
              ) : (
                visible.map((o) => {
                  const locked = isLocked(o);
                  const done = o.status === 'completed';
                  return (
                    <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                        <p className="font-black text-[#111111]">{o.depositId}</p>
                        <p className="text-[11px] text-gray-500">
                          {new Date(o.createdAt).toLocaleDateString('en-IN')} •{' '}
                          {new Date(o.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                        <p className="font-bold text-gray-900">{o.customerName}</p>
                        <p className="text-xs text-gray-500">{formatPhone(o.phone)}</p>
                      </td>
                      <td className="max-w-[180px] px-4 py-3.5 align-middle">
                        <p className="truncate font-semibold text-gray-900">{o.productName}</p>
                        <p className="truncate text-xs text-gray-500">{o.category || 'Uncategorised'}</p>
                      </td>
                      <td className="px-4 py-3.5 text-xs align-middle whitespace-nowrap">
                        <p className="text-gray-700">
                          Total: <b>{formatInr(o.totalAmountPaise)}</b>
                        </p>
                        <p className="text-[#111111]">
                          Paid: <b>{formatInr(o.depositAmountPaise)}</b>
                        </p>
                        <p className="text-red-600 font-bold">
                          Balance: <b>{formatInr(o.remainingBalancePaise)}</b>
                        </p>
                      </td>
                      <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                          <CalendarDays size={14} className="text-gray-400 shrink-0" />
                          <span>{formatDeliveryDate(o.expectedDeliveryDate)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                        <select
                          value={o.status}
                          disabled={locked}
                          onChange={(e) => changeStatus(o, e.target.value as AdvanceStatus)}
                          className={`rounded-xl border px-2.5 py-1.5 text-xs font-black outline-none transition-colors cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed ${STATUS_STYLES[o.status]}`}
                        >
                          <option value="pending_deposit">Pending Deposit</option>
                          <option value="waiting_final_payment">Waiting for Final Payment</option>
                          <option value="completed">Completed (receive payment)</option>
                          <option value="ready_for_delivery">Ready to Collect</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {!locked && (
                            <button
                              type="button"
                              onClick={() => setSettling(o)}
                              title="Receive Remaining Balance"
                              className="flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 text-xs font-black transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                            >
                              <span>Receive Balance</span>
                            </button>
                          )}
                          <button type="button" onClick={() => openDetail(o)} title="View Details" className={`${iconBtn} bg-[#FAF7F2] hover:bg-gray-100 text-[#111111]`}>
                            <Eye size={15} />
                          </button>
                          {isAdmin && (
                            <button type="button" onClick={() => remove(o)} title="Delete Order" className={`${iconBtn} bg-slate-100 hover:bg-red-100 text-red-600`}>
                              <Trash2 size={15} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => printAdvanceReceipt(o)}
                            title={done ? 'Print Final Receipt' : 'Print Advance Receipt'}
                            className={`${iconBtn} bg-amber-50 hover:bg-amber-100 text-[#7A6A4F]`}
                          >
                            <Printer size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadAdvancePdf(o)}
                            title={done ? 'Download PDF Invoice' : 'Download PDF Receipt'}
                            className={`${iconBtn} bg-[#FAF7F2] hover:bg-gray-100 text-[#111111]`}
                          >
                            <Download size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => share(o)}
                            title={done ? 'Share Final Invoice via WhatsApp' : 'Share Advance Receipt via WhatsApp'}
                            className={`${iconBtn} bg-emerald-50 hover:bg-emerald-100 text-emerald-700`}
                          >
                            <MessageCircle size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {settling &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
            <form
              onSubmit={completePayment}
              className="w-full max-w-md max-h-full overflow-hidden overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-[#DDD2BE]"
            >
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-emerald-600 font-mono">{settling.depositId}</p>
                  <h3 className="text-xl font-black text-[#111111]">Receive Remaining Payment</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSettling(null)}
                  className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="mb-6 rounded-2xl bg-emerald-50 py-5 text-center">
                <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600">Remaining Amount</p>
                <p className="mt-1 text-4xl font-black text-emerald-800">{formatInr(settling.remainingBalancePaise)}</p>
              </div>
              <div className="space-y-4">
                <Field label="Payment Method">
                  <select
                    className={INPUT}
                    value={finalPayment.method}
                    onChange={(e) => setFinalPayment({ ...finalPayment, method: e.target.value as FinalMethod })}
                  >
                    <option value="cash">Cash</option>
                    <option value="qr">QR</option>
                    <option value="card">Card</option>
                    <option value="split">Split (Cash + QR)</option>
                  </select>
                </Field>
                {finalPayment.method === 'split' && (
                  <SplitInput
                    idPrefix="adv-final-split"
                    totalPaise={settling.remainingBalancePaise}
                    value={finalSplit}
                    onChange={setFinalSplit}
                  />
                )}
                <Field label="Payment Notes">
                  <textarea
                    className={INPUT}
                    value={finalPayment.remarks}
                    onChange={(e) => setFinalPayment({ ...finalPayment, remarks: e.target.value })}
                    placeholder="Notes about this payment (optional)"
                  />
                </Field>
                <p className="mt-2 rounded-xl bg-amber-50 p-3 text-[11px] font-semibold text-amber-800">
                  Confirmation marks the order Completed, creates one official invoice, and recognizes the full{' '}
                  {formatInr(settling.totalAmountPaise)} as revenue.
                </p>
                <button
                  disabled={submitting}
                  className="mt-5 w-full rounded-xl bg-emerald-600 py-3.5 font-black text-white shadow-lg shadow-emerald-600/30 transition-transform active:scale-95 disabled:opacity-50 cursor-pointer hover:bg-emerald-700"
                >
                  {submitting ? 'Processing...' : 'Confirm Final Payment'}
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}

      {detail &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex justify-end bg-black/60">
            <div className="absolute inset-0" onClick={() => setDetail(null)} />
            <div className="relative z-10 h-full w-full max-w-xl bg-white shadow-2xl flex flex-col border-l border-[#DDD2BE]">
              <div className="shrink-0 px-6 py-4 border-b border-[#C9B79C]/30 bg-[#111111] text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#262626] border border-[#C9B79C]/50 flex items-center justify-center text-[#C9B79C] shrink-0">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-[#7A6A4F] tracking-wider font-mono">{detail.depositId}</span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${STATUS_STYLES[detail.status]}`}>
                        {STATUS_LABELS[detail.status]}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-white tracking-wide">Order Details</h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDetail(null)}
                  title="Close (Esc)"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      ['Customer', detail.customerName],
                      ['Phone', formatPhone(detail.phone)],
                      ['Address', detail.address || '-'],
                      ['Product', detail.productName],
                      ['Category', detail.category || '-'],
                      ['Delivery Date', formatDeliveryDate(detail.expectedDeliveryDate)],
                      ['Created Date', new Date(detail.createdAt).toLocaleDateString('en-IN')],
                      ['Created Time', new Date(detail.createdAt).toLocaleTimeString('en-IN')],
                      ['Created By', detail.createdByName || '-'],
                      ['Current Status', STATUS_LABELS[detail.status]],
                      ['Invoice Number', detail.invoiceNo || 'Not generated'],
                      ['Reference No', detail.referenceNumber || '—'],
                    ] as [string, string][]
                  ).map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                      <p className="text-[10px] font-black uppercase text-gray-500">{label}</p>
                      <p className="mt-1 break-words text-sm font-bold text-gray-900">{value}</p>
                    </div>
                  ))}
                </div>

                {(() => {
                  const b = financialBreakdown(detail);
                  const cell = (label: string, value: string, highlight = false) => (
                    <div className={`rounded-xl border p-3 ${highlight ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
                      <p className={`text-[10px] font-black uppercase ${highlight ? 'text-amber-700' : 'text-gray-500'}`}>{label}</p>
                      <p className="mt-1 break-words text-sm font-black text-gray-900">{value}</p>
                    </div>
                  );
                  return (
                    <div className="rounded-2xl border border-[#C9B79C] bg-[#FBFAF6] p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="text-[11px] font-black uppercase tracking-wide text-[#111111]">Financial Breakdown &amp; Balance</p>
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-black uppercase ${
                            b.settled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'
                          }`}
                        >
                          {b.settled ? 'Fully Settled' : 'Balance Pending'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {cell('Subtotal', formatInr(b.subtotal))}
                        {cell('Delivery Charges', 'Free (₹0)')}
                        {cell('Discount', formatInr(b.discount))}
                        {cell('CGST', formatInr(b.cgst))}
                        {cell('SGST', formatInr(b.sgst))}
                        {cell('Total Amount', formatInr(b.total), true)}
                      </div>
                      <div className="mt-3 space-y-2 rounded-xl border border-amber-200 bg-white p-3 text-sm">
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-600">Deposit Paid:</span>
                          <span className="font-black text-blue-700">{formatInr(b.deposit)}</span>
                        </div>
                        {b.completed && (
                          <div className="flex justify-between">
                            <span className="font-semibold text-gray-600">Final Balance Paid:</span>
                            <span className="font-black text-emerald-700">{formatInr(b.balancePaid)}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-gray-100 pt-2">
                          <span className="font-black text-emerald-800">REMAINING BALANCE:</span>
                          <span className={`font-black ${b.settled ? 'text-emerald-700' : 'text-red-600'}`}>
                            {formatInr(b.remaining)}
                            {b.settled ? ' (Fully Settled)' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {detail.remarks && (
                  <div className="rounded-xl border border-gray-200 bg-[#FAF7F2] p-3.5">
                    <p className="text-[10px] font-black uppercase text-[#111111]">Remarks</p>
                    <p className="mt-1 text-sm text-gray-900 font-medium">{detail.remarks}</p>
                  </div>
                )}
                {detail.description && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5">
                    <p className="text-[10px] font-black uppercase text-gray-500">Description</p>
                    <p className="mt-1 text-sm text-gray-800">{detail.description}</p>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-black text-gray-900">Quick Timeline Updates</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {QUICK_EVENTS.map(([type, label]) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => addTimeline(detail, type, label)}
                        className="rounded-lg border border-gray-200 bg-[#FAF7F2] hover:bg-gray-100 px-3 py-2 text-xs font-black text-[#111111] transition cursor-pointer"
                      >
                        + {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-black text-gray-900">Payment History</h4>
                  <div className="mt-2 space-y-2">
                    {detail.payments.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No payments recorded yet.</p>
                    ) : (
                      detail.payments.map((p) => (
                        <div
                          key={p.id}
                          className="flex justify-between items-center rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm"
                        >
                          <span className="font-bold capitalize text-emerald-900">
                            {p.paymentType} — {paymentMethodLabel(p.paymentMode, p.splitDetails)}
                          </span>
                          <span className="font-black text-emerald-800">{formatInr(p.amountInPaise)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-black text-gray-900">Order Timeline</h4>
                  <div className="mt-3 border-l-2 border-gray-200 pl-4 space-y-4">
                    {detail.timeline.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No timeline events recorded.</p>
                    ) : (
                      detail.timeline.map((t) => (
                        <div
                          key={t.id}
                          className="relative pb-2 before:absolute before:-left-[21px] before:top-1.5 before:h-2.5 before:w-2.5 before:rounded-full before:bg-[#111111]"
                        >
                          <p className="text-sm font-black text-gray-900">{t.label}</p>
                          <p className="text-xs text-gray-500">{new Date(t.createdAt).toLocaleString('en-IN')}</p>
                          {t.remarks && (
                            <p className="mt-1 text-xs text-gray-600 bg-white/70 p-2 rounded-lg border border-gray-100">{t.remarks}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="shrink-0 px-6 py-4 border-t border-gray-200 bg-slate-50 flex items-center justify-between gap-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => printAdvanceReceipt(detail)}
                    title={detail.status === 'completed' ? 'Print Final Receipt' : 'Print Advance Receipt'}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer transition"
                  >
                    <Printer size={14} /> Print
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadAdvancePdf(detail)}
                    title={detail.status === 'completed' ? 'Download PDF Invoice' : 'Download PDF Receipt'}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer transition"
                  >
                    <Download size={14} /> PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => share(detail)}
                    title="Share via WhatsApp"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 cursor-pointer transition"
                  >
                    <MessageCircle size={14} /> WhatsApp
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setDetail(null)}
                  className="px-5 py-2 rounded-xl bg-[#111111] hover:bg-[#262626] text-[#C9B79C] text-xs font-black cursor-pointer transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
