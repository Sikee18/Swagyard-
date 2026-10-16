'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Boxes, Check, CircleAlert, CircleCheck, Package, Pen, Plus, Search, Tag, Trash2, X } from 'lucide-react';

const ALPHA = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', 'Free Size'];
const NUMERIC = ['28', '30', '32', '34', '36', '38', '40', '42', '44', '46', '48'];
const SPECIAL = ['Free Size', 'One Size', 'Semi-Stitched', 'Unstitched', 'XXS', '6XL', 'Kids 2-3Y', 'Kids 4-5Y', 'Kids 6-7Y', 'Kids 8-9Y'];
const FULL_SET: Record<'alpha' | 'numeric' | 'custom', string[]> = {
  alpha: ['S', 'M', 'L', 'XL', '2XL'],
  numeric: ['28', '30', '32', '34', '36', '38'],
  custom: ['Free Size', 'One Size', 'Semi-Stitched', 'Unstitched'],
};

interface VariantRow {
  key: string;
  id?: number;
  variantName: string;
  price: string;
  cost: string;
  stock: string;
  barcode: string;
}

interface Category {
  id: number;
  nameEn: string;
}

const EMPTY_FORM = {
  name: '',
  nameTa: '',
  categoryId: '',
  barcode: '',
  lowStockAlert: '5',
  price: '',
  cost: '',
  stock: '0',
  description: '',
  hasVariants: false,
};

const rupees = (paise: number | null | undefined) => (paise || 0) / 100;
const toPaise = (v: string) => Math.round((Number(v) || 0) * 100);
const newKey = () => `var_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const INPUT =
  'w-full h-11 px-3 rounded-xl border border-gray-300 bg-white text-xs font-bold text-gray-900 outline-none focus:border-[#111111] placeholder:text-gray-400 placeholder:font-semibold';
const LABEL = 'block text-[11px] font-bold text-gray-700 mb-1';

export function ProductEditor({
  canDelete = false,
  products,
  categories,
  initialProductId,
  onClearEdit,
  onSaved,
}: {
  /** Deleting products is admin-only. */
  canDelete?: boolean;
  products: any[];
  categories: Category[];
  initialProductId: number | null;
  onClearEdit: () => void;
  onSaved: () => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [sizeMode, setSizeMode] = useState<'alpha' | 'numeric' | 'custom'>('alpha');
  const [customSize, setCustomSize] = useState('');
  const [search, setSearch] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'form'>('list');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const startNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setVariants([]);
    setNotice(null);
    onClearEdit();
  };

  const startEdit = (p: any) => {
    setEditingId(p.id);
    setForm({
      name: p.name || '',
      nameTa: p.nameTa || '',
      categoryId: p.categoryId ? String(p.categoryId) : '',
      barcode: p.barcode || '',
      lowStockAlert: String(p.lowStockAlert ?? 5),
      price: String(rupees(p.priceInPaise)),
      cost: p.costInPaise ? String(rupees(p.costInPaise)) : '',
      stock: String(p.stockQuantity ?? 0),
      description: p.description || '',
      hasVariants: !!(p.hasVariants && p.variants?.length),
    });
    setVariants(
      (p.hasVariants ? p.variants || [] : []).map((v: any) => ({
        key: newKey(),
        id: v.id,
        variantName: v.sizeLabel || v.variantName,
        price: String(rupees(v.priceInPaise || p.priceInPaise)),
        cost: v.costInPaise ? String(rupees(v.costInPaise)) : '',
        stock: String(v.stock ?? 0),
        barcode: v.barcode || '',
      }))
    );
    setNotice(null);
    setMobileView('form');
  };

  useEffect(() => {
    if (initialProductId == null) return;
    const p = products.find((x) => x.id === initialProductId);
    if (p) startEdit(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProductId, products]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) ||
        (p.variants || []).some((v: any) => (v.barcode || '').toLowerCase().includes(q))
    );
  }, [products, search]);

  const hasSize = (s: string) => variants.some((v) => v.variantName.trim().toLowerCase() === s.toLowerCase());
  const addSizes = (sizes: string[]) => {
    const fresh = sizes.filter((s) => !hasSize(s));
    if (!fresh.length) return;
    setVariants((rows) => [
      ...rows,
      ...fresh.map((s) => ({ key: newKey(), variantName: s, price: form.price, cost: form.cost, stock: '0', barcode: '' })),
    ]);
  };
  const toggleSize = (s: string) => (hasSize(s) ? setVariants((rows) => rows.filter((v) => v.variantName.trim().toLowerCase() !== s.toLowerCase())) : addSizes([s]));
  const updateRow = (key: string, patch: Partial<VariantRow>) => setVariants((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const totalVariantStock = variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);

  const remove = async (p: any) => {
    if (!window.confirm(`Are you sure you want to delete "${p.name}" from catalog & inventory?`)) return;
    const res = await fetch(`/api/inventory?id=${p.id}`, { method: 'DELETE' });
    if (!res.ok) {
      setNotice({ type: 'error', text: 'Failed to delete product' });
      return;
    }
    if (editingId === p.id) startNew();
    setNotice({ type: 'success', text: `Product "${p.name}" deleted successfully.` });
    onSaved();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    const name = form.name.trim();
    if (!name) return setNotice({ type: 'error', text: 'Product Name is required' });
    if (form.hasVariants) {
      const rows = variants.filter((v) => v.variantName.trim());
      if (!rows.length) return setNotice({ type: 'error', text: 'Please add at least one variant SKU (e.g. Size S, 32, or custom variant)' });
      if (rows.some((v) => !(Number(v.price) > 0))) return setNotice({ type: 'error', text: 'Price must be greater than 0' });
    } else if (!(Number(form.price) > 0)) {
      return setNotice({ type: 'error', text: 'Price must be greater than 0' });
    }

    const payload = {
      ...(editingId ? { id: editingId } : {}),
      name,
      nameTa: form.nameTa,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      priceInPaise: form.hasVariants ? toPaise(variants[0]?.price || form.price) : toPaise(form.price),
      costInPaise: form.cost.trim() ? toPaise(form.cost) : null,
      stockQuantity: Math.max(0, Math.floor(Number(form.stock) || 0)),
      lowStockAlert: Math.max(0, Math.floor(Number(form.lowStockAlert) || 5)),
      barcode: form.hasVariants ? null : form.barcode,
      description: form.description,
      hasVariants: form.hasVariants,
      variants: form.hasVariants
        ? variants
            .filter((v) => v.variantName.trim())
            .map((v) => ({
              ...(v.id ? { id: v.id } : {}),
              variantName: v.variantName.trim(),
              priceInPaise: toPaise(v.price),
              costInPaise: v.cost.trim() ? toPaise(v.cost) : null,
              stock: Math.max(0, Math.floor(Number(v.stock) || 0)),
              barcode: v.barcode.trim() || null,
            }))
        : [],
    };

    setSaving(true);
    try {
      const res = await fetch('/api/inventory', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'An error occurred while saving');
      const units = form.hasVariants ? totalVariantStock : payload.stockQuantity;
      setNotice({
        type: 'success',
        text: editingId
          ? form.hasVariants
            ? `Product "${name}" updated with ${units} total variant stock units! Ready in POS Catalog.`
            : `Product "${name}" updated successfully with ${units} stock units! Ready in POS Catalog.`
          : form.hasVariants
            ? `Multi-variant product "${name}" created with ${units} total units! Immediately ready in catalog & billing.`
            : `Product "${name}" created with ${units} stock units! Immediately ready in catalog & billing.`,
      });
      if (!editingId) {
        setForm(EMPTY_FORM);
        setVariants([]);
      } else {
        setEditingId(body.id);
      }
      onSaved();
    } catch (err) {
      setNotice({ type: 'error', text: err instanceof Error ? err.message : 'An error occurred while saving' });
    } finally {
      setSaving(false);
    }
  };

  const modeBtn = (m: 'alpha' | 'numeric' | 'custom') =>
    `px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${sizeMode === m ? 'bg-[#111111] text-[#C9B79C]' : 'text-gray-600 hover:text-black'}`;
  const chips = sizeMode === 'alpha' ? ALPHA : sizeMode === 'numeric' ? NUMERIC : SPECIAL;
  const editingProduct = products.find((p) => p.id === editingId);

  return (
    <div className="flex flex-col lg:flex-row gap-5 lg:h-[calc(100dvh-220px)] lg:min-h-[640px]">
      {/* Catalog list */}
      <div className={`w-full lg:w-80 xl:w-96 flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm shrink-0 h-full min-h-0 ${mobileView === 'list' ? 'flex' : 'hidden lg:flex'}`}>
        <div className="px-4 py-3 border-b border-gray-100 bg-[#FBFAF6] flex items-start justify-between gap-2">
          <div>
            <h3 className="text-xs font-black text-[#111111] flex items-center gap-1.5">
              <Package size={14} /> Product Catalog ({products.length})
            </h3>
            <p className="text-[11px] text-gray-500">Select any item to view or edit details</p>
          </div>
          <button
            type="button"
            title="Switch to Add New Product"
            onClick={() => {
              startNew();
              setMobileView('form');
            }}
            className="lg:hidden px-2.5 py-1.5 rounded-lg bg-[#111111] text-[#C9B79C] text-[11px] font-black flex items-center gap-1 cursor-pointer"
          >
            <Plus size={12} /> New
          </button>
        </div>
        <div className="p-3 border-b border-gray-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search products, SKUs, barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-gray-300 bg-slate-50 text-xs font-semibold outline-none focus:border-[#111111]"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 min-h-0">
          {visible.length === 0 ? (
            <p className="p-6 text-center text-xs text-gray-400 font-bold">No products found.</p>
          ) : (
            visible.map((p) => (
              <div
                key={p.id}
                onClick={() => startEdit(p)}
                className={`px-4 py-3 flex items-center gap-2 cursor-pointer transition-colors ${editingId === p.id ? 'bg-[#FAF7F2] border-l-4 border-[#C9B79C]' : 'hover:bg-[#FBFAF6] border-l-4 border-transparent'}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-gray-900 truncate">{p.name}</span>
                    {editingId === p.id && <span className="text-[9px] font-black bg-[#111111] text-[#C9B79C] px-1.5 py-0.5 rounded-full">Editing</span>}
                  </div>
                  <div className="text-[10px] text-gray-500 truncate">
                    {p.category?.nameEn || 'General'}
                    {p.hasVariants && p.variants?.length ? ' • Multi-variant' : ''}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-black text-gray-900">₹{rupees(p.priceInPaise)}</div>
                  <div className="text-[10px] font-bold text-emerald-700">Stock: {p.stockQuantity ?? 0}</div>
                </div>
                <button
                  type="button"
                  title={`Edit "${p.name}"`}
                  aria-label={`Edit ${p.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit(p);
                  }}
                  className="w-7 h-7 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 cursor-pointer shrink-0"
                >
                  <Pen size={12} />
                </button>
                {canDelete && (
                <button
                  type="button"
                  title={`Delete "${p.name}"`}
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(p);
                  }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer shrink-0"
                >
                  <Trash2 size={12} />
                </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={submit} className={`flex-1 flex-col bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden h-full min-h-0 ${mobileView === 'form' ? 'flex' : 'hidden lg:flex'}`}>
        <div className="shrink-0 px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <button type="button" onClick={() => setMobileView('list')} title="Back to Catalog List" className="lg:hidden w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center cursor-pointer">
              <ArrowLeft size={14} />
            </button>
            <div>
              <h3 className="text-sm font-black text-[#111111] flex items-center gap-2">
                <Package size={16} /> {editingId ? 'Edit Product & Stock Details' : 'Add New Product to Catalog'}
              </h3>
              <p className="text-[11px] text-gray-500">
                {editingId
                  ? `Modifying "${editingProduct?.name || 'product'}" — update pricing, barcode, threshold or variants`
                  : 'Receive stock, configure pricing & categories (Barcode is optional)'}
              </p>
            </div>
          </div>
          {editingId && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                title="Close edit mode and switch to add new product"
                onClick={startNew}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-[11px] font-black text-gray-700 hover:bg-gray-100 flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} /> Add New Product
              </button>
              {canDelete && (
              <button
                type="button"
                title="Delete this product"
                onClick={() => editingProduct && remove(editingProduct)}
                className="px-3 py-1.5 rounded-lg border border-red-200 text-[11px] font-black text-red-600 hover:bg-red-50 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 size={12} /> Delete
              </button>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#FBFAF6] min-h-0">
          {notice && (
            <div
              className={`flex items-start gap-2 p-3 rounded-xl border text-xs font-bold ${
                notice.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {notice.type === 'success' ? <CircleCheck size={15} className="shrink-0" /> : <CircleAlert size={15} className="shrink-0" />}
              <span className="flex-1">{notice.text}</span>
              <button type="button" onClick={() => setNotice(null)} className="cursor-pointer">
                ✕
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>
                Product Name (English) <span className="text-red-500">*</span>
              </label>
              <input className={INPUT} placeholder="e.g. Linen Cotton Shirt" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className={LABEL}>
                Tamil Name <span className="text-gray-400 font-medium">(Optional)</span>
              </label>
              <input className={INPUT} placeholder="e.g. காட்டன் சட்டை" value={form.nameTa} onChange={(e) => setForm({ ...form, nameTa: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={LABEL}>Category</label>
              <select className={INPUT} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">-- Select Category --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameEn}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>
                Barcode <span className="text-gray-400 font-medium">{form.hasVariants ? 'Defined at variant level' : '(Optional)'}</span>
              </label>
              <input
                className={`${INPUT} font-mono disabled:opacity-50`}
                placeholder="e.g. 8901234567"
                disabled={form.hasVariants}
                value={form.hasVariants ? '' : form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              />
            </div>
            <div>
              <label className={LABEL}>Low Stock Alert Threshold</label>
              <input type="number" min={0} className={INPUT} value={form.lowStockAlert} onChange={(e) => setForm({ ...form, lowStockAlert: e.target.value })} />
            </div>
          </div>

          {!form.hasVariants && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white border border-gray-200 rounded-2xl p-3.5">
              <div>
                <label className={LABEL}>
                  Selling Price (₹) <span className="text-red-500">*</span>
                </label>
                <input type="number" step="0.01" min="0" className={INPUT} placeholder="0.00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <label className={LABEL}>Purchase / Cost Price (₹)</label>
                <input type="number" step="0.01" min="0" className={INPUT} placeholder="0.00" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-emerald-700 mb-1 flex items-center gap-1">
                  <Boxes size={12} /> Received / Current Stock
                </label>
                <input
                  type="number"
                  min={0}
                  className={`${INPUT} border-emerald-300 bg-emerald-50/40 focus:border-emerald-600`}
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
              </div>
            </div>
          )}

          <div>
            <label className={LABEL}>
              Description / Notes <span className="text-gray-400 font-medium">(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Product material, care instructions, or rack location notes..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full p-3 rounded-xl border border-gray-300 bg-white text-xs font-medium text-gray-900 outline-none focus:border-[#111111] resize-none"
            />
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black text-[#111111] flex items-center gap-1.5">
                  <Tag size={14} /> Multi-Variant Product (Sizes, Colors, SKUs)
                </div>
                <p className="text-[11px] text-gray-500">Enable if this product comes in multiple sizes (e.g. S, M, L, XL) or colors</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={form.hasVariants}
                  onChange={(e) => setForm({ ...form, hasVariants: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-[#111111] transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
              </label>
            </div>

            {form.hasVariants && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex p-1 bg-slate-50 border border-slate-200 rounded-lg">
                    <button type="button" onClick={() => setSizeMode('alpha')} className={modeBtn('alpha')}>
                      Alpha Sizes (S, M, L, XL...)
                    </button>
                    <button type="button" onClick={() => setSizeMode('numeric')} className={modeBtn('numeric')}>
                      Numeric Sizes (28, 30, 32...)
                    </button>
                    <button type="button" onClick={() => setSizeMode('custom')} className={modeBtn('custom')}>
                      Special &amp; Custom
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => addSizes(FULL_SET[sizeMode])}
                    className="px-3 py-1.5 rounded-lg border border-[#C9B79C] text-[11px] font-black text-[#7A6A4F] hover:bg-[#FBFAF6] cursor-pointer"
                  >
                    + Add Full Size Set ({sizeMode === 'alpha' ? 'S to 2XL' : sizeMode === 'numeric' ? '28 to 38' : 'Standard Specials'})
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-gray-600">Quick Add:</span>
                  {chips.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSize(s)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                        hasSize(s) ? 'bg-[#111111] text-[#C9B79C] border-[#111111]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {hasSize(s) ? `✓ ${s}` : `+ ${s}`}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    list="standard-clothing-sizes"
                    className={INPUT}
                    placeholder="Type custom variant (e.g. Free Size, 34-Slim, Kids 5Y, Red-XL, Combo Pack)..."
                    value={customSize}
                    onChange={(e) => setCustomSize(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (customSize.trim()) addSizes([customSize.trim()]);
                        setCustomSize('');
                      }
                    }}
                  />
                  <datalist id="standard-clothing-sizes">
                    {ALPHA.map((s) => (
                      <option key={`alpha-${s}`} value={s}>
                        Standard Alpha Size: {s}
                      </option>
                    ))}
                    {NUMERIC.map((s) => (
                      <option key={`num-${s}`} value={s}>
                        Standard Numeric Size: {s}
                      </option>
                    ))}
                    {SPECIAL.map((s) => (
                      <option key={`special-${s}`} value={s}>
                        Special Variant / Size: {s}
                      </option>
                    ))}
                  </datalist>
                  <button
                    type="button"
                    onClick={() => {
                      if (customSize.trim()) addSizes([customSize.trim()]);
                      setCustomSize('');
                    }}
                    className="h-11 px-4 rounded-xl bg-[#111111] text-[#C9B79C] text-xs font-black whitespace-nowrap flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} /> Add Custom
                  </button>
                </div>

                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-[#FBFAF6] border-b border-gray-200 flex items-center justify-between">
                    <span className="text-[11px] font-black text-gray-800">
                      Variant SKUs ({variants.length}) · {totalVariantStock} units
                    </span>
                    <button
                      type="button"
                      onClick={() => setVariants((r) => [...r, { key: newKey(), variantName: '', price: form.price, cost: form.cost, stock: '0', barcode: '' }])}
                      className="text-[11px] font-black text-[#7A6A4F] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={12} /> Add Blank Variant Row
                    </button>
                  </div>
                  {variants.length === 0 ? (
                    <div className="py-8 px-4 text-center">
                      <Tag size={22} className="mx-auto text-gray-400" />
                      <p className="text-xs font-black text-gray-700 mt-2">No Variant SKUs Added Yet</p>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Click quick-add size chips above, type any custom variant name (e.g. Free Size, 34-Slim), or click &quot;+ Add Blank Variant Row&quot;.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-xs">
                        <thead className="text-[10px] uppercase tracking-wider text-gray-600">
                          <tr>
                            {['Size / Variant', 'Price (₹)', 'Cost (₹)', 'Received Stock', 'Barcode (Opt)', ''].map((h) => (
                              <th key={h} className="px-2 py-2 text-left font-black">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {variants.map((v) => (
                            <tr key={v.key}>
                              <td className="px-2 py-1.5">
                                <input className="w-full h-9 px-2 rounded-lg border border-gray-300 text-xs font-bold" placeholder="e.g. M, L, 32, 34" value={v.variantName} onChange={(e) => updateRow(v.key, { variantName: e.target.value })} />
                              </td>
                              <td className="px-2 py-1.5">
                                <input type="number" step="0.01" min="0" className="w-24 h-9 px-2 rounded-lg border border-gray-300 text-xs font-bold" value={v.price} onChange={(e) => updateRow(v.key, { price: e.target.value })} />
                              </td>
                              <td className="px-2 py-1.5">
                                <input type="number" step="0.01" min="0" className="w-24 h-9 px-2 rounded-lg border border-gray-300 text-xs" value={v.cost} onChange={(e) => updateRow(v.key, { cost: e.target.value })} />
                              </td>
                              <td className="px-2 py-1.5">
                                <input type="number" min="0" className="w-20 h-9 px-2 rounded-lg border border-emerald-300 bg-emerald-50/40 text-xs font-bold" value={v.stock} onChange={(e) => updateRow(v.key, { stock: e.target.value })} />
                              </td>
                              <td className="px-2 py-1.5">
                                <input className="w-32 h-9 px-2 rounded-lg border border-gray-300 text-xs font-mono" placeholder="Optional" value={v.barcode} onChange={(e) => updateRow(v.key, { barcode: e.target.value })} />
                              </td>
                              <td className="px-2 py-1.5">
                                <button type="button" title="Remove variant" onClick={() => setVariants((r) => r.filter((x) => x.key !== v.key))} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer">
                                  <X size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="shrink-0 px-5 py-3 border-t border-gray-200 bg-white flex items-center justify-end gap-2">
          <button type="button" onClick={startNew} className="px-5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-[#111111] border border-[#C9B79C]/60 text-[#C9B79C] text-xs font-black uppercase tracking-wider hover:bg-[#262626] shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Check size={14} /> {saving ? 'Saving Product...' : editingId ? 'Update Product' : 'Save & Add Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
