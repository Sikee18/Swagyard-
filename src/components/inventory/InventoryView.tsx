'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, ChartColumn, History, Layers, Package, Pen, Printer, RefreshCw, Search, SlidersHorizontal, Tag, Trash2, TriangleAlert } from 'lucide-react';
import { toSkus, type InventorySku } from '@/lib/inventory';
import { StockAdjustModal } from './StockAdjustModal';
import { StockHistoryModal } from './StockHistoryModal';
import { QuickPriceModal } from './QuickPriceModal';
import { PrintLabelsModal } from './PrintLabelsModal';
import { BarcodeGeneratorModal } from './BarcodeGeneratorModal';
import { ProductEditor } from './ProductEditor';
import { CategoriesPanel } from './CategoriesPanel';
import { InventoryReports } from './InventoryReports';
import { useIsAdmin } from '@/components/layout/RoleContext';

type SubTab = 'stock' | 'products' | 'categories' | 'analytics';
type StockFilter = 'all' | 'in_stock' | 'low' | 'out';

const money = (n: number) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function InventoryView(_props: { lang?: 'en' | 'ta' }) {
  const isAdmin = useIsAdmin();
  const [tab, setTab] = useState<SubTab>('stock');
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ id: number; nameEn: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StockFilter>('all');
  const [editProductId, setEditProductId] = useState<number | null>(null);
  const [adjusting, setAdjusting] = useState<InventorySku | null>(null);
  const [history, setHistory] = useState<InventorySku | null>(null);
  const [pricing, setPricing] = useState<InventorySku | null>(null);
  const [printing, setPrinting] = useState<InventorySku | null>(null);
  const [generator, setGenerator] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([fetch('/api/inventory'), fetch('/api/categories')]);
      if (p.ok) setProducts(await p.json());
      if (c.ok) setCategories(await c.json());
    } catch (err) {
      console.error('Failed to load inventory items:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const skus = useMemo(() => toSkus(products), [products]);
  const isLow = (s: InventorySku) => s.stock > 0 && s.stock <= s.lowStockThreshold;
  const stats = {
    total: skus.length,
    units: skus.reduce((n, s) => n + s.stock, 0),
    out: skus.filter((s) => s.stock <= 0).length,
    low: skus.filter(isLow).length,
    inStock: skus.filter((s) => s.stock > s.lowStockThreshold).length,
    retail: skus.reduce((n, s) => n + Math.max(0, s.stock) * s.price, 0),
    cost: skus.reduce((n, s) => n + Math.max(0, s.stock) * s.purchasePrice, 0),
  };

  const visible = skus.filter((s) => {
    const q = search.trim().toLowerCase();
    if (
      q &&
      !(
        s.name.toLowerCase().includes(q) ||
        (s.variantName || '').toLowerCase().includes(q) ||
        (s.barcode || '').toLowerCase().includes(q) ||
        (s.sku || '').toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q)
      )
    )
      return false;
    if (filter === 'out') return s.stock <= 0;
    if (filter === 'low') return isLow(s);
    if (filter === 'in_stock') return s.stock > s.lowStockThreshold;
    return true;
  });

  const removeSku = async (s: InventorySku) => {
    const label = s.variantName ? `${s.name} (${s.variantName})` : s.name;
    if (!window.confirm(`Are you sure you want to delete "${label}" from catalog & inventory?`)) return;
    const qs = new URLSearchParams({ id: String(s.productId) });
    if (s.variantId) qs.set('variantId', String(s.variantId));
    const res = await fetch(`/api/inventory?${qs}`, { method: 'DELETE' });
    if (!res.ok) alert((await res.json().catch(() => ({}))).error || 'Failed to delete item');
    load();
  };

  const tabBtn = (t: SubTab) =>
    `px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
      tab === t ? 'bg-[#111111] text-[#C9B79C] shadow-sm' : 'text-gray-600 hover:text-[#111111] hover:bg-[#FAF7F2]'
    }`;
  const statCard = (label: string, value: React.ReactNode, icon: React.ReactNode, tone: string, valueCls: string) => (
    <div className="bg-white border border-[#DDD2BE] rounded-2xl p-4 shadow-sm flex items-center gap-3">
      <div className={`w-11 h-11 shrink-0 rounded-xl border flex items-center justify-center font-black ${tone}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold text-gray-500">{label}</div>
        <div className={`whitespace-nowrap font-black leading-tight ${valueCls}`}>{value}</div>
      </div>
    </div>
  );
  const filterBtn = (f: StockFilter, label: string, on: string, off: string) => (
    <button type="button" onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${filter === f ? on : off}`}>
      {label}
    </button>
  );

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="bg-white border border-[#DDD2BE] rounded-2xl p-2 sm:p-2.5 shadow-sm flex items-center justify-between gap-3 overflow-x-auto">
        <div className="flex items-center gap-1.5 p-1 bg-slate-50 border border-slate-200 rounded-xl shrink-0">
          <button type="button" onClick={() => setTab('stock')} className={tabBtn('stock')}>
            <Box size={14} /> Stock Management
          </button>
          <button
            type="button"
            onClick={() => {
              setEditProductId(null);
              setTab('products');
            }}
            className={tabBtn('products')}
          >
            <Package size={14} /> Add / Edit Products
          </button>
          <button type="button" onClick={() => setTab('categories')} className={tabBtn('categories')}>
            <Tag size={14} /> Categories
          </button>
          <button type="button" onClick={() => setTab('analytics')} className={tabBtn('analytics')}>
            <ChartColumn size={14} /> Analytics &amp; Reports
          </button>
        </div>
        {isAdmin && (
        <button
          type="button"
          onClick={() => setGenerator(true)}
          title="Generate & print barcodes for items"
          className="px-4 py-2.5 rounded-xl bg-[#111111] border border-[#C9B79C]/60 text-[#C9B79C] text-xs font-black hover:bg-[#262626] transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap"
        >
          <Printer size={15} /> Add Barcode
        </button>
        )}
      </div>

      {tab === 'stock' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {statCard('Total SKUs', stats.total, <Layers size={20} />, 'bg-[#FAF7F2] text-[#111111] border-[#DDD2BE]', 'text-xl text-gray-900')}
            {statCard('Total Stock', `${stats.units} Units`, <Package size={20} />, 'bg-emerald-50 text-emerald-700 border-emerald-200', 'text-xl text-emerald-700')}
            {statCard('Low Stock Items', stats.low, <TriangleAlert size={20} />, 'bg-amber-50 text-amber-700 border-amber-200', 'text-xl text-amber-700')}
            {statCard('Cost Price Valuation', money(stats.cost), '₹', 'bg-amber-50 text-[#7A6A4F] border-amber-200 text-sm', 'text-[13px] sm:text-base text-[#111111]')}
            {statCard('Selling Price Valuation', money(stats.retail), '₹', 'bg-emerald-50 text-emerald-700 border-emerald-200 text-sm', 'text-[13px] sm:text-base text-[#111111]')}
          </div>

          <div className="bg-white border border-[#DDD2BE] rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="inventory-search-input"
                type="text"
                placeholder="Search SKU name, variant, barcode, category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 bg-slate-50 text-xs font-bold text-gray-900 outline-none focus:border-[#111111] focus:bg-white"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              {filterBtn('all', `All (${stats.total})`, 'bg-[#111111] text-[#C9B79C]', 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
              {filterBtn('in_stock', `In Stock (${stats.inStock})`, 'bg-emerald-800 text-white', 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100')}
              {filterBtn('low', `Low Stock (${stats.low})`, 'bg-amber-800 text-white', 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100')}
              {filterBtn('out', `Out of Stock (${stats.out})`, 'bg-red-800 text-white', 'bg-red-50 text-red-800 border border-red-200 hover:bg-red-100')}
              <button type="button" onClick={load} title="Refresh stock list" className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            {loading && skus.length === 0 ? (
              <div className="p-16 text-center text-gray-400 font-bold text-xs flex flex-col items-center justify-center">
                <RefreshCw size={24} className="animate-spin text-[#7A6A4F] mb-2" />
                Loading inventory items...
              </div>
            ) : visible.length === 0 ? (
              <div className="p-16 text-center text-gray-400 font-bold text-xs">No inventory items match your search or filter.</div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[860px] text-left text-xs border-collapse whitespace-nowrap">
                  <thead className="bg-[#FBFAF6] border-b border-gray-200 text-xs font-bold text-gray-700">
                    <tr>
                      <th className="py-3.5 px-4 text-left min-w-[220px]">Product &amp; Variant SKU</th>
                      <th className="py-3.5 px-4 text-left w-[140px]">Barcode</th>
                      <th className="py-3.5 px-4 text-left w-[130px]">Category</th>
                      <th className="py-3.5 px-4 text-center w-[130px]">Stock Level</th>
                      <th className="py-3.5 px-4 text-right w-[130px]">Selling Price</th>
                      <th className="py-3.5 px-4 text-right w-[180px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visible.map((s) => (
                      <tr key={s.id} className="hover:bg-[#FBFAF6] transition-colors">
                        <td className="py-3.5 px-4 align-middle">
                          <div className="font-black text-gray-900 text-xs leading-snug">{s.name}</div>
                          {s.variantName ? (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-[#FAF7F2] border border-[#DDD2BE] text-[#111111] font-bold text-[10px]">Size: {s.variantName}</span>
                          ) : (
                            <span className="text-[10px] text-gray-400 font-medium">Standard Product</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 align-middle">
                          {s.barcode ? (
                            <span className="inline-block font-mono text-xs font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded-md">{s.barcode}</span>
                          ) : (
                            <span className="text-gray-400 italic text-[11px]">No Barcode</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 align-middle">
                          <span className="inline-block px-2 py-0.5 bg-gray-50 rounded text-gray-700 border border-gray-200 text-[11px] font-semibold">{s.category || 'General'}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center align-middle">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-xs font-black tabular-nums ${
                              s.stock <= 0
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : isLow(s)
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {s.stock} Units
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right align-middle font-black text-xs text-gray-900 tabular-nums">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <span>{money(s.price)}</span>
                            <button type="button" onClick={() => setPricing(s)} title="Quick Edit Price" className="p-1 rounded-md text-gray-400 hover:text-[#111111] hover:bg-[#FAF7F2] cursor-pointer">
                              <Pen size={12} />
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right align-middle">
                          <div className="flex items-center justify-end gap-1.5">
                            <button type="button" onClick={() => setAdjusting(s)} title="Adjust Stock" className="px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 text-[11px] font-bold cursor-pointer shrink-0">
                              <SlidersHorizontal size={13} className="inline mr-1" />
                              Adjust
                            </button>
                            <button type="button" onClick={() => setHistory(s)} title="Stock History" className="p-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 cursor-pointer shrink-0">
                              <History size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={!s.barcode}
                              onClick={() => s.barcode && setPrinting(s)}
                              title={s.barcode ? 'Print Barcode Labels' : undefined}
                              aria-hidden={!s.barcode}
                              className={`p-1.5 rounded-lg border shrink-0 ${
                                s.barcode ? 'bg-[#111111] text-[#C9B79C] border-[#C9B79C]/50 hover:bg-[#262626] cursor-pointer' : 'invisible pointer-events-none border-transparent'
                              }`}
                            >
                              <Printer size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditProductId(s.productId);
                                setTab('products');
                              }}
                              title={`Edit "${s.name}" in Catalog`}
                              className="p-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-[#111111] hover:text-[#C9B79C] hover:border-[#111111] cursor-pointer shrink-0"
                            >
                              <Pen size={14} />
                            </button>
                            {isAdmin && (
                            <button
                              type="button"
                              onClick={() => removeSku(s)}
                              title={`Delete "${s.variantName ? `${s.name} (${s.variantName})` : s.name}"`}
                              className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer shrink-0"
                            >
                              <Trash2 size={14} />
                            </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'products' && (
        <ProductEditor canDelete={isAdmin} products={products} categories={categories} initialProductId={editProductId} onClearEdit={() => setEditProductId(null)} onSaved={load} />
      )}
      {tab === 'categories' && <CategoriesPanel products={products} onChanged={load} />}
      {tab === 'analytics' && <InventoryReports skus={skus} />}

      {adjusting && <StockAdjustModal item={adjusting} onClose={() => setAdjusting(null)} onSuccess={load} />}
      {history && <StockHistoryModal item={history} onClose={() => setHistory(null)} />}
      {pricing && <QuickPriceModal item={pricing} onClose={() => setPricing(null)} onSuccess={load} />}
      {printing && <PrintLabelsModal item={printing} onClose={() => setPrinting(null)} />}
      {generator && isAdmin && <BarcodeGeneratorModal products={products} onClose={() => setGenerator(false)} onSuccess={load} />}
    </div>
  );
}
