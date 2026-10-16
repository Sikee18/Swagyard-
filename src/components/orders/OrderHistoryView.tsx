'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Download, Eye, MessageCircle, Pen, RefreshCw, Search, ShoppingCart, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { InvoicePreviewModal } from '@/components/invoice/InvoicePreviewModal';
import { useIsAdmin } from '@/components/layout/RoleContext';

interface OrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  isManual?: boolean;
}

interface OrderRecord {
  id: string;
  invoiceNo: string;
  customerName: string | null;
  phone: string | null;
  address: string | null;
  subtotalInPaise: number;
  couponCode: string | null;
  couponDiscountPaise: number;
  manualDiscountPaise: number;
  totalGstPaise: number;
  gstEnabled: boolean;
  deliveryChargePaise: number;
  totalInPaise: number;
  paymentMode: string;
  splitDetails: any;
  status: string;
  remarks: string | null;
  referenceNumber: string | null;
  cashierName: string | null;
  createdAt: string;
  items: OrderItem[];
}

type BillType = 'all' | 'offline' | 'online' | 'manual';
type DatePreset = '' | 'today' | 'week' | 'month' | 'custom';

interface DetailFilters {
  invoiceNo: string;
  customerName: string;
  phone: string;
  dateFrom: string;
  dateTo: string;
}

interface EditForm {
  customerName: string;
  phone: string;
  address: string;
  remarks: string;
  referenceNumber: string;
  status: string;
}

const EMPTY_FILTERS: DetailFilters = { invoiceNo: '', customerName: '', phone: '', dateFrom: '', dateTo: '' };

const money = (paise: number) =>
  `₹${((paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const dayKey = (value: string | Date) => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatPhone = (phone: string | null) => {
  if (!phone) return '';
  const d = phone.replace(/\D/g, '');
  const local = d.length === 12 && d.startsWith('91') ? d.slice(2) : d;
  return local.length === 10 ? `+91 ${local.slice(0, 5)} ${local.slice(5)}` : phone;
};

const normalizeStatus = (s: string) => {
  const v = String(s || '').trim().toLowerCase();
  return v === 'pending' ? 'pending' : 'completed';
};

/** Every bill in this system is an in-store (offline) POS bill. */
const billType = (_o: OrderRecord): Exclude<BillType, 'all'> => 'offline';

const totalDiscount = (o: OrderRecord) => (o.couponDiscountPaise || 0) + (o.manualDiscountPaise || 0);

function exportCsv(rows: OrderRecord[]) {
  const header = ['Order Ref', 'Customer', 'Phone', 'Date', 'Total (INR)', 'Order Type', 'Status'];
  const lines = rows.map((o) => [
    o.invoiceNo,
    o.customerName || 'Walk-in Customer',
    o.phone || '',
    dayKey(o.createdAt),
    (o.totalInPaise / 100).toFixed(2),
    'pos_sale',
    normalizeStatus(o.status),
  ]);
  const csv = '﻿' + [header, ...lines].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function OrderHistoryView({ onOpenPos }: { lang?: 'en' | 'ta'; onOpenPos?: () => void }) {
  const isAdmin = useIsAdmin();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [billFilter, setBillFilter] = useState<BillType>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('');
  const [filters, setFilters] = useState<DetailFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<DetailFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<OrderRecord | null>(null);
  const [editing, setEditing] = useState<OrderRecord | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders?preset=all');
      if (res.ok) setOrders((await res.json()).orders || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditing(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing]);

  /** Runs the text search and detailed filters (they apply on Search, like the original). */
  const runSearch = (e?: React.FormEvent, dateOverride?: Pick<DetailFilters, 'dateFrom' | 'dateTo'>) => {
    e?.preventDefault();
    setAppliedSearch(searchInput.trim());
    setApplied({ ...filters, ...(dateOverride || {}) });
  };

  const visible = useMemo(() => {
    const q = appliedSearch.toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    return orders.filter((o) => {
      const day = dayKey(o.createdAt);
      if (billFilter !== 'all' && billType(o) !== billFilter) return false;
      if (applied.dateFrom && day < applied.dateFrom) return false;
      if (applied.dateTo && day > applied.dateTo) return false;
      if (q) {
        const phoneDigits = (o.phone || '').replace(/\D/g, '');
        const hit =
          o.invoiceNo.toLowerCase().includes(q) ||
          o.id.toLowerCase() === q ||
          (o.customerName || '').toLowerCase().includes(q) ||
          (o.phone || '').toLowerCase().includes(q) ||
          (qDigits.length >= 4 && phoneDigits.includes(qDigits));
        if (!hit) return false;
      }
      if (applied.invoiceNo.trim() && !o.invoiceNo.toLowerCase().includes(applied.invoiceNo.trim().toLowerCase())) return false;
      if (applied.customerName.trim() && !(o.customerName || '').toLowerCase().includes(applied.customerName.trim().toLowerCase()))
        return false;
      if (applied.phone.trim()) {
        const want = applied.phone.replace(/\D/g, '');
        if (!(o.phone || '').replace(/\D/g, '').includes(want || applied.phone.trim())) return false;
      }
      return true;
    });
  }, [orders, appliedSearch, billFilter, applied]);

  const activeFilterCount =
    (billFilter !== 'all' ? 1 : 0) +
    (datePreset || filters.dateFrom || filters.dateTo ? 1 : 0) +
    (filters.invoiceNo.trim() ? 1 : 0) +
    (filters.customerName.trim() ? 1 : 0) +
    (filters.phone.trim() ? 1 : 0);

  const applyPreset = (preset: DatePreset) => {
    setDatePreset(preset);
    if (!preset) {
      setFilters((f) => ({ ...f, dateFrom: '', dateTo: '' }));
      runSearch(undefined, { dateFrom: '', dateTo: '' });
      return;
    }
    if (preset === 'custom') {
      setFilters((f) => ({ ...f, dateFrom: '', dateTo: '' }));
      setShowFilters(true);
      return;
    }
    const now = new Date();
    let from = dayKey(now);
    let to = dayKey(now);
    if (preset === 'week') {
      const start = new Date(now);
      start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      from = dayKey(start);
      to = dayKey(end);
    } else if (preset === 'month') {
      from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      to = dayKey(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    }
    setFilters((f) => ({ ...f, dateFrom: from, dateTo: to }));
    runSearch(undefined, { dateFrom: from, dateTo: to });
  };

  const clearDate = () => {
    setDatePreset('');
    setFilters((f) => ({ ...f, dateFrom: '', dateTo: '' }));
    setApplied((f) => ({ ...f, dateFrom: '', dateTo: '' }));
  };

  const clearSearch = () => {
    setSearchInput('');
    setAppliedSearch('');
  };

  const resetFilters = () => {
    setSearchInput('');
    setAppliedSearch('');
    setFilters(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setDatePreset('');
    setBillFilter('all');
    setShowFilters(false);
  };

  const replaceOrder = (updated: OrderRecord) => setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));

  const updateStatus = async (o: OrderRecord, status: string) => {
    const res = await fetch(`/api/orders/${o.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(`Failed to update order status: ${body.error || res.statusText}`);
      return;
    }
    replaceOrder(await res.json());
  };

  const remove = async (o: OrderRecord) => {
    if (!window.confirm(`Are you sure you want to completely delete order ${o.invoiceNo}? This cannot be undone.`)) return;
    const res = await fetch(`/api/orders/${o.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(`Error deleting order: ${body.error || res.statusText}`);
      return;
    }
    setOrders((prev) => prev.filter((x) => x.id !== o.id));
  };

  const startEdit = (o: OrderRecord) => {
    setEditing(o);
    setEditForm({
      customerName: o.customerName || '',
      phone: o.phone || '',
      address: o.address || '',
      remarks: o.remarks || '',
      referenceNumber: o.referenceNumber || '',
      status: normalizeStatus(o.status),
    });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !editForm) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(`Failed to update order: ${body.error || res.statusText}`);
        return;
      }
      replaceOrder(await res.json());
      setEditing(null);
    } catch (err) {
      alert(`Error updating order: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const selectCls =
    'w-full lg:w-32 h-11 appearance-none pl-2.5 pr-6 rounded-xl bg-[#FAF7F2] border border-gray-200 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#C9B79C] cursor-pointer hover:bg-gray-100 transition-colors truncate';
  const filterInput =
    'w-full h-10 px-3 rounded-lg bg-[#FAF7F2] border border-gray-200 text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#C9B79C]';
  const editInput =
    'w-full h-10 px-3 rounded-xl border border-gray-200 text-xs sm:text-[13px] font-semibold text-gray-900 focus:outline-none focus:border-[#C9B79C] focus:ring-1 focus:ring-[#C9B79C]';
  const editLabel = 'text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-1';
  const shown = visible.slice(0, 50);

  return (
    <div className="p-4 md:p-8">
      <div className="space-y-4 sm:space-y-6 rounded-[20px] sm:rounded-[28px] border border-[#DDD2BE]/60 bg-[#FBFAF6] p-3 sm:p-6 lg:p-7 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#10B981]">Billing history</p>
            <h2 className="mt-1 text-xl font-black text-[#111111]">
              Order Management <span className="text-[11px] font-semibold text-[#374151]">(Orders and POS bills)</span>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              title="Refresh orders"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#DDD2BE]/80 bg-white px-3.5 py-2 text-[13px] font-bold text-[#111111] shadow-sm hover:bg-[#FAF7F2] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-[#7A6A4F]' : ''} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={onOpenPos}
              className="inline-flex items-center gap-2 rounded-xl bg-[#111111] px-4 py-2 text-[13px] font-bold text-white shadow-sm hover:bg-[#1F1F1F] cursor-pointer"
            >
              <ShoppingCart size={14} /> Open POS
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-[#DDD2BE]/60 bg-white p-3 sm:p-4 shadow-sm space-y-2.5">
          <form onSubmit={runSearch} className="space-y-2.5">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 min-w-0">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    className="w-full h-11 pl-9 pr-8 rounded-xl bg-[#FAF7F2] border border-gray-200 text-xs sm:text-[13px] font-semibold text-[#111111] placeholder:text-gray-400 focus:outline-none focus:border-[#C9B79C] focus:ring-1 focus:ring-[#C9B79C] transition-all"
                    placeholder="Search by Invoice, Customer, Phone..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      title="Clear"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="h-11 px-3.5 sm:px-4 rounded-xl bg-[#C9B79C] text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 shrink-0 hover:bg-[#A8946F] transition-colors cursor-pointer"
                >
                  <Search size={13} />
                  <span>Search</span>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 shrink-0 w-full lg:w-auto">
                <div className="relative min-w-0">
                  <select value={billFilter} onChange={(e) => setBillFilter(e.target.value as BillType)} className={selectCls}>
                    <option value="all">All Bills</option>
                    <option value="offline">Offline</option>
                    <option value="online">Online</option>
                    <option value="manual">Manual</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
                <div className="relative min-w-0">
                  <select value={datePreset} onChange={(e) => applyPreset(e.target.value as DatePreset)} className={selectCls}>
                    <option value="">All Dates</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="custom">Custom</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowFilters((v) => !v)}
                  title="Toggle detailed filters"
                  className={`w-full lg:w-auto h-11 px-2.5 sm:px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-colors cursor-pointer min-w-0 ${
                    showFilters || activeFilterCount > 0
                      ? 'bg-[#111111] text-white border-[#111111]'
                      : 'bg-[#FAF7F2] text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <SlidersHorizontal size={12} className="shrink-0" />
                  <span className="truncate">Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-[#C9B79C] text-black text-[9px] font-black flex items-center justify-center shrink-0">
                      {activeFilterCount}
                    </span>
                  )}
                  <ChevronDown size={11} className={`transition-transform duration-200 shrink-0 ${showFilters ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="pt-3 pb-1 border-t border-gray-100 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                  <span className="uppercase text-[10px] tracking-wider text-gray-600 flex items-center gap-1">
                    <SlidersHorizontal size={11} /> Detailed Filters
                  </span>
                  {(activeFilterCount > 0 || searchInput) && (
                    <button type="button" onClick={resetFilters} className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer">
                      Reset All Filters
                    </button>
                  )}
                </div>
                {datePreset === 'custom' && (
                  <div className="p-2.5 sm:p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1.5">
                    <span className="text-[11px] font-bold text-amber-900 block">Select Custom Date Range:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(['dateFrom', 'dateTo'] as const).map((key) => (
                        <div key={key}>
                          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">
                            {key === 'dateFrom' ? 'From Date' : 'To Date'}
                          </label>
                          <input
                            type="date"
                            className="w-full h-10 px-3 rounded-lg bg-white border border-gray-300 text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#C9B79C]"
                            value={filters[key]}
                            onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">Invoice / Bill No</label>
                    <input
                      type="text"
                      className={filterInput}
                      placeholder="e.g. SWAG-20261016-0001"
                      value={filters.invoiceNo}
                      onChange={(e) => setFilters((f) => ({ ...f, invoiceNo: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">Customer Name</label>
                    <input
                      type="text"
                      className={filterInput}
                      placeholder="e.g. Priya"
                      value={filters.customerName}
                      onChange={(e) => setFilters((f) => ({ ...f, customerName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">Mobile Number</label>
                    <input
                      type="text"
                      className={filterInput}
                      placeholder="e.g. 9876543210"
                      value={filters.phone}
                      onChange={(e) => setFilters((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}
          </form>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-gray-100 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-gray-600">{visible.length} result(s)</span>
              {billFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-[11px] font-semibold">
                  Type: {billFilter}
                  <button type="button" onClick={() => setBillFilter('all')} className="hover:text-red-600 cursor-pointer">
                    <X size={11} />
                  </button>
                </span>
              )}
              {datePreset && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-semibold">
                  Date:{' '}
                  {datePreset === 'today' ? 'Today' : datePreset === 'week' ? 'This Week' : datePreset === 'month' ? 'This Month' : 'Custom'}
                  <button type="button" onClick={clearDate} className="hover:text-red-600 cursor-pointer">
                    <X size={11} />
                  </button>
                </span>
              )}
              {appliedSearch && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 text-gray-900 border border-gray-200 text-[11px] font-semibold">
                  &quot;{appliedSearch}&quot;
                  <button type="button" onClick={clearSearch} className="hover:text-red-600 cursor-pointer">
                    <X size={11} />
                  </button>
                </span>
              )}
            </div>
            {visible.length > 0 && (
              <button
                type="button"
                onClick={() => exportCsv(visible)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#7A6A4F] hover:text-[#A8946F] transition-colors cursor-pointer"
              >
                <Download size={11} /> Export CSV
              </button>
            )}
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {shown.map((o) => (
              <div key={o.id} className="rounded-2xl border border-[#DDD2BE]/60 bg-[#FBFAF6] p-3 sm:p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-black text-[#111111] break-words">{o.invoiceNo}</p>
                    <p className="text-[13px] text-[#374151]">{new Date(o.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                  <span className="px-2 py-1 rounded-full text-[10px] font-black uppercase bg-orange-50 text-orange-700">OFFLINE</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  {(
                    [
                      ['Customer', o.customerName || '—'],
                      ['Phone', formatPhone(o.phone) || '—'],
                      ['Total', money(o.totalInPaise)],
                      ['Coupon', o.couponCode || (o.manualDiscountPaise > 0 ? 'Manual' : '—')],
                      ['Discount', totalDiscount(o) > 0 ? `-${money(totalDiscount(o))}` : '—'],
                      ['Delivery', o.deliveryChargePaise > 0 ? money(o.deliveryChargePaise) : 'Free'],
                    ] as [string, string][]
                  ).map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <p className="text-[#A8946F] uppercase text-[10px] font-black">{label}</p>
                      <p className="font-semibold text-[#111111] break-words">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <select
                    value={normalizeStatus(o.status)}
                    onChange={(e) => updateStatus(o, e.target.value)}
                    className={`rounded-lg border px-1.5 py-1 text-[10px] font-black outline-none ${
                      normalizeStatus(o.status) === 'completed'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-amber-200 bg-amber-50 text-amber-700'
                    }`}
                  >
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                  </select>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setPreview(o)} title="View Invoice" className="rounded-lg p-1.5 text-[#111111]">
                      <Eye size={15} />
                    </button>
                    <button type="button" onClick={() => window.open(`/invoice/${o.id}`, '_blank')} title="Invoice & Share" className="rounded-lg p-1.5 text-green-600">
                      <MessageCircle size={15} />
                    </button>
                    <button type="button" onClick={() => startEdit(o)} title="Edit Order Details" className="rounded-lg p-1.5 text-[#7A6A4F]">
                      <Pen size={15} />
                    </button>
                    {isAdmin && (
                      <button type="button" onClick={() => remove(o)} title="Delete Order" className="rounded-lg p-1.5 text-[#7A6A4F]">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {visible.length === 0 && <p className="py-8 text-center text-[#374151]">No matching bills</p>}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-[#DDD2BE]/60 bg-[#FBFAF6]">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#FAF7F2] text-[10px] uppercase tracking-wider text-[#374151]">
                <tr>
                  {['Invoice No', 'Customer Name', 'Phone', 'Bill Type', 'Coupon', 'Discount', 'Delivery', 'Total', 'Date', 'Status', 'Actions', 'Details'].map((h) => (
                    <th key={h} className="px-2 py-3 font-black text-center">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD2BE]/30 bg-white">
                {shown.map((o) => {
                  const expanded = expandedId === o.id;
                  const status = normalizeStatus(o.status);
                  return (
                    <React.Fragment key={o.id}>
                      <tr className="hover:bg-[#FAF7F2] text-center">
                        <td className="whitespace-nowrap px-2 py-3 text-[11px] font-bold text-[#111111]">{o.invoiceNo}</td>
                        <td className="max-w-[100px] truncate px-2 py-3 text-[11px] font-semibold text-[#111111]">{o.customerName}</td>
                        <td className="whitespace-nowrap px-2 py-3 text-[11px] text-[#374151]">{formatPhone(o.phone)}</td>
                        <td className="px-2 py-3">
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-orange-50 text-orange-700">OFFLINE</span>
                        </td>
                        <td className="px-2 py-3 text-[11px]">
                          {o.couponCode ? (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">{o.couponCode}</span>
                          ) : o.manualDiscountPaise > 0 ? (
                            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">Manual</span>
                          ) : (
                            <span className="text-[#A8946F]">—</span>
                          )}
                        </td>
                        <td className="px-2 py-3 text-[11px]">
                          {totalDiscount(o) > 0 ? (
                            <span className="font-bold text-emerald-700">-{money(totalDiscount(o))}</span>
                          ) : (
                            <span className="text-[#A8946F]">—</span>
                          )}
                        </td>
                        <td className="px-2 py-3 text-[11px]">
                          {o.deliveryChargePaise > 0 ? (
                            <span className="font-bold text-[#111111]">{money(o.deliveryChargePaise)}</span>
                          ) : (
                            <span className="text-[#A8946F]">Free</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 text-[11px] font-bold text-[#111111]">{money(o.totalInPaise)}</td>
                        <td className="whitespace-nowrap px-2 py-3 text-[11px] text-[#374151]">{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                        <td className="px-2 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <select
                              value={status}
                              onChange={(e) => updateStatus(o, e.target.value)}
                              className={`cursor-pointer rounded-lg border px-1.5 py-1 text-[10px] font-black outline-none ${
                                status === 'completed' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'
                              }`}
                            >
                              <option value="pending">Pending</option>
                              <option value="completed">Completed</option>
                            </select>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => remove(o)}
                                title="Delete Order"
                                className="rounded-lg p-1 text-[#7A6A4F] transition-colors hover:bg-[#C9B79C]/5 cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setPreview(o)}
                              title="View Invoice"
                              className="rounded-lg p-1 text-[#111111] transition-colors hover:bg-[#FAF7F2] cursor-pointer"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => window.open(`/invoice/${o.id}`, '_blank')}
                              title="Invoice & Share"
                              className="rounded-lg p-1.5 text-green-600 transition-colors hover:bg-green-50 cursor-pointer"
                            >
                              <MessageCircle size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => startEdit(o)}
                              title="Edit Order Details"
                              className="rounded-lg p-1 text-[#7A6A4F] transition-colors hover:bg-[#C9B79C]/10 cursor-pointer"
                            >
                              <Pen size={13} />
                            </button>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => setExpandedId(expanded ? null : o.id)}
                            title="View Details"
                            className={`rounded-lg p-1 transition-colors cursor-pointer ${expanded ? 'bg-[#111111] text-white' : 'text-[#374151] hover:bg-[#FAF7F2]'}`}
                          >
                            <ChevronDown size={13} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                          </button>
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="bg-[#FAF7F2] border-b border-[#DDD2BE]/40">
                          <td colSpan={12} className="px-4 py-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-[#DDD2BE]/50 mb-3">
                              <p className="text-[11px] font-black uppercase text-[#10B981] tracking-wider">Order Details &amp; Remarks</p>
                              <button
                                type="button"
                                onClick={() => startEdit(o)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#DDD2BE] text-xs font-bold text-[#111111] hover:bg-gray-50 shadow-sm transition-all cursor-pointer w-fit"
                              >
                                <Pen size={12} className="text-[#7A6A4F]" />
                                <span>Edit Order Details</span>
                              </button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[12px]">
                              {(
                                [
                                  ['Reference No', o.referenceNumber || '—', 'text-[#111111]'],
                                  ['Remarks', o.remarks || '—', 'text-[#374151]'],
                                  ['Customer', o.customerName || '—', 'text-[#111111]'],
                                  ['Address', o.address || '—', 'text-[#374151]'],
                                ] as [string, string, string][]
                              ).map(([label, value, tone]) => (
                                <div key={label}>
                                  <p className="text-[10px] font-black uppercase text-[#A8946F] tracking-wider mb-1">{label}</p>
                                  <p className={`font-semibold break-words ${tone}`}>{value}</p>
                                </div>
                              ))}
                            </div>
                            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-[12px]">
                              {(
                                [
                                  ['Subtotal', money(o.subtotalInPaise)],
                                  ['Coupon', o.couponCode ? `${o.couponCode} (-${money(o.couponDiscountPaise)})` : '—'],
                                  ['Manual Discount', o.manualDiscountPaise > 0 ? `-${money(o.manualDiscountPaise)}` : '—'],
                                  ['Delivery', o.deliveryChargePaise > 0 ? money(o.deliveryChargePaise) : 'Free'],
                                  ['GST', o.totalGstPaise > 0 ? money(o.totalGstPaise) : '—'],
                                  ['Total', money(o.totalInPaise)],
                                ] as [string, string][]
                              ).map(([label, value]) => (
                                <div key={label} className="rounded-lg border border-[#DDD2BE]/60 bg-white px-3 py-2">
                                  <p className="text-[10px] font-black uppercase text-[#A8946F] tracking-wider mb-1">{label}</p>
                                  <p className="font-bold text-[#111111] break-words">{value}</p>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-[#374151]">
                      {loading ? 'Loading...' : 'No matching bills'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {preview && <InvoicePreviewModal order={preview} onClose={() => setPreview(null)} />}

      {editing && editForm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3 sm:p-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Edit Order ${editing.invoiceNo}`}
        >
          <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-100">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-3.5 bg-[#FBFAF6]">
              <div>
                <h3 className="text-base font-black text-[#111111]">Edit Order Details</h3>
                <p className="text-xs font-semibold text-gray-500">{editing.invoiceNo}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                aria-label="Close dialog"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={saveEdit} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className={editLabel}>Customer Name</label>
                  <input
                    type="text"
                    className={editInput}
                    value={editForm.customerName}
                    onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                    placeholder="e.g. Lalith"
                  />
                </div>
                <div>
                  <label className={editLabel}>Phone Number</label>
                  <input
                    type="text"
                    className={editInput}
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className={editLabel}>Reference Number</label>
                  <input
                    type="text"
                    className={editInput}
                    value={editForm.referenceNumber}
                    onChange={(e) => setEditForm({ ...editForm, referenceNumber: e.target.value })}
                    placeholder="e.g. REF-1002"
                  />
                </div>
                <div>
                  <label className={editLabel}>Status</label>
                  <select
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs sm:text-[13px] font-bold text-gray-900 focus:outline-none focus:border-[#C9B79C] bg-white cursor-pointer"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={editLabel}>Delivery Address</label>
                <textarea
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-xs sm:text-[13px] font-semibold text-gray-900 focus:outline-none focus:border-[#C9B79C] focus:ring-1 focus:ring-[#C9B79C]"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  placeholder="Delivery address or location..."
                />
              </div>
              <div>
                <label className={editLabel}>Remarks (Internal Notes)</label>
                <textarea
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-xs sm:text-[13px] font-semibold text-gray-900 focus:outline-none focus:border-[#C9B79C] focus:ring-1 focus:ring-[#C9B79C]"
                  value={editForm.remarks}
                  onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                  placeholder="Optional remarks or customer requests..."
                />
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="h-10 px-4 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 px-5 rounded-xl bg-[#111111] text-xs font-bold text-white hover:bg-black shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
