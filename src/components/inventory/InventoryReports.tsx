'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CircleAlert, Download, PackagePlus, RefreshCw, Search, ShoppingCart, TrendingDown, TrendingUp } from 'lucide-react';
import { MOVEMENT_BADGE, summarizeMovements, type InventorySku, type Movement, type MovementType } from '@/lib/inventory';

type Period = 'all' | 'today' | 'week' | 'month';

const STORE_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Swagyard';

function periodStart(p: Period) {
  const now = new Date();
  if (p === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (p === 'week') return new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  if (p === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  return null;
}

function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = '﻿' + rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function InventoryReports({ skus }: { skus: InventorySku[] }) {
  const [period, setPeriod] = useState<Period>('all');
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | MovementType>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const start = periodStart(period);
      const qs = new URLSearchParams({ limit: '1000' });
      if (start) qs.set('from', start.toISOString());
      const res = await fetch(`/api/inventory/movements?${qs}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load inventory analytics');
      setMovements(body.movements);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory analytics');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => summarizeMovements(movements), [movements]);

  const visible = movements.filter((m) => {
    if (typeFilter !== 'all') {
      const t = m.movementType === 'INITIAL_BARCODE_STOCK' ? 'INTAKE' : m.movementType;
      if (t !== typeFilter) return false;
    }
    const q = search.trim().toLowerCase();
    return !q || m.productName.toLowerCase().includes(q) || (m.variantName || '').toLowerCase().includes(q) || (m.barcode || '').toLowerCase().includes(q) || (m.note || '').toLowerCase().includes(q);
  });

  const exportSnapshot = () => {
    const status = (s: InventorySku) => (s.stock <= 0 ? 'Out of Stock' : s.stock <= s.lowStockThreshold ? 'Low Stock' : 'In Stock');
    downloadCsv(`${STORE_NAME}_Inventory_Snapshot_${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Product ID', 'Product Name', 'Tamil Name', 'Variant ID', 'Variant Name (Size)', 'Category', 'Barcode', 'Current Stock (Units)', 'Purchase Price (INR)', 'Selling Price (INR)', 'Total Valuation Cost (INR)', 'Total Valuation Retail (INR)', 'Stock Status', 'Last Updated'],
      ...skus.map((s) => [
        s.productId,
        s.name,
        s.nameTa || '',
        s.variantId ?? '',
        s.variantName || '',
        s.category || 'General',
        s.barcode || '',
        s.stock,
        s.purchasePrice.toFixed(2),
        s.price.toFixed(2),
        (Math.max(0, s.stock) * s.purchasePrice).toFixed(2),
        (Math.max(0, s.stock) * s.price).toFixed(2),
        status(s),
        s.updatedAt ? new Date(s.updatedAt).toLocaleString() : '',
      ]),
    ]);
  };

  const exportMovements = () => {
    downloadCsv(`${STORE_NAME}_Inventory_Movements_${period}_${Date.now()}.csv`, [
      ['Date & Time', 'Movement Type', 'Product Name', 'Variant', 'Barcode', 'Qty Delta', 'Qty Before', 'Qty After', 'Created By', 'Note'],
      ...visible.map((m) => [new Date(m.createdAt).toLocaleString(), m.movementType, m.productName, m.variantName || '', m.barcode || '', m.quantityDelta, m.quantityBefore, m.quantityAfter, m.createdByName, m.note || '']),
    ]);
  };

  const card = (label: string, value: React.ReactNode, icon: React.ReactNode, tone: string, valueCls: string) => (
    <div className="bg-white border border-[#DDD2BE] rounded-2xl p-4 shadow-sm flex items-center gap-3">
      <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${tone}`}>{icon}</div>
      <div>
        <div className="text-[10px] font-black uppercase tracking-wider text-gray-500">{label}</div>
        <div className={`text-xl font-black ${valueCls}`}>{value}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#DDD2BE] rounded-2xl p-3 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-50 border border-slate-200 rounded-xl self-start">
          {(['all', 'today', 'week', 'month'] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-3.5 py-2 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${period === p ? 'bg-[#111111] text-[#C9B79C] shadow-sm' : 'text-gray-600 hover:text-[#111111]'}`}
            >
              {p === 'all' ? 'All Time' : p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={load} title="Refresh" className="w-9 h-9 rounded-xl border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 cursor-pointer">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={exportSnapshot}
            title="Export complete current stock snapshot with valuations"
            className="px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-black flex items-center gap-1.5 hover:bg-emerald-100 cursor-pointer"
          >
            <Download size={13} /> Export Snapshot CSV
          </button>
          <button
            type="button"
            onClick={exportMovements}
            title="Export audit movements log"
            className="px-3.5 py-2 rounded-xl bg-[#111111] text-white text-xs font-black flex items-center gap-1.5 hover:bg-[#262626] cursor-pointer"
          >
            <Download size={13} /> Export Movements CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl border bg-rose-50 border-rose-200 text-rose-800 text-xs font-bold">
          <CircleAlert size={15} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {card('Incoming Stock', `+${stats.incomingStock} Units`, <PackagePlus size={20} />, 'bg-emerald-50 text-emerald-700 border-emerald-200', 'text-emerald-700')}
        {card('Units Sold (POS)', `${stats.unitsSold} Units`, <ShoppingCart size={20} />, 'bg-[#FAF7F2] text-[#111111] border-[#DDD2BE]', 'text-[#111111]')}
        {card('Lost / Damaged', `${stats.unitsDamaged} Units`, <CircleAlert size={20} />, 'bg-red-50 text-red-700 border-red-200', 'text-red-700')}
        {card(
          'Net Stock Delta',
          `${stats.netDelta > 0 ? `+${stats.netDelta}` : stats.netDelta} Units`,
          stats.netDelta >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />,
          'bg-[#FAF7F2] text-[#111111] border-[#DDD2BE]',
          stats.netDelta >= 0 ? 'text-[#111111]' : 'text-amber-700'
        )}
      </div>

      <div className="bg-white border border-[#DDD2BE] rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 bg-[#FBFAF6] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h4 className="text-xs font-black uppercase tracking-wide text-[#111111]">Movement Audit Ledger ({visible.length})</h4>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                placeholder="Search SKU or reason..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-52 h-9 pl-8 pr-3 rounded-xl border border-gray-300 bg-white text-xs font-semibold outline-none focus:border-[#111111]"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | MovementType)}
              className="h-9 px-3 rounded-xl border border-gray-300 bg-white text-xs font-bold outline-none"
            >
              <option value="all">All Types</option>
              <option value="INTAKE">Intake</option>
              <option value="RESTOCK">Restock</option>
              <option value="SALE">Sale</option>
              <option value="RETURN">Return</option>
              <option value="DAMAGE">Damage</option>
              <option value="CORRECTION">Correction</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-gray-600 border-b border-gray-100">
              <tr>
                {['Date & Time', 'Type', 'Product / Variant', 'Barcode', 'Qty Delta', 'Before → After', 'User', 'Notes'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-black">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400 font-bold">
                    {loading ? 'Loading...' : 'No stock movements recorded for the selected period.'}
                  </td>
                </tr>
              ) : (
                visible.map((m) => {
                  const badge = MOVEMENT_BADGE[m.movementType];
                  return (
                    <tr key={m.id} className="hover:bg-[#FBFAF6] transition-colors">
                      <td className="px-4 py-3 font-mono text-gray-500 whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${badge.cls}`}>{badge.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-black text-gray-900">{m.productName}</div>
                        {m.variantName && <div className="text-[10px] text-gray-500">Size / Variant: {m.variantName}</div>}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-700">{m.barcode || '—'}</td>
                      <td className={`px-4 py-3 font-black ${m.quantityDelta > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        <span className="font-mono">{m.quantityBefore}</span> → <strong className="text-gray-900">{m.quantityAfter}</strong>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{m.createdByName || 'Admin'}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-[220px] truncate">{m.note || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
