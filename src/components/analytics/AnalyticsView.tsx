'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Banknote,
  Box,
  CreditCard,
  Download,
  Eye,
  FileText,
  LayoutDashboard,
  Package,
  Percent,
  QrCode,
  Receipt,
  RefreshCw,
  ShoppingCart,
  Ticket,
  TrendingDown,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { computeAnalytics, dayKey, type AnalyticsOrder } from '@/lib/pos-analytics';
import { exportAnalyticsCsv, exportAnalyticsPdf, type AnalyticsTab } from '@/lib/analytics-export';
import { InvoicePreviewModal, type PreviewOrder } from '@/components/invoice/InvoicePreviewModal';

type Preset = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

const money = (n: number) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Square ₹ badge icon used on revenue cards. */
const RupeeIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="4" />
    <text x="12" y="16" textAnchor="middle" fontSize="9" fontWeight="bold" stroke="none" fill="currentColor" fontFamily="Arial, sans-serif">
      ₹
    </text>
  </svg>
);

const CARD = 'bg-white rounded-card border border-borderLight p-6 shadow-soft';
const PANEL = 'bg-white rounded-2xl border border-[#DDD2BE]/30 p-5 shadow-sm';
const SEARCH =
  'w-full px-4 py-2.5 bg-[#FAF7F2] border border-[#DDD2BE]/60 rounded-xl text-[13px] font-bold text-[#111111] placeholder:text-[#A8946F] focus:outline-none focus:border-[#C9B79C] transition-colors';

function GradientCards({ cards, cols }: { cards: { label: string; value: string; icon: React.ReactNode; from: string }[]; cols: string }) {
  return (
    <div className={`grid gap-4 ${cols}`}>
      {cards.map((c) => (
        <div
          key={c.label}
          className={`relative overflow-hidden rounded-2xl p-5 shadow-lg border border-white/20 bg-gradient-to-br ${c.from} flex flex-col justify-between min-h-[120px]`}
        >
          <div className="absolute inset-0 bg-gradient-to-tl from-white/30 via-white/10 to-transparent" />
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[10px] uppercase font-black text-white/80 tracking-wider">{c.label}</p>
              <div className="w-9 h-9 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center text-white shadow-sm shrink-0">
                {c.icon}
              </div>
            </div>
            <p className="text-[18px] sm:text-[22px] font-extrabold text-white drop-shadow-sm break-words leading-tight">{c.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsView(_props: { lang?: 'en' | 'ta' }) {
  const [tab, setTab] = useState<AnalyticsTab>('revenue');
  const [preset, setPreset] = useState<Preset>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [orders, setOrders] = useState<(AnalyticsOrder & PreviewOrder)[]>([]);
  const [expenses, setExpenses] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [products, setProducts] = useState([]);
  const [billSearch, setBillSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [preview, setPreview] = useState<PreviewOrder | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const load = useCallback(async () => {
    const get = async (url: string) => {
      const res = await fetch(url);
      return res.ok ? res.json() : null;
    };
    const [o, e, c, p] = await Promise.all([get('/api/orders?preset=all'), get('/api/expenses'), get('/api/coupons'), get('/api/inventory')]);
    setOrders(o?.orders || []);
    setExpenses(e?.expenses || []);
    setCoupons(c || []);
    setProducts(p || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const z = useMemo(() => computeAnalytics(orders, expenses, coupons, products, dateFrom, dateTo), [orders, expenses, coupons, products, dateFrom, dateTo]);

  const applyPreset = (p: Preset) => {
    setPreset(p);
    if (p === 'all') {
      setDateFrom('');
      setDateTo('');
      return;
    }
    const now = new Date();
    const today = dayKey(now);
    if (p === 'today') {
      setDateFrom(today);
      setDateTo(today);
    } else if (p === 'week') {
      const start = new Date(now);
      start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      setDateFrom(dayKey(start));
      setDateTo(dayKey(end));
    } else if (p === 'month') {
      setDateFrom(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
      setDateTo(dayKey(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
    } else if (p === 'year') {
      setDateFrom(`${now.getFullYear()}-01-01`);
      setDateTo(`${now.getFullYear()}-12-31`);
    }
  };

  const weekNumber = (() => {
    const t = new Date();
    const start = new Date(t.getFullYear(), 0, 1);
    const days = Math.floor((t.getTime() - start.getTime()) / 864e5);
    return Math.ceil((days + start.getDay() + 1) / 7);
  })();

  const revenueCards = [
    { label: 'Total Revenue', helper: 'POS + manual sales combined', value: money(z.totalCompletedRevenue), icon: <RupeeIcon size={16} />, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    {
      label: z.isProfitable ? 'Net Profit' : 'Net Loss',
      helper: `Revenue (${money(z.totalCompletedRevenue)}) − Expenses (${money(z.totalExpenses)})`,
      value: money(Math.abs(z.netProfit)),
      icon: z.isProfitable ? <TrendingUp size={16} /> : <TrendingDown size={16} />,
      color: z.isProfitable ? 'text-emerald-600' : 'text-rose-600',
      bg: z.isProfitable ? 'bg-emerald-50' : 'bg-rose-50',
      valueColor: z.isProfitable ? 'text-emerald-600' : 'text-rose-600',
      arrow: z.isProfitable ? '↑' : '↓',
    },
    { label: 'Total Expenses', helper: 'Overheads from expense tracker', value: money(z.totalExpenses), icon: <Receipt size={16} />, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Completed Bills', helper: 'POS + manual bills', value: String(z.completedOrders), icon: <Trophy size={16} />, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Offline Revenue', helper: 'Walk-in POS sales', value: money(z.posRevenue), icon: <RupeeIcon size={16} />, color: 'text-gray-500', bg: 'bg-gray-50' },
    { label: 'Total Offline Bills', helper: 'Walk-in POS orders', value: String(z.offlineOrderCount), icon: <LayoutDashboard size={16} />, color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Total Online Bills', helper: 'Live completed online bills', value: String(z.onlineBillCount), icon: <Box size={16} />, color: 'text-gray-500', bg: 'bg-gray-50' },
    { label: 'Total Items Sold', helper: 'From completed bills', value: String(Math.round(z.totalProductsSold)), icon: <Box size={16} />, color: 'text-gray-500', bg: 'bg-gray-50' },
    { label: 'Average Revenue Per Bill', helper: 'Average per bill', value: money(z.averageRevenuePerBill), icon: <RupeeIcon size={16} />, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Cash Collected', helper: 'Cash incl. split payments', value: money(z.cashCollected), icon: <Banknote size={16} />, color: 'text-[#7A6A4F]', bg: 'bg-[#F1EBE0]' },
    { label: 'QR Collected', helper: 'QR / UPI incl. split payments', value: money(z.qrCollected), icon: <QrCode size={16} />, color: 'text-[#7A6A4F]', bg: 'bg-[#F1EBE0]' },
    { label: 'Card Collected', helper: 'Card incl. split payments', value: money(z.cardCollected), icon: <CreditCard size={16} />, color: 'text-[#7A6A4F]', bg: 'bg-[#F1EBE0]' },
    ...(z.otherCollected > 0
      ? [{ label: 'Other / Online Collected', helper: 'Online or unspecified payment mode', value: money(z.otherCollected), icon: <RupeeIcon size={16} />, color: 'text-gray-500', bg: 'bg-gray-50' }]
      : []),
    { label: 'Top Product', helper: 'Most sold item', value: z.bestProduct || 'No sales yet', icon: <Trophy size={16} />, color: 'text-gray-500', bg: 'bg-gray-50' },
  ] as { label: string; helper: string; value: string; icon: React.ReactNode; color: string; bg: string; valueColor?: string; arrow?: string }[];

  const todayBills = z.todayBills.filter((b) => !billSearch || b.invoiceNo.toLowerCase().includes(billSearch.toLowerCase()));
  const productRows = z.topProducts.filter((p) => {
    const q = productSearch.trim().toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || (p.variant && p.variant.toLowerCase().includes(q));
  });

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-[24px] font-black text-[#111111] tracking-tight">POS Analytics</h2>
          <p className="text-[13px] text-[#6B7280]">Real time store &amp; channel intelligence</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => exportAnalyticsCsv(z, tab, preset, dateFrom, dateTo)}
            title="Export current analytics view to CSV"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#DDD2BE] text-[#111111] font-bold text-xs hover:bg-[#FBFAF6] transition-all cursor-pointer hover:scale-[1.02]"
          >
            <Download size={14} className="text-[#7A6A4F]" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            disabled={exportingPdf}
            onClick={() => {
              setExportingPdf(true);
              try {
                exportAnalyticsPdf(z, tab, preset, dateFrom, dateTo);
              } finally {
                setExportingPdf(false);
              }
            }}
            title="Export formatted executive PDF with chart diagrams"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111111] border border-[#C9B79C]/60 text-[#C9B79C] font-black text-xs hover:bg-[#262626] shadow-md transition-all cursor-pointer hover:scale-[1.02] disabled:opacity-60"
          >
            {exportingPdf ? <RefreshCw size={14} className="animate-spin text-[#7A6A4F]" /> : <FileText size={14} className="text-[#7A6A4F]" />}
            <span>{exportingPdf ? 'Generating PDF...' : 'Export PDF (Charts)'}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-b border-[#E7E7E7] pb-4 md:flex-row md:items-center md:justify-between">
        <div className="inline-flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#F1EBE0] border border-gray-200/80 overflow-x-auto max-w-full">
          {(
            [
              { id: 'revenue', label: 'Revenue', icon: <TrendingUp size={15} className="shrink-0" /> },
              { id: 'today', label: "Today's Sales", icon: <Receipt size={15} className="shrink-0" /> },
              { id: 'products', label: 'Products', icon: <Package size={15} className="shrink-0" /> },
              { id: 'coupons', label: 'Coupons', icon: <Ticket size={15} className="shrink-0" /> },
            ] as { id: AnalyticsTab; label: string; icon: React.ReactNode }[]
          ).map((t) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-[13px] font-black tracking-wide transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  on ? 'bg-white text-[#111111] shadow-sm' : 'text-[#6B7280] hover:text-[#111111] hover:bg-white/60'
                }`}
              >
                <span className={on ? 'text-[#111111]' : 'text-gray-400'}>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {tab !== 'today' && (
          <div className="flex flex-col gap-3 md:items-end">
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-[#F8F8F8] p-2">
              <span className="text-[10px] font-bold uppercase text-[#6B7280] ml-1 mr-1">Period:</span>
              {(['all', 'today', 'week', 'month', 'year'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase transition-all cursor-pointer ${
                    preset === p ? 'bg-[#111111] text-[#C9B79C] shadow-sm' : 'text-[#6B7280] hover:text-[#111111]'
                  }`}
                >
                  {p === 'all' ? 'All Time' : p === 'today' ? 'Today' : p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'This Year'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 w-full">
              {(
                [
                  ['From:', dateFrom, setDateFrom],
                  ['To:', dateTo, setDateTo],
                ] as [string, string, (v: string) => void][]
              ).map(([label, value, set]) => (
                <div key={label} className="flex items-center border border-[#E7E7E7] rounded-xl px-3 py-2 bg-white min-w-0">
                  <span className="text-[10px] uppercase font-bold text-[#6B7280] mr-2">{label}</span>
                  <input
                    type="date"
                    value={value}
                    onChange={(e) => {
                      set(e.target.value);
                      setPreset('custom');
                    }}
                    className="w-full min-w-0 text-[12px] font-semibold text-[#111111] bg-transparent outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {tab === 'revenue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {revenueCards.map((c) => (
              <div key={c.label} className="bg-white rounded-card border border-borderLight p-5 shadow-soft flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <p className="text-[11px] font-bold text-[#111111]">{c.label}</p>
                    <div className={`w-8 h-8 rounded-full ${c.bg} flex items-center justify-center ${c.color} shrink-0`}>{c.icon}</div>
                  </div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <p className={`text-[22px] sm:text-[24px] font-bold leading-tight ${c.valueColor || 'text-[#111111]'}`}>{c.value}</p>
                    {c.arrow && <span className={`inline-flex items-center text-xs font-black px-1.5 py-0.5 rounded-md ${c.bg} ${c.color}`}>{c.arrow}</span>}
                  </div>
                </div>
                <p className="text-[12px] text-[#6B7280] leading-snug" title={c.helper}>
                  {c.helper}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className={`xl:col-span-2 ${CARD}`}>
              <div className="flex items-center justify-between gap-4 mb-4">
                <h3 className="text-[16px] font-bold text-[#111111]">Revenue Trend {z.chartYear}</h3>
                <span className="text-[12px] font-bold text-[#111111] bg-red-50 px-2.5 py-1 rounded-md">Avg {money(z.monthlyRevenue || 0)}/mo</span>
              </div>
              <div className="h-[192px] w-full min-w-0 relative">
                <ResponsiveContainer width="100%" height={192}>
                  <BarChart data={z.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1EBE0" />
                    <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} interval={0} angle={-45} textAnchor="end" height={60} />
                    <YAxis hide />
                    <Tooltip cursor={{ fill: '#FAF7F2' }} formatter={(v: number) => money(v)} />
                    <Bar dataKey="revenue" fill="#C9B79C" radius={[4, 4, 0, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="space-y-6">
              <div className={CARD}>
                <h3 className="text-[16px] font-bold text-[#111111] mb-6">Order Source</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[12px] font-bold mb-2">
                      <span className="text-[#111111] uppercase">Offline</span>
                      <span className="text-[#111111]">{z.completedOrders}</span>
                    </div>
                    <div className="w-full bg-[#F1EBE0] rounded-full h-2.5">
                      <div className="bg-[#111111] h-2.5 rounded-full" style={{ width: '100%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[12px] font-bold mb-2">
                      <span className="text-[#6B7280] uppercase">Online</span>
                      <span className="text-[#111111]">0</span>
                    </div>
                    <div className="w-full bg-[#F1EBE0] rounded-full h-2.5">
                      <div className="bg-[#F1EBE0] h-2.5 rounded-full" style={{ width: '0%' }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className={CARD}>
                <h3 className="text-[16px] font-bold text-[#111111] mb-4">Top Items by Revenue</h3>
                <div className="space-y-3">
                  {z.topProducts.slice(0, 3).map((p, i) => (
                    <div key={`${p.name}-${i}`} className="flex items-center justify-between gap-3 text-[13px]">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="font-bold text-[#6B7280] w-4 shrink-0">{i + 1}</span>
                        <span className="font-bold text-[#111111] break-words whitespace-normal leading-snug min-w-0 flex-1">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="font-bold text-[#111111]">{money(p.revenue)}</span>
                        <span className="text-[#6B7280] text-[11px] w-8 text-right">{Math.round(p.qty)} pcs</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className={`xl:col-span-2 ${CARD}`}>
              <div className="flex items-center justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-[16px] font-bold text-[#111111]">Revenue Trend This Week</h3>
                  <p className="mt-1 text-[12px] text-[#6B7280]">Monday to Sunday sales view for the current week.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#FAF7F2] px-3 py-1 text-[11px] font-bold text-[#7A6A4F]">
                    Week {weekNumber} of {new Date().getFullYear()}
                  </span>
                  <span className="rounded-full bg-[#FAF7F2] px-3 py-1 text-[11px] font-bold text-[#7A6A4F]">Today: {money(z.todaySales)}</span>
                </div>
              </div>
              <div className="h-[256px] w-full min-w-0 relative">
                <ResponsiveContainer width="100%" height={256}>
                  <BarChart data={z.weeklySales}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1EBE0" />
                    <XAxis dataKey="day" tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      cursor={{ fill: '#FAF7F2' }}
                      formatter={(v: number) => money(v)}
                      labelFormatter={(_l, payload) => {
                        const d = payload?.[0]?.payload;
                        return d ? `${d.day || 'Day'} - ${d.date || ''}` : 'Weekly Revenue';
                      }}
                    />
                    <Bar dataKey="revenue" fill="#111111" radius={[4, 4, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className={CARD}>
              <h3 className="text-[16px] font-bold text-[#111111] mb-4">Top Products This Week</h3>
              <div className="space-y-3">
                {z.topProducts.slice(0, 5).map((p, i) => (
                  <div key={`${p.name}-${i}`} className="flex items-center justify-between rounded-xl bg-[#FAF7F2] p-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-[#111111]">{p.name}</p>
                      <p className="text-[11px] text-[#6B7280]">{p.billCount} bills</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-black text-[#111111]">{Math.round(p.qty)}</p>
                      <p className="text-[11px] font-bold text-[#10B981]">{money(p.revenue)}</p>
                    </div>
                  </div>
                ))}
                {z.topProducts.length === 0 && <p className="text-[13px] text-[#6B7280]">No completed product sales yet.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'today' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "TODAY'S REVENUE", value: money(z.todaySales), icon: <RupeeIcon size={20} className="text-emerald-700" />, bg: 'bg-emerald-50', border: 'border-emerald-100' },
              { label: 'COMPLETED ORDERS', value: String(z.todayCompletedOrdersCount), icon: <ShoppingCart size={20} className="text-gray-700" />, bg: 'bg-gray-50', border: 'border-gray-100' },
              { label: 'ITEMS SOLD', value: String(Math.round(z.todayItemsSold)), icon: <Package size={20} className="text-gray-700" />, bg: 'bg-gray-50', border: 'border-gray-100' },
              { label: 'AVG ORDER VALUE', value: money(z.todayAvgOrderValue), icon: <Trophy size={20} className="text-amber-700" />, bg: 'bg-amber-50', border: 'border-amber-100' },
            ].map((c) => (
              <div key={c.label} className="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">{c.label}</p>
                  <p className="text-[22px] sm:text-[24px] font-black text-[#111111] leading-tight truncate">{c.value}</p>
                </div>
                <div className={`w-11 h-11 rounded-2xl ${c.bg} border ${c.border} flex items-center justify-center shrink-0`}>{c.icon}</div>
              </div>
            ))}
          </div>

          <div className={PANEL}>
            <h3 className="text-[15px] font-bold text-[#111111] mb-4">Top Products Today</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {z.todayTopProducts.map((p) => (
                <div key={p.name} className="flex items-center justify-between bg-[#FAF7F2] p-3 rounded-xl border border-gray-100">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-[#111111] truncate">{p.name}</p>
                    <p className="text-[11px] text-[#374151]">{Math.round(p.qty)} sold</p>
                  </div>
                  <p className="text-[13px] font-black text-[#10B981] ml-2">{money(p.revenue)}</p>
                </div>
              ))}
              {z.todayTopProducts.length === 0 && <p className="col-span-full text-center text-[13px] text-[#374151] py-6">No products sold yet today.</p>}
            </div>
          </div>

          <div className={PANEL}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[15px] font-bold text-[#111111]">Today&apos;s Bills</h3>
              <span className="text-[11px] font-bold text-[#10B981]">{z.todayCompletedOrdersCount} orders</span>
            </div>
            <div className="mb-3">
              <input type="text" placeholder="Search by invoice number..." value={billSearch} onChange={(e) => setBillSearch(e.target.value)} className={SEARCH} />
            </div>
            {todayBills.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-[#DDD2BE]/30">
                <table className="w-full min-w-[480px] text-[12px]">
                  <thead className="bg-[#FAF7F2] text-[10px] uppercase tracking-wider text-[#374151]">
                    <tr>
                      {['Invoice', 'Customer', 'Total', 'Time', 'Type', 'Actions'].map((h) => (
                        <th key={h} className="px-3 py-2.5 font-black text-left">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDD2BE]/20">
                    {todayBills.map((b) => (
                      <tr key={b.id} className="hover:bg-[#FAF7F2]/50">
                        <td className="px-3 py-2.5 font-bold text-[#10B981] text-[11px]">{b.invoiceNo}</td>
                        <td className="px-3 py-2.5 font-semibold text-[#111111] max-w-[100px] truncate">{b.customerName}</td>
                        <td className="px-3 py-2.5 font-black text-[#111111]">{money(b.totalInPaise / 100)}</td>
                        <td className="px-3 py-2.5 text-[#374151] whitespace-nowrap">
                          {new Date(b.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-700">OFFLINE</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            type="button"
                            onClick={() => setPreview(b as unknown as PreviewOrder)}
                            title="View Invoice"
                            className="inline-flex items-center gap-1 rounded-lg border border-[#DDD2BE]/60 px-2 py-1.5 text-[11px] font-black text-[#111111] hover:bg-[#FAF7F2]"
                          >
                            <Eye size={13} /> View Invoice
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[13px] text-[#374151] text-center py-4">{billSearch ? 'No bills match your search.' : 'No bills yet today.'}</p>
            )}
          </div>
        </div>
      )}

      {tab === 'products' && (
        <div className="space-y-6">
          <GradientCards
            cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
            cards={[
              { label: 'Total Product Revenue', value: money(z.totalCompletedRevenue), icon: <RupeeIcon size={18} />, from: 'from-emerald-500 to-gray-600' },
              { label: 'Total Products Sold', value: String(Math.round(z.totalProductsSold)), icon: <Package size={18} />, from: 'from-gray-500 to-gray-600' },
              { label: 'Average Product Revenue', value: money(z.averageProductRevenue), icon: <RupeeIcon size={18} />, from: 'from-gray-500 to-gray-600' },
              {
                label: 'Total Product Profit',
                value: money(z.totalProductProfit),
                icon: <TrendingUp size={18} />,
                from: z.totalProductProfit >= 0 ? 'from-emerald-500 to-gray-600' : 'from-rose-500 to-red-600',
              },
              { label: 'Profit Margin', value: `${z.overallProfitMargin.toFixed(1)}%`, icon: <Percent size={18} />, from: 'from-gray-500 to-gray-600' },
              { label: 'Top Product', value: z.bestProduct || 'No sales yet', icon: <Trophy size={18} />, from: 'from-amber-500 to-orange-600' },
            ]}
          />
          <div className={PANEL}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-[15px] font-bold text-[#111111]">All Products Analytics</h3>
                <p className="text-[12px] text-[#6B7280]">Search by Product Name, SKU, or Category for instant statistics</p>
              </div>
              <span className="text-[11px] font-bold text-[#10B981] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
                {z.topProducts.length} products
              </span>
            </div>
            <p className="mb-3 text-[11px] font-semibold text-[#6B7280]">
              Profit = Revenue − (Cost price × Qty sold), using each product&apos;s current cost price.
              {z.productsWithoutCost > 0
                ? ` ${z.productsWithoutCost} product${z.productsWithoutCost === 1 ? '' : 's'} without a cost price (or manual items) show "—" and are left out of the profit totals.`
                : ''}
            </p>
            <div className="mb-4">
              <input type="text" placeholder="Search by Product Name, SKU, or Category..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className={SEARCH} />
            </div>
            {productRows.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-[#DDD2BE]/30">
                <table className="w-full min-w-[760px] text-left text-[12px]">
                  <thead className="bg-[#FAF7F2] text-[10px] uppercase tracking-wider text-[#374151]">
                    <tr>
                      {['#', 'Product', 'Variant / SKU', 'Qty Sold', 'Revenue', 'Cost', 'Profit', 'Margin', 'Bills', 'Avg Revenue/Bill'].map((h) => (
                        <th key={h} className="px-4 py-2.5 font-black">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDD2BE]/20">
                    {productRows.slice(0, 50).map((p, i) => (
                      <tr key={`${p.name}-${p.variant || i}`} className="hover:bg-[#FAF7F2]/50">
                        <td className="px-4 py-2 text-[11px] text-[#A8946F] font-bold">{i + 1}</td>
                        <td className="px-4 py-2 font-bold text-[#111111]">{p.name}</td>
                        <td className="px-4 py-2 text-[#374151]">{p.variant || '-'}</td>
                        <td className="px-4 py-2 font-bold">{Math.round(p.qty)}</td>
                        <td className="px-4 py-2 font-bold text-emerald-700">{money(p.revenue)}</td>
                        <td className="px-4 py-2 text-[#374151]">{p.hasCost ? money(p.cost) : '—'}</td>
                        <td className={`px-4 py-2 font-bold ${p.hasCost ? (p.profit >= 0 ? 'text-emerald-700' : 'text-rose-600') : 'text-[#A8946F]'}`}>
                          {p.hasCost ? money(p.profit) : '—'}
                        </td>
                        <td className="px-4 py-2 text-[#374151]">{p.hasCost ? `${p.margin.toFixed(1)}%` : '—'}</td>
                        <td className="px-4 py-2 text-[#374151]">{p.billCount}</td>
                        <td className="px-4 py-2 font-bold text-[#111111]">{money(p.billCount > 0 ? p.revenue / p.billCount : 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-[13px] text-[#374151] py-6">
                {productSearch ? 'No products match your search query.' : 'No product sales in selected period'}
              </p>
            )}
          </div>
        </div>
      )}

      {tab === 'coupons' && (
        <div className="space-y-6">
          <GradientCards
            cols="grid-cols-2 sm:grid-cols-4"
            cards={[
              { label: 'Coupons Used', value: String(z.totalCouponOrders), icon: <ShoppingCart size={18} />, from: 'from-emerald-500 to-gray-600' },
              { label: 'Total Discounts Given', value: money(z.totalCouponDiscounts), icon: <RupeeIcon size={18} />, from: 'from-gray-500 to-gray-600' },
              { label: 'Usage Rate', value: `${z.couponUsageRate.toFixed(1)}%`, icon: <TrendingUp size={18} />, from: 'from-gray-500 to-gray-600' },
              { label: 'Unique Coupons', value: String(z.topCoupons.length), icon: <Trophy size={18} />, from: 'from-amber-500 to-orange-600' },
            ]}
          />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className={`xl:col-span-2 ${PANEL}`}>
              <h3 className="text-[15px] font-bold text-[#111111] mb-4">Coupon Usage (Last 7 Days)</h3>
              {z.couponDailyTrend.some((d) => d.orders > 0) ? (
                <div className="h-[256px] w-full min-w-0 relative">
                  <ResponsiveContainer width="100%" height={256}>
                    <BarChart data={z.couponDailyTrend}>
                      <defs>
                        <linearGradient id="couponGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#111111" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1EBE0" />
                      <XAxis dataKey="day" tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip cursor={{ fill: '#FAF7F2' }} formatter={(v: number, name: string) => [v, name === 'orders' ? 'Orders' : 'Discounts']} />
                      <Bar dataKey="orders" fill="url(#couponGrad)" radius={[4, 4, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center text-[13px] text-[#374151] py-12">No coupon usage in the last 7 days.</p>
              )}
            </div>
            <div className={PANEL}>
              <h3 className="text-[15px] font-bold text-[#111111] mb-4">Top Coupons</h3>
              <div className="space-y-3">
                {z.topCoupons.slice(0, 8).map((c, i) => (
                  <div key={c.code} className="flex items-center justify-between gap-2 p-3 bg-[#FAF7F2] rounded-xl">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-[#A8946F]">{i + 1}</span>
                        <p className="text-[13px] font-bold text-[#111111] truncate font-mono">{c.code}</p>
                        {c.percentage ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">{c.percentage}% OFF</span>
                        ) : null}
                        {c.isActive === false && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Inactive</span>}
                      </div>
                      <p className="text-[11px] text-[#374151] ml-5">
                        {c.usage} order{c.usage !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[13px] font-black text-emerald-700">{money(c.discounts)}</p>
                      <p className="text-[10px] text-[#374151]">discounted</p>
                    </div>
                  </div>
                ))}
                {z.topCoupons.length === 0 && <p className="text-center text-[13px] text-[#374151] py-6">No coupons created or used yet</p>}
              </div>
            </div>
          </div>
          <div className={PANEL}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-bold text-[#111111]">All Coupons Performance</h3>
              <span className="text-[11px] font-bold text-[#10B981]">{z.topCoupons.length} coupons</span>
            </div>
            {z.topCoupons.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-[#DDD2BE]/30">
                <table className="w-full min-w-[500px] text-left text-[12px]">
                  <thead className="bg-[#FAF7F2] text-[10px] uppercase tracking-wider text-[#374151]">
                    <tr>
                      {['#', 'Code', 'Discount Rate', 'Orders Used', 'Total Discount', 'Avg Discount'].map((h) => (
                        <th key={h} className="px-4 py-2.5 font-black">
                          {h}
                        </th>
                      ))}
                      <th className="px-4 py-2.5 font-black text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDD2BE]/20">
                    {z.topCoupons.map((c, i) => (
                      <tr key={c.code} className="hover:bg-[#FAF7F2]/50">
                        <td className="px-4 py-2 text-[11px] text-[#A8946F] font-bold">{i + 1}</td>
                        <td className="px-4 py-2 font-bold text-[#111111] font-mono">{c.code}</td>
                        <td className="px-4 py-2 font-bold text-amber-800">{c.percentage ? `${c.percentage}%` : '-'}</td>
                        <td className="px-4 py-2 font-bold">{c.usage}</td>
                        <td className="px-4 py-2 font-bold text-emerald-700">{money(c.discounts)}</td>
                        <td className="px-4 py-2 text-[#374151]">{c.usage > 0 ? money(c.discounts / c.usage) : '-'}</td>
                        <td className="px-4 py-2 text-right">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${
                              c.isActive === false ? 'bg-gray-100 text-gray-500' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {c.isActive === false ? 'Inactive' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-[13px] text-[#374151] py-8">
                No coupons configured in store yet. Add coupons from the Coupons tab to track performance.
              </p>
            )}
          </div>
        </div>
      )}

      {preview && <InvoicePreviewModal order={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
