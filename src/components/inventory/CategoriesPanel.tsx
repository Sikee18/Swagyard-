'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CircleAlert, CircleCheck, Layers, Pen, Plus, RefreshCw, Search, Tag, Trash2, X } from 'lucide-react';

interface Category {
  id: number;
  nameEn: string;
  nameTa: string | null;
  isActive: boolean;
  sortOrder: number;
}

const EMPTY = { nameEn: '', nameTa: '', sortOrder: '0', isActive: true };
const INPUT =
  'w-full h-11 px-3 rounded-xl border border-gray-300 bg-white text-xs font-bold text-gray-900 outline-none focus:border-[#111111] placeholder:text-gray-400 placeholder:font-semibold';
const LABEL = 'block text-[11px] font-black uppercase tracking-wider text-gray-700 mb-1';

export function CategoriesPanel({ products, onChanged }: { products: any[]; onChanged: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('Failed to load categories');
      setCategories(await res.json());
    } catch (err) {
      setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Failed to load categories' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const m = new Map<number, number>();
    for (const p of products) {
      if (p.categoryId == null) continue;
      const skus = p.hasVariants && p.variants?.length ? p.variants.length : 1;
      m.set(p.categoryId, (m.get(p.categoryId) || 0) + skus);
    }
    return m;
  }, [products]);

  const visible = categories
    .filter((c) => {
      const q = search.trim().toLowerCase();
      return !q || c.nameEn.toLowerCase().includes(q) || (c.nameTa || '').toLowerCase().includes(q);
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.nameEn.localeCompare(b.nameEn));

  const reset = () => {
    setEditing(null);
    setForm(EMPTY);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    const name = form.nameEn.trim();
    if (!name) return setNotice({ type: 'error', text: 'Category Name (English) is required' });
    setSaving(true);
    try {
      const payload = { nameEn: name, nameTa: form.nameTa, sortOrder: Number(form.sortOrder) || 0, isActive: form.isActive };
      const res = editing
        ? await fetch(`/api/categories/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to save category');
      setNotice({ type: 'success', text: editing ? `Category "${name}" updated successfully!` : `Category "${name}" created successfully!` });
      reset();
      await load();
      onChanged();
    } catch (err) {
      setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save category' });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (c: Category) => {
    setEditing(c);
    setForm({ nameEn: c.nameEn, nameTa: c.nameTa || '', sortOrder: String(c.sortOrder ?? 0), isActive: c.isActive !== false });
    setNotice(null);
  };

  const remove = async (c: Category) => {
    const n = counts.get(c.id) || 0;
    const msg = n
      ? `Warning: Category "${c.nameEn}" currently has ${n} product(s) assigned to it. Deleting it will reassign all these products to "General". Are you sure?`
      : `Are you sure you want to delete category "${c.nameEn}"? Any associated products will be reassigned to "General".`;
    if (!window.confirm(msg)) return;
    try {
      const res = await fetch(`/api/categories/${c.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to delete category');
      if (editing?.id === c.id) reset();
      setNotice({ type: 'success', text: `Category "${c.nameEn}" deleted. All associated products moved to "General".` });
      await load();
      onChanged();
    } catch (err) {
      setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Failed to delete category' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#DDD2BE] rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#DDD2BE] flex items-center justify-center text-[#111111]">
            <Layers size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wide text-[#111111]">Category Taxonomy</h3>
            <p className="text-xs font-semibold text-gray-500">Manage shop product categories and classifications ({categories.length} total)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="category-search-input"
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-60 h-9 pl-9 pr-8 rounded-xl border border-gray-300 bg-slate-50 text-xs font-bold outline-none focus:border-[#111111]"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer">
                ✕
              </button>
            )}
          </div>
          <button type="button" onClick={load} title="Refresh" className="w-9 h-9 rounded-xl border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 cursor-pointer">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold ${
            notice.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {notice.type === 'success' ? <CircleCheck size={15} /> : <CircleAlert size={15} />}
          <span>{notice.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
        <form onSubmit={submit} className={`bg-white border rounded-2xl p-5 shadow-sm space-y-4 ${editing ? 'border-[#C9B79C] ring-2 ring-[#C9B79C]/20' : 'border-[#DDD2BE]'}`}>
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h4 className="text-xs font-black uppercase tracking-wide text-[#111111] flex items-center gap-2">
              {editing ? <Pen size={14} /> : <Tag size={14} />} {editing ? 'Edit Category' : 'Add New Category'}
            </h4>
            {editing && (
              <button type="button" onClick={reset} className="text-[11px] font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1 cursor-pointer">
                <X size={12} /> Cancel Edit
              </button>
            )}
          </div>
          <div>
            <label htmlFor="category-name-en" className={LABEL}>
              Category Name (English) <span className="text-red-500">*</span>
            </label>
            <input id="category-name-en" className={INPUT} placeholder="e.g. Linen Shirts, Sarees, Trousers" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
          </div>
          <div>
            <label htmlFor="category-name-ta" className={LABEL}>
              Category Name (Tamil - Optional)
            </label>
            <input id="category-name-ta" className={INPUT} placeholder="e.g. சட்டை வகைகள்" value={form.nameTa} onChange={(e) => setForm({ ...form, nameTa: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="category-sort-order" className={LABEL}>
                Sort Order
              </label>
              <input id="category-sort-order" type="number" className={INPUT} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
            </div>
            <div>
              <label htmlFor="category-status-active" className={LABEL}>
                Status
              </label>
              <label className="h-11 px-3 rounded-xl border border-gray-300 flex items-center gap-2 text-xs font-bold cursor-pointer">
                <input
                  id="category-status-active"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="accent-[#111111] w-4 h-4 rounded cursor-pointer"
                />
                Active
              </label>
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full h-11 rounded-xl bg-[#111111] text-[#C9B79C] text-xs font-black uppercase tracking-wider hover:bg-[#262626] flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving...' : editing ? <><Pen size={13} /> Update Category</> : <><Plus size={13} /> Create Category</>}
          </button>
        </form>

        <div className="bg-white border border-[#DDD2BE] rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3.5 border-b border-gray-100 bg-[#FBFAF6] text-xs font-black uppercase tracking-wide text-[#111111]">All Categories ({visible.length})</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-gray-600 border-b border-gray-100">
                <tr>
                  {['Order', 'Category Name', 'Tamil Name', 'Products', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-black">
                      {h}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-black">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400 font-bold">
                      {categories.length ? 'No matching categories found.' : 'No categories created yet.'}
                    </td>
                  </tr>
                ) : (
                  visible.map((c) => (
                    <tr key={c.id} className="hover:bg-[#FBFAF6] transition-colors">
                      <td className="px-4 py-3 font-mono text-gray-400">{c.sortOrder ?? 0}</td>
                      <td className="px-4 py-3 font-black text-gray-900">{c.nameEn}</td>
                      <td className="px-4 py-3 text-gray-700">{c.nameTa || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-[10px] font-black text-gray-700">{counts.get(c.id) || 0} SKUs</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${
                            c.isActive !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}
                        >
                          {c.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button type="button" title="Edit" onClick={() => startEdit(c)} className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-100 cursor-pointer">
                            <Pen size={13} />
                          </button>
                          <button type="button" title="Delete" onClick={() => remove(c)} className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
