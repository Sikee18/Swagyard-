'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, CircleAlert, Info, Plus, Printer, Settings, Sparkles, Trash2, X } from 'lucide-react';
import {
  LABEL_SIZES,
  STORE_NAME,
  findSize,
  generateItemCode,
  loadCustomSizes,
  loadSettings,
  printLabels,
  saveCustomSizes,
  saveSettings,
  type BarcodeSettings,
  type LabelSize,
} from '@/lib/barcode-labels';
import { LabelPreview } from './PrintLabelsModal';

interface CatalogProduct {
  id: number;
  name: string;
  priceInPaise: number;
  barcode: string | null;
  stockQuantity: number;
  hasVariants: boolean;
  category?: { nameEn?: string } | null;
  variants?: { id: number; variantName: string; sizeLabel?: string | null; priceInPaise: number; stock: number; barcode: string | null }[];
}

interface QueueItem {
  key: string;
  productId: number;
  variantId: number | null;
  name: string;
  variantName: string | null;
  barcode: string;
  labels: number;
  header: string;
  line1: string;
  line2: string;
  line3: string;
  line4: string;
  price: number;
  selected: boolean;
}

const rupees = (paise: number) => (paise || 0) / 100;
const INPUT =
  'w-full h-11 px-3 rounded-xl border border-gray-300 bg-white text-xs font-bold text-gray-900 outline-none focus:border-[#111111] placeholder:text-gray-400 placeholder:font-semibold';
const LABEL = 'block text-[11px] font-black uppercase tracking-wider text-gray-700 mb-1';

function SettingsModal({
  settings,
  onChange,
  onClose,
}: {
  settings: BarcodeSettings;
  onChange: (s: BarcodeSettings) => void;
  onClose: () => void;
}) {
  const [custom, setCustom] = useState<LabelSize[]>(() => loadCustomSizes());
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', perRow: '1', width: '50', height: '38', gap: '0', vgap: '0' });
  const [error, setError] = useState('');

  const saveCustom = () => {
    setError('');
    const name = form.name.trim();
    if (!name) return setError('Please enter a custom size name');
    const all = [...LABEL_SIZES, ...custom];
    if (all.some((s) => s.name.toLowerCase() === name.toLowerCase()))
      return setError(`A label size with the name "${name}" already exists. Please choose a distinct name.`);
    const w = Number(form.width);
    const h = Number(form.height);
    const perRow = Math.max(1, Math.floor(Number(form.perRow) || 1));
    if (!(w > 0) || !(h > 0)) return setError('Please enter valid width and height dimensions in mm');
    const dup = all.find((s) => s.widthMm === w && s.heightMm === h && s.labelsPerRow === perRow);
    if (dup) return setError(`A label size with dimensions ${w} × ${h} mm (${perRow} per row) already exists: "${dup.name}".`);
    const size: LabelSize = {
      id: `custom_${Date.now()}`,
      name,
      labelsPerRow: perRow,
      widthMm: w,
      heightMm: h,
      horizontalGapMm: Number(form.gap) || 0,
      verticalGapMm: Number(form.vgap) || 0,
      custom: true,
    };
    const next = [...custom, size];
    setCustom(next);
    saveCustomSizes(next);
    onChange({ ...settings, selectedSizeId: size.id });
    setCreating(false);
  };

  const removeCustom = (id: string) => {
    const next = custom.filter((s) => s.id !== id);
    setCustom(next);
    saveCustomSizes(next);
    if (settings.selectedSizeId === id) onChange({ ...settings, selectedSizeId: LABEL_SIZES[0].id });
  };

  const check = (key: keyof BarcodeSettings, label: string) => (
    <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
      <input
        type="checkbox"
        checked={settings[key] as boolean}
        onChange={(e) => onChange({ ...settings, [key]: e.target.checked })}
        className="accent-[#111111] w-4 h-4 rounded cursor-pointer"
      />
      {label}
    </label>
  );

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-3xl max-w-md w-full max-h-[90dvh] overflow-y-auto border border-[#DDD2BE] shadow-2xl">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-[#111111]">{creating ? 'Create Custom Size' : 'Barcode Settings'}</h3>
          <button type="button" onClick={creating ? () => setCreating(false) : onClose} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer">
            <X size={15} />
          </button>
        </div>
        {creating ? (
          <div className="p-5 space-y-3">
            <p className="text-[11px] text-gray-500">For best results in generic flow, configure labels in Printer Settings as well</p>
            {error && <div className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">{error}</div>}
            <div>
              <label className={LABEL}>Custom Size Name</label>
              <input className={INPUT} placeholder="e.g. custom 50x38" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className={LABEL}>Labels Per Row</label>
                <input type="number" min={1} className={INPUT} value={form.perRow} onChange={(e) => setForm({ ...form, perRow: e.target.value })} />
              </div>
              <div>
                <label className={LABEL}>Label Width (mm)</label>
                <input type="number" step="0.1" className={INPUT} value={form.width} onChange={(e) => setForm({ ...form, width: e.target.value })} />
              </div>
              <div>
                <label className={LABEL}>Label Height (mm)</label>
                <input type="number" step="0.1" className={INPUT} value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} />
              </div>
            </div>
            <div>
              <label className={LABEL}>Horizontal Gap (mm)</label>
              <input type="number" step="0.1" className={INPUT} value={form.gap} onChange={(e) => setForm({ ...form, gap: e.target.value })} />
              <p className="text-[10px] text-gray-500 mt-1">ℹ Use 0 when label size is configured in printer settings</p>
            </div>
            <div>
              <label className={LABEL}>Row Gap / Space Between Rows (mm)</label>
              <input type="number" step="0.1" className={INPUT} value={form.vgap} onChange={(e) => setForm({ ...form, vgap: e.target.value })} />
              <p className="text-[10px] text-gray-500 mt-1">ℹ Die-cut gap between rows on the roll. Keep 0 if your printer detects the gap itself</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setCreating(false)} className="flex-1 h-10 rounded-xl border border-gray-300 text-xs font-bold cursor-pointer">
                Cancel
              </button>
              <button type="button" onClick={saveCustom} className="flex-1 h-10 rounded-xl bg-[#111111] text-[#C9B79C] text-xs font-black cursor-pointer">
                Save Custom Size
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-[#111111]">Printer</span>
                <span className="text-[10px] text-gray-500">Select any 1 option</span>
              </div>
              {(
                [
                  ['label', 'Label Printer (Thermal)'],
                  ['regular', 'Regular Printer (A4 Sheet)'],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 py-1 text-xs font-semibold text-gray-800 cursor-pointer">
                  <input
                    type="radio"
                    name="printerType"
                    checked={settings.printerType === value}
                    onChange={() => onChange({ ...settings, printerType: value })}
                    className="accent-[#111111] w-4 h-4 cursor-pointer"
                  />
                  {label}
                </label>
              ))}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-[#111111]">Size</span>
                <span className="text-[10px] text-gray-500">Select any 1 option</span>
              </div>
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {[...LABEL_SIZES, ...custom].map((s) => (
                  <label key={s.id} className="flex items-center gap-2 py-1 text-xs font-semibold text-gray-800 cursor-pointer">
                    <input
                      type="radio"
                      name="labelSize"
                      checked={settings.selectedSizeId === s.id}
                      onChange={() => onChange({ ...settings, selectedSizeId: s.id })}
                      className="accent-[#111111] w-4 h-4 cursor-pointer shrink-0"
                    />
                    <span className="flex-1">{s.name}</span>
                    {s.custom && (
                      <>
                        <span className="text-[9px] font-black uppercase bg-amber-50 text-amber-800 border border-amber-200 rounded px-1.5">Custom</span>
                        <button type="button" title={`Delete ${s.name}`} onClick={() => removeCustom(s.id)} className="text-gray-400 hover:text-red-600 cursor-pointer">
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </label>
                ))}
              </div>
              <button type="button" onClick={() => setCreating(true)} className="mt-2 text-xs font-black text-[#7A6A4F] hover:underline cursor-pointer flex items-center gap-1">
                <Plus size={13} /> Create Custom Size
              </button>
            </div>
            <div>
              <span className="text-xs font-black text-[#111111] block mb-2">Additional Fields</span>
              <div className="space-y-1.5">
                {check('showSalePrice', 'Sale Price (₹)')}
                {check('showCompanyName', `Company Name (${STORE_NAME})`)}
                {check('showItemName', 'Item Name')}
                {check('showDiscount', 'Discount / MRP')}
              </div>
            </div>
            <button type="button" onClick={onClose} className="w-full h-10 rounded-xl bg-[#111111] text-[#C9B79C] text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer">
              <Check size={14} /> Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function BarcodeGeneratorModal({
  products,
  onClose,
  onSuccess,
}: {
  products: CatalogProduct[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [settings, setSettings] = useState<BarcodeSettings>(() => loadSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [search, setSearch] = useState('');
  const [dropdown, setDropdown] = useState(false);
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [variantId, setVariantId] = useState<number | null>(null);
  const [code, setCode] = useState('');
  const [labels, setLabels] = useState('1');
  const [header, setHeader] = useState(STORE_NAME);
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [line3, setLine3] = useState('Discount: 0%');
  const [line4, setLine4] = useState('');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [updateStock, setUpdateStock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const comboRef = useRef<HTMLDivElement>(null);
  const size = findSize(settings.selectedSizeId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !showSettings && onClose();
    const onDown = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) setDropdown(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
      document.body.style.overflow = '';
    };
  }, [onClose, showSettings]);

  const changeSettings = (s: BarcodeSettings) => {
    setSettings(s);
    saveSettings(s);
  };

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => !q || p.name.toLowerCase().includes(q) || (p.barcode || '').toLowerCase().includes(q)).slice(0, 30);
  }, [products, search]);

  const variants = product?.hasVariants ? product.variants || [] : [];
  const variant = variants.find((v) => v.id === variantId) || null;
  const unassigned = variants.filter((v) => !v.barcode);
  const existingBarcode = product ? (product.hasVariants ? variant?.barcode || null : product.barcode) : null;

  const pick = (p: CatalogProduct) => {
    setProduct(p);
    setSearch(p.name);
    setDropdown(false);
    setNotice(null);
    setVariantId(null);
    setCode('');
    setLine1(`Price: ₹${rupees(p.priceInPaise)}`);
    setLine2('');
  };

  const pickVariant = (id: number | null) => {
    setVariantId(id);
    const v = variants.find((x) => x.id === id);
    if (v) {
      setLine1(`Price: ₹${rupees(v.priceInPaise || product!.priceInPaise)}`);
      setLine2(`Size: ${v.sizeLabel || v.variantName}`);
    }
  };

  const inQueue = (pid: number, vid: number | null) => queue.some((q) => q.productId === pid && q.variantId === vid);

  const addToQueue = () => {
    setNotice(null);
    if (!product) return setNotice({ type: 'error', text: 'Please select an item first' });
    if (product.hasVariants && !variant) return setNotice({ type: 'error', text: 'Please select an item first' });
    if (existingBarcode) return setNotice({ type: 'error', text: `Barcode already exists for this item (${existingBarcode}). Please check in Stock Management.` });
    const value = code.trim();
    if (!value) return setNotice({ type: 'error', text: 'Item Code / Barcode is required' });
    if (inQueue(product.id, variant?.id ?? null)) {
      return setNotice({ type: 'error', text: `This item (${product.name}${variant ? ` - ${variant.sizeLabel || variant.variantName}` : ''}) is already added in the queue.` });
    }
    setQueue((q) => [
      ...q,
      {
        key: `queue_${Date.now()}_${Math.random()}`,
        productId: product.id,
        variantId: variant?.id ?? null,
        name: product.name,
        variantName: variant ? variant.sizeLabel || variant.variantName : null,
        barcode: value,
        labels: Math.max(1, Math.floor(Number(labels) || 1)),
        header,
        line1,
        line2,
        line3,
        line4,
        price: rupees(variant?.priceInPaise || product.priceInPaise),
        selected: true,
      },
    ]);
    setCode('');
  };

  const addAllVariants = () => {
    if (!product) return;
    const fresh = unassigned.filter((v) => !inQueue(product.id, v.id));
    if (!fresh.length) {
      return setNotice({ type: 'error', text: `All variants for "${product.name}" already have barcodes assigned. Please check in Stock Management.` });
    }
    setQueue((q) => [
      ...q,
      ...fresh.map((v) => ({
        key: `queue_${Date.now()}_${v.id}_${Math.random()}`,
        productId: product.id,
        variantId: v.id,
        name: product.name,
        variantName: v.sizeLabel || v.variantName,
        barcode: generateItemCode(),
        labels: Math.max(1, Math.floor(Number(labels) || 1)),
        header,
        line1: `Price: ₹${rupees(v.priceInPaise || product.priceInPaise)}`,
        line2: `Size: ${v.sizeLabel || v.variantName}`,
        line3,
        line4,
        price: rupees(v.priceInPaise || product.priceInPaise),
        selected: true,
      })),
    ]);
    const skipped = variants.length - fresh.length;
    setNotice({
      type: 'success',
      text: skipped ? `Added ${fresh.length} new variants to queue. Skipped ${skipped} variant(s) that already have barcodes.` : `Added all ${fresh.length} variants for "${product.name}" to the queue!`,
    });
  };

  const selected = queue.filter((q) => q.selected);
  const totalLabels = selected.reduce((s, q) => s + q.labels, 0);

  const toLabels = (items: QueueItem[]) =>
    items.flatMap((q) =>
      Array.from({ length: q.labels }, () => ({
        header: q.header,
        productName: q.name,
        variantName: q.variantName,
        barcode: q.barcode,
        line1: q.line1,
        line2: q.line2,
        line3: q.line3,
        line4: q.line4,
        price: q.price,
      }))
    );

  const generate = async () => {
    setNotice(null);
    if (!selected.length) return setNotice({ type: 'error', text: 'Please add and select at least one item to generate barcodes' });
    setBusy(true);
    try {
      const res = await fetch('/api/inventory/barcodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updateStock,
          items: selected.map((q) => ({ productId: q.productId, variantId: q.variantId, barcode: q.barcode, labels: q.labels })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to receive stock with barcodes');
      printLabels(toLabels(selected), size, settings);
      setNotice({
        type: 'success',
        text: `Successfully generated barcodes for ${selected.length} items (${totalLabels} labels)${updateStock ? ' and updated stock' : ''}!`,
      });
      setQueue((q) => q.filter((x) => !x.selected));
      onSuccess();
    } catch (err) {
      setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Failed to receive stock with barcodes' });
    } finally {
      setBusy(false);
    }
  };

  const editQueue = (key: string, patch: Partial<QueueItem>) => setQueue((q) => q.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-2 sm:p-4">
      <div className="relative z-10 bg-white rounded-3xl max-w-6xl w-full max-h-[96dvh] border border-[#DDD2BE] shadow-2xl overflow-hidden flex flex-col">
        <div className="shrink-0 px-5 sm:px-6 py-4 bg-[#111111] text-white flex items-center justify-between gap-3">
          <h2 className="text-base font-black flex items-center gap-2">
            Barcode Generator <Info size={14} className="text-gray-400" />
          </h2>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-gray-300">
              <span>
                Printer <span className="text-white">{settings.printerType === 'label' ? 'Label Printer' : 'Regular Printer'}</span>
              </span>
              <span className="text-gray-500">|</span>
              <span>
                Size <span className="text-[#C9B79C]">{size.name}</span>
              </span>
            </div>
            <button type="button" title="Barcode Settings" onClick={() => setShowSettings(true)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer">
              <Settings size={15} />
            </button>
            <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer">
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          <div className="rounded-2xl border border-[#DDD2BE] bg-[#FAF7F2] p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-[1fr_310px] gap-5">
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#111111]">Enter item details to add for barcode</h3>
              {notice && (
                <div
                  className={`flex items-start gap-2 text-xs font-bold p-2.5 rounded-xl border ${
                    notice.type === 'error' ? 'text-rose-800 bg-rose-50 border-rose-200' : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                  }`}
                >
                  <CircleAlert size={14} className="shrink-0 mt-0.5" />
                  <span>{notice.text}</span>
                </div>
              )}
              {product && !product.hasVariants && product.barcode && (
                <div className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                  Barcode already exists for this item: <span className="font-mono">{product.barcode}</span>
                  <div className="font-semibold text-amber-800">Barcode already exists. Please check in Stock Management to view, print, or manage this SKU.</div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div ref={comboRef} className="relative">
                  <label htmlFor="barcode-product-search" className={LABEL}>
                    Item Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="barcode-product-search"
                    className={`${INPUT} pr-8`}
                    placeholder="Enter / Select Item Name"
                    value={search}
                    onFocus={() => setDropdown(true)}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setDropdown(true);
                      setProduct(null);
                    }}
                  />
                  <ChevronDown size={14} className="absolute right-3 top-[34px] text-gray-400 pointer-events-none" />
                  {dropdown && (
                    <div className="absolute z-20 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl">
                      {matches.length === 0 ? (
                        <div className="p-3 text-xs text-gray-500">No matching products found.</div>
                      ) : (
                        matches.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => pick(p)}
                            className="w-full text-left px-3 py-2 hover:bg-[#FAF7F2] border-b border-gray-50 last:border-0 cursor-pointer"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-black text-gray-900 truncate">{p.name}</span>
                              <span className="text-xs font-black text-gray-900">₹{rupees(p.priceInPaise)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-[10px] text-gray-500">
                              <span>
                                {p.category?.nameEn || 'General'}
                                {p.hasVariants ? ' • Variants' : ''}
                              </span>
                              <span>
                                {p.hasVariants ? '' : p.barcode ? `Barcode: ${p.barcode} • ` : 'No Barcode • '}Stock: {p.stockQuantity}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label htmlFor="barcode-item-code" className={LABEL}>
                    Item Code <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input id="barcode-item-code" className={`${INPUT} font-mono`} placeholder="Enter Item Code" value={code} onChange={(e) => setCode(e.target.value)} />
                    <button
                      type="button"
                      onClick={() => setCode(generateItemCode())}
                      className="h-11 px-3 rounded-xl border border-gray-300 bg-gray-100 text-xs font-black text-gray-800 hover:bg-gray-200 whitespace-nowrap cursor-pointer"
                    >
                      Assign Code
                    </button>
                  </div>
                </div>
              </div>

              {product?.hasVariants && (
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
                  <div>
                    <label htmlFor="barcode-variant-select" className={LABEL}>
                      Select Variant / Size ({variants.length} available)
                    </label>
                    <select id="barcode-variant-select" className={INPUT} value={variantId ?? ''} onChange={(e) => pickVariant(e.target.value ? Number(e.target.value) : null)}>
                      <option value="">-- Select Variant --</option>
                      {variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.sizeLabel || v.variantName} {v.barcode ? `— [Barcode: ${v.barcode}] (Already Assigned)` : '— [No Barcode]'} — ₹
                          {rupees(v.priceInPaise || product.priceInPaise)} — Stock: {v.stock}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={addAllVariants}
                    disabled={!unassigned.length}
                    className="h-11 px-3 rounded-xl border border-[#C9B79C] bg-white text-xs font-black text-[#7A6A4F] hover:bg-[#FBFAF6] disabled:opacity-40 cursor-pointer whitespace-nowrap"
                  >
                    + Add Unassigned Variants ({unassigned.length})
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="barcode-no-of-labels" className={LABEL}>
                    No of Labels <span className="text-red-500">*</span>
                  </label>
                  <input id="barcode-no-of-labels" type="number" min={1} inputMode="numeric" className={INPUT} value={labels} onChange={(e) => setLabels(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="barcode-header" className={LABEL}>
                    Header
                  </label>
                  <input id="barcode-header" className={INPUT} placeholder="Enter Header" value={header} onChange={(e) => setHeader(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="barcode-line1" className={LABEL}>
                    Line 1
                  </label>
                  <input id="barcode-line1" className={INPUT} placeholder="Enter Line 1" value={line1} onChange={(e) => setLine1(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="barcode-line2" className={LABEL}>
                    Line 2
                  </label>
                  <input id="barcode-line2" className={INPUT} placeholder="Enter Line 2" value={line2} onChange={(e) => setLine2(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="barcode-line3" className={LABEL}>
                    Line 3
                  </label>
                  <input id="barcode-line3" className={INPUT} placeholder="Enter Line 3" value={line3} onChange={(e) => setLine3(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="barcode-line4" className={LABEL}>
                    Line 4
                  </label>
                  <input id="barcode-line4" className={INPUT} placeholder="Enter Line 4" value={line4} onChange={(e) => setLine4(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#111111]">Live Preview</h3>
                <span className="px-2 py-0.5 rounded-full bg-[#111111] text-white text-[10px] font-black">
                  {size.widthMm} × {size.heightMm} mm
                </span>
              </div>
              <div className="rounded-2xl border border-[#DDD2BE] bg-[#F1EBE0] p-4">
                <LabelPreview
                  header={settings.showCompanyName ? header || STORE_NAME : undefined}
                  barcode={code || existingBarcode || 'TOC0000000'}
                  title={settings.showItemName ? (product ? (variant ? `${product.name} (${variant.sizeLabel || variant.variantName})` : product.name) : 'Item Name') : undefined}
                  line1={line1}
                  line2={line2}
                  footer={settings.showDiscount ? line3 || 'Discount: 0%' : undefined}
                />
                <p className="text-center text-[10px] text-gray-600 mt-3">
                  {settings.printerType === 'label'
                    ? `Thermal Roll • ${size.labelsPerRow > 1 ? `${size.labelsPerRow} barcodes per row` : '1 barcode per page'} (${size.name})`
                    : 'Regular Printer (A4 Sheet Layout)'}
                </p>
              </div>
              <button
                type="button"
                onClick={addToQueue}
                disabled={!!existingBarcode}
                className="w-full h-11 rounded-xl bg-[#111111] text-[#C9B79C] text-xs font-black uppercase tracking-wider hover:bg-[#262626] flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {existingBarcode ? (
                  'Barcode Already Exists'
                ) : (
                  <>
                    <Plus size={14} /> Add for Barcode
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-[#FBFAF6] border-b border-gray-200 text-xs font-black uppercase tracking-wider text-[#111111]">
              Item Details ({queue.length})
            </div>
            {queue.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center mx-auto mb-3 text-gray-400">
                  <Sparkles size={24} />
                </div>
                <p className="text-sm font-bold text-gray-700">Added items for Barcode generation will appear here.</p>
                <p className="text-xs text-gray-500 mt-1">Select an item above, set quantity of labels, and click &quot;Add for Barcode&quot;.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-xs">
                  <thead className="bg-[#FAF7F2] text-[10px] uppercase tracking-wider text-gray-600">
                    <tr>
                      <th className="px-3 py-2.5 text-left">
                        <input
                          type="checkbox"
                          checked={queue.every((q) => q.selected)}
                          onChange={(e) => setQueue((q) => q.map((x) => ({ ...x, selected: e.target.checked })))}
                          className="accent-[#111111] w-4 h-4 rounded cursor-pointer"
                        />
                      </th>
                      {['Item Name', 'No of Labels', 'Header', 'Line 1', 'Line 2', 'Line 3', 'Line 4', 'Action'].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left font-black">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {queue.map((q) => (
                      <tr key={q.key} className="hover:bg-[#FBFAF6]">
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={q.selected} onChange={(e) => editQueue(q.key, { selected: e.target.checked })} className="accent-[#111111] w-4 h-4 rounded cursor-pointer" />
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-black text-gray-900">
                            {q.name} {q.variantName && <span className="text-gray-500">({q.variantName})</span>}
                          </div>
                          <div className="font-mono text-[10px] text-gray-500">{q.barcode}</div>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={1}
                            inputMode="numeric"
                            value={q.labels}
                            onChange={(e) => editQueue(q.key, { labels: Math.max(1, Math.floor(Number(e.target.value) || 1)) })}
                            className="w-16 h-8 px-2 rounded-lg border border-gray-300 text-xs font-bold"
                          />
                        </td>
                        {(['header', 'line1', 'line2', 'line3', 'line4'] as const).map((field) => (
                          <td key={field} className="px-3 py-2">
                            <input
                              value={q[field]}
                              onChange={(e) => editQueue(q.key, { [field]: e.target.value })}
                              className="w-28 h-8 px-2 rounded-lg border border-gray-300 text-xs"
                            />
                          </td>
                        ))}
                        <td className="px-3 py-2">
                          <button type="button" onClick={() => setQueue((x) => x.filter((i) => i.key !== q.key))} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 px-4 sm:px-6 py-3 border-t border-gray-200 bg-[#FBFAF6] flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer">
            Close
          </button>
          <div className="flex flex-wrap items-center gap-3">
            {selected.length > 0 && (
              <span className="text-[11px] text-gray-600">
                You will need <b>{totalLabels}</b> labels for printing. <span className="text-gray-400">· {selected.length} items selected</span>
              </span>
            )}
            <label className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer" title="Check this to automatically increase stock by the number of labels printed.">
              <input type="checkbox" checked={updateStock} onChange={(e) => setUpdateStock(e.target.checked)} className="accent-[#111111] w-4 h-4 rounded cursor-pointer" />
              Update Stock
            </label>
            <button
              type="button"
              onClick={generate}
              disabled={busy || selected.length === 0}
              className="px-5 py-2.5 rounded-xl bg-[#111111] border border-[#C9B79C] text-[#C9B79C] text-xs font-black uppercase tracking-wider hover:bg-[#262626] flex items-center gap-1.5 disabled:opacity-50 disabled:bg-gray-400 disabled:text-white disabled:border-gray-400 cursor-pointer"
            >
              <Printer size={14} /> {busy ? 'Generating...' : `Generate & Print (${selected.length})`}
            </button>
          </div>
        </div>
      </div>
      {showSettings && <SettingsModal settings={settings} onChange={changeSettings} onClose={() => setShowSettings(false)} />}
    </div>,
    document.body
  );
}
