'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Download,
  Layers,
  Pen,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Tag,
  Trash2,
  TrendingDown,
  X,
} from 'lucide-react';

interface ExpenseRecord {
  id: string;
  expenseDate: string;
  categoryId: number | null;
  categoryName: string;
  amountInPaise: number;
  paymentMode: string;
  recordedByName: string;
  description: string | null;
}

interface ExpenseCategory {
  id: number;
  name: string;
}

type DatePreset = 'all' | 'today' | 'week' | 'month' | 'custom';

const STORE_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Swagyard';

const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** Stored expense dates are ISO strings at UTC midnight; the first 10 chars are the calendar date. */
const expenseDay = (e: ExpenseRecord) => e.expenseDate.slice(0, 10);
const rupees = (paise: number) => (paise || 0) / 100;
const formatInr = (value: number) =>
  `₹ ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function summarize(expenses: ExpenseRecord[]) {
  const now = new Date();
  const today = toDateKey(now);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const week = toDateKey(weekStart);
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const year = `${now.getFullYear()}-01-01`;

  const totals = { today: 0, this_week: 0, this_month: 0, this_year: 0, total_all_time: 0 };
  for (const e of expenses) {
    const amount = rupees(e.amountInPaise);
    const day = expenseDay(e);
    totals.total_all_time += amount;
    if (day === today) totals.today += amount;
    if (day >= week && day <= today) totals.this_week += amount;
    if (day >= month && day <= today) totals.this_month += amount;
    if (day >= year && day <= today) totals.this_year += amount;
  }
  return totals;
}

function downloadCsv(rows: ExpenseRecord[]) {
  if (rows.length === 0) return;
  const quote = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = ['Date', 'Category', 'Description', 'Amount (INR)', 'Payment Mode', 'Recorded By'];
  const lines = rows.map((r) => [
    expenseDay(r),
    quote(r.categoryName || 'Uncategorized'),
    quote(r.description ?? ''),
    rupees(r.amountInPaise).toFixed(2),
    quote(r.paymentMode || 'Cash'),
    quote(r.recordedByName || 'Staff'),
  ]);
  const csv = [header.join(','), ...lines.map((l) => l.join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${STORE_NAME}-Expenses-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function readError(res: Response, fallback: string) {
  try {
    return (await res.json()).error || fallback;
  } catch {
    return fallback;
  }
}

function ExpenseModal({
  isOpen,
  onClose,
  onSuccess,
  categories,
  expenseToEdit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (e: ExpenseRecord) => void;
  categories: ExpenseCategory[];
  expenseToEdit: ExpenseRecord | null;
}) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (expenseToEdit) {
      setDate(expenseDay(expenseToEdit));
      const match =
        categories.find((c) => c.id === expenseToEdit.categoryId) ||
        categories.find((c) => c.name.toLowerCase() === expenseToEdit.categoryName.toLowerCase());
      setCategoryId(String(match?.id ?? categories[0]?.id ?? ''));
      setAmount(String(rupees(expenseToEdit.amountInPaise)));
      setDescription(expenseToEdit.description || '');
    } else {
      setDate(new Date().toISOString().slice(0, 10));
      setCategoryId(String(categories[0]?.id ?? ''));
      setAmount('');
      setDescription('');
    }
    setError('');
  }, [isOpen, expenseToEdit, categories]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }
    const category = categories.find((c) => String(c.id) === categoryId);
    const payload = {
      expenseDate: date,
      categoryId: category ? category.id : null,
      categoryName: category ? category.name : 'Other',
      amountInPaise: Math.round(value * 100),
      description: description.trim(),
    };
    setSaving(true);
    try {
      const res = expenseToEdit
        ? await fetch(`/api/expenses/${expenseToEdit.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, paymentMode: 'cash' }),
          });
      if (!res.ok) throw new Error(await readError(res, 'An error occurred while saving expense'));
      onSuccess(await res.json());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving expense');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full h-11 px-3 rounded-xl border border-gray-300 bg-slate-50 text-xs font-bold text-gray-900 outline-none focus:border-[#111111] focus:bg-white transition-all';

  return createPortal(
    <div className="fixed inset-0 w-screen h-[100dvh] z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 overflow-hidden">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl sm:rounded-3xl max-w-md w-full max-h-[92dvh] border border-[#DDD2BE] shadow-2xl overflow-hidden flex flex-col">
        <div className="shrink-0 px-5 py-4 border-b border-[#C9B79C]/30 flex items-center justify-between bg-[#111111] text-white">
          <div className="flex items-center gap-2">
            {expenseToEdit ? <Pen size={17} className="text-[#7A6A4F]" /> : <Tag size={17} className="text-[#7A6A4F]" />}
            <h3 className="text-sm font-black text-white">{expenseToEdit ? 'Edit Expense Record' : 'Record Expense'}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={submit} className="overflow-y-auto min-h-0 flex-1 p-4 sm:p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 p-3 rounded-xl">
              <CircleAlert size={15} className="text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="expense-record-date" className="block text-[11px] font-bold text-gray-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="expense-record-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`${inputCls} pl-9`}
              />
              <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label htmlFor="expense-record-category" className="block text-[11px] font-bold text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="expense-record-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={`${inputCls} cursor-pointer`}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="expense-record-amount" className="block text-[11px] font-bold text-gray-700 mb-1">
              Amount (₹) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-sm text-[#111111]">₹</span>
              <input
                id="expense-record-amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-11 pl-8 pr-3 rounded-xl border border-gray-300 bg-slate-50 text-sm font-bold text-gray-900 outline-none focus:border-[#111111] focus:bg-white transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="expense-record-description" className="block text-[11px] font-bold text-gray-700 mb-1">
              Description / Notes
            </label>
            <textarea
              id="expense-record-description"
              rows={3}
              placeholder="Optional details (e.g. Shop electric bill, store supplies)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 rounded-xl border border-gray-300 bg-slate-50 text-xs font-medium text-gray-900 outline-none focus:border-[#111111] focus:bg-white resize-none transition-all"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-[1.5] h-11 rounded-xl bg-[#111111] border border-[#C9B79C]/60 text-[#C9B79C] text-xs font-bold hover:bg-[#262626] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving
                ? expenseToEdit
                  ? 'Updating...'
                  : 'Saving...'
                : expenseToEdit
                  ? 'Update Expense'
                  : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function CategoriesPanel({
  categories,
  onCategoriesUpdated,
}: {
  categories: ExpenseCategory[];
  onCategoriesUpdated: () => void;
}) {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<ExpenseCategory | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setNotice(null);
    try {
      const res = editing
        ? await fetch(`/api/expense-categories/${editing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: trimmed }),
          })
        : await fetch('/api/expense-categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: trimmed }),
          });
      if (!res.ok) throw new Error(await readError(res, 'Could not save category'));
      setNotice({
        type: 'success',
        text: editing ? `Category updated to "${trimmed}" successfully!` : `Category "${trimmed}" created successfully!`,
      });
      setEditing(null);
      setName('');
      onCategoriesUpdated();
    } catch (err) {
      setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Could not save category' });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (c: ExpenseCategory) => {
    setEditing(c);
    setName(c.name);
    setNotice(null);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  };

  const cancelEdit = () => {
    setEditing(null);
    setName('');
  };

  const remove = async (c: ExpenseCategory) => {
    if (!window.confirm(`Delete expense category "${c.name}"? Historical expenses will remain intact.`)) return;
    try {
      const res = await fetch(`/api/expense-categories/${c.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await readError(res, 'Could not delete category'));
      if (editing?.id === c.id) cancelEdit();
      setNotice({ type: 'success', text: `Category "${c.name}" deleted.` });
      onCategoriesUpdated();
    } catch (err) {
      setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Could not delete category' });
    }
  };

  return (
    <div className="space-y-6">
      {notice && (
        <div
          className={`flex items-center gap-2.5 p-4 rounded-2xl border text-xs font-bold ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {notice.type === 'success' ? (
            <CircleCheck size={16} className="text-emerald-600 shrink-0" />
          ) : (
            <CircleAlert size={16} className="text-rose-600 shrink-0" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
        <div
          className={`bg-white border rounded-3xl p-6 shadow-xs space-y-4 transition-all ${
            editing ? 'border-[#C9B79C] ring-2 ring-[#C9B79C]/20' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              {editing ? <Pen size={16} className="text-[#7A6A4F]" /> : <Tag size={16} className="text-[#7A6A4F]" />}
              <h4 className="text-xs font-bold text-gray-800">{editing ? 'Edit Category' : 'Add Category'}</h4>
            </div>
            {editing && (
              <button
                type="button"
                onClick={cancelEdit}
                className="text-[11px] font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1 cursor-pointer"
              >
                <X size={13} /> Cancel
              </button>
            )}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="expense-category-name-input" className="block text-[11px] font-bold text-gray-700 mb-1">
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                id="expense-category-name-input"
                ref={inputRef}
                type="text"
                required
                placeholder="e.g. Utility Bills, Packaging"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-gray-300 bg-slate-50 text-xs font-bold text-gray-900 outline-none focus:border-[#111111] focus:bg-white transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="flex-1 h-11 rounded-xl bg-[#111111] border border-[#C9B79C]/60 text-[#C9B79C] text-xs font-bold hover:bg-[#262626] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {editing ? (
                  <>
                    <Check size={14} /> {saving ? 'Saving...' : 'Update Category'}
                  </>
                ) : (
                  <>
                    <Plus size={14} /> {saving ? 'Adding...' : 'Add Category'}
                  </>
                )}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xs">
          <div className="p-5 border-b border-gray-100 bg-[#FAFAFA] flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-800">Expense Categories ({categories.length})</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-[#FBFAF6]">
                  <th className="px-5 py-3.5 text-[11px] font-bold text-gray-600">Category Name</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-gray-600">Status</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-gray-400 font-bold">
                      No expense categories configured.
                    </td>
                  </tr>
                ) : (
                  categories.map((c) => {
                    const isEditing = editing?.id === c.id;
                    return (
                      <tr key={c.id} className={`transition-colors ${isEditing ? 'bg-[#C9B79C]/10' : 'hover:bg-gray-50/70'}`}>
                        <td className="px-5 py-3.5 font-bold text-gray-900">
                          <div className="flex items-center gap-2">
                            <span>{c.name}</span>
                            {isEditing && (
                              <span className="text-[10px] font-bold text-[#C9B79C] bg-[#111111] px-2 py-0.5 rounded-full">
                                Editing
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Active
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => startEdit(c)}
                              title={`Edit ${c.name}`}
                              className={`w-8 h-8 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer ${
                                isEditing
                                  ? 'bg-[#111111] text-[#C9B79C] border border-[#C9B79C]/50 shadow-xs'
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              <Pen size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => remove(c)}
                              title={`Delete ${c.name}`}
                              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-rose-50 hover:text-rose-600 text-gray-500 inline-flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} />
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
      </div>
    </div>
  );
}

export function ExpensesView(_props: { lang?: 'en' | 'ta' }) {
  const [tab, setTab] = useState<'expenses' | 'categories'>('expenses');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRecord | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/expense-categories');
      if (res.ok) setCategories(await res.json());
    } catch (err) {
      console.warn('Failed to load categories:', err);
    }
  }, []);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/expenses');
      if (res.ok) setExpenses((await res.json()).expenses || []);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadCategories(), loadExpenses()]);
  }, [loadCategories, loadExpenses]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const metrics = useMemo(() => summarize(expenses), [expenses]);

  const activeFilterCount = (categoryFilter !== 'all' ? 1 : 0) + (datePreset !== 'all' || fromDate || toDate ? 1 : 0);

  const visible = useMemo(() => {
    const selected = categories.find((c) => String(c.id) === categoryFilter);
    let rows = expenses.filter((e) => {
      const day = expenseDay(e);
      if (fromDate && day < fromDate) return false;
      if (toDate && day > toDate) return false;
      if (categoryFilter !== 'all') {
        const byId = String(e.categoryId) === categoryFilter;
        const byName = selected && e.categoryName.toLowerCase() === selected.name.toLowerCase();
        if (!byId && !byName) return false;
      }
      return true;
    });
    const q = search.toLowerCase().trim();
    if (q) {
      rows = rows.filter(
        (e) =>
          e.description?.toLowerCase().includes(q) ||
          e.categoryName?.toLowerCase().includes(q) ||
          e.recordedByName?.toLowerCase().includes(q) ||
          String(rupees(e.amountInPaise)).includes(q)
      );
    }
    return rows.sort((a, b) => expenseDay(b).localeCompare(expenseDay(a)));
  }, [expenses, categories, fromDate, toDate, categoryFilter, search]);

  const applyPreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();
    const today = toDateKey(now);
    if (preset === 'all') {
      setFromDate('');
      setToDate('');
    } else if (preset === 'today') {
      setFromDate(today);
      setToDate(today);
    } else if (preset === 'week') {
      const start = new Date(now);
      start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      setFromDate(toDateKey(start));
      setToDate(today);
    } else if (preset === 'month') {
      setFromDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
      setToDate(today);
    } else {
      setShowFilters(true);
    }
  };

  const resetFilters = () => {
    setFromDate('');
    setToDate('');
    setDatePreset('all');
    setCategoryFilter('all');
    setSearch('');
    setShowFilters(false);
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this expense record?')) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch {
      alert('Could not delete expense record');
    }
  };

  const onSaved = (saved: ExpenseRecord) => {
    setExpenses((prev) => (prev.some((e) => e.id === saved.id) ? prev.map((e) => (e.id === saved.id ? saved : e)) : [saved, ...prev]));
    setModalOpen(false);
    setEditing(null);
  };

  const selectCls =
    'w-full h-10 appearance-none pl-3 pr-7 rounded-xl bg-[#FAF7F2] border border-gray-200 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#C9B79C] cursor-pointer hover:bg-gray-100 transition-colors truncate';
  const dateCls =
    'w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-[#FAF7F2] text-xs font-semibold text-gray-800 outline-none focus:border-[#C9B79C] focus:bg-white';

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#111111] flex items-center gap-2">
            <Receipt size={22} className="text-[#7A6A4F]" />
            Expense Tracker
          </h2>
          <p className="text-xs text-gray-500 font-bold mt-0.5">
            Monitor store overheads, operating costs, and categorized expenses
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
          {(['expenses', 'categories'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tab === t ? 'bg-[#111111] text-[#C9B79C] shadow-sm' : 'text-gray-600 hover:text-[#111111]'
              }`}
            >
              {t === 'expenses' ? 'Expenses' : 'Categories'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'categories' ? (
        <CategoriesPanel categories={categories} onCategoriesUpdated={refreshAll} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {[
              { label: 'Today', value: metrics.today },
              { label: 'This Week', value: metrics.this_week },
              { label: 'This Month', value: metrics.this_month },
              { label: 'This Year', value: metrics.this_year },
              { label: 'Total All Time', value: metrics.total_all_time },
            ].map((m) => (
              <div
                key={m.label}
                className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-[#111111]/30 transition-all group"
              >
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-[11px] font-bold text-gray-500">{m.label}</span>
                  <div className="w-6 h-6 rounded-lg bg-[#FAF7F2] border border-[#DDD2BE] flex items-center justify-center text-[#111111] group-hover:scale-105 transition-transform">
                    <TrendingDown size={13} />
                  </div>
                </div>
                <div className="text-base sm:text-lg font-black text-[#111111] tracking-tight">{formatInr(m.value)}</div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
              <div className="relative flex-1 min-w-0">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search description, category, staff, amount..."
                  className="w-full h-10 pl-9 pr-8 rounded-xl border border-gray-200 bg-[#FAF7F2] text-xs font-semibold text-gray-900 placeholder-gray-400 outline-none focus:border-[#C9B79C] focus:bg-white transition-colors"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 sm:flex items-center gap-2 shrink-0">
                <div className="relative min-w-0">
                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={`${selectCls} sm:w-36 lg:w-40`}>
                    <option value="all">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
                <div className="relative min-w-0">
                  <select value={datePreset} onChange={(e) => applyPreset(e.target.value as DatePreset)} className={`${selectCls} sm:w-32 lg:w-36`}>
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="custom">Custom</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowFilters((v) => !v)}
                  title="Toggle detailed filters"
                  className={`w-full sm:w-auto h-10 px-2.5 sm:px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-w-0 shrink-0 ${
                    showFilters || activeFilterCount > 0
                      ? 'bg-[#111111] text-white border-[#111111]'
                      : 'bg-[#FAF7F2] text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <SlidersHorizontal size={12} className="shrink-0" />
                  <span className="truncate">Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-[#C9B79C] text-[#111111] text-[9px] font-black flex items-center justify-center shrink-0">
                      {activeFilterCount}
                    </span>
                  )}
                  <ChevronDown size={11} className={`transition-transform duration-200 shrink-0 ${showFilters ? 'rotate-180' : ''}`} />
                </button>
              </div>

              <div className="flex items-center gap-2 shrink-0 justify-end">
                <button
                  type="button"
                  onClick={refreshAll}
                  title="Refresh Expenses"
                  className="h-10 w-10 rounded-xl border border-gray-200 bg-[#FAF7F2] hover:bg-gray-100 flex items-center justify-center text-gray-600 hover:text-[#111111] transition-colors cursor-pointer shrink-0"
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                </button>
                <button
                  type="button"
                  onClick={() => downloadCsv(visible)}
                  disabled={visible.length === 0}
                  className="h-10 px-3 sm:px-3.5 rounded-xl border border-gray-200 bg-[#FAF7F2] text-xs font-bold text-gray-800 hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shrink-0 shadow-xs"
                >
                  <Download size={13} />
                  <span className="hidden sm:inline">Export</span> CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setModalOpen(true);
                  }}
                  className="h-10 px-3 sm:px-4 rounded-xl bg-[#111111] border border-[#C9B79C]/60 text-[#C9B79C] text-xs font-bold hover:bg-[#262626] transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus size={14} />
                  <span className="whitespace-nowrap">Record Expense</span>
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="pt-3 pb-1 border-t border-gray-100 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                  <span className="uppercase text-[10px] tracking-wider text-gray-600 flex items-center gap-1">
                    <SlidersHorizontal size={11} /> Detailed Filters
                  </span>
                  {(activeFilterCount > 0 || search) && (
                    <button type="button" onClick={resetFilters} className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer">
                      Reset All Filters
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">From Date</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => {
                          setFromDate(e.target.value);
                          setDatePreset('custom');
                        }}
                        className={dateCls}
                      />
                      <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">To Date</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={toDate}
                        onChange={(e) => {
                          setToDate(e.target.value);
                          setDatePreset('custom');
                        }}
                        className={dateCls}
                      />
                      <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-gray-100 bg-[#FAFAFA] flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-800">Expense Records ({visible.length})</h4>
              {categoryFilter !== 'all' && (
                <span className="text-[11px] font-bold text-gray-500">
                  Filtered by Category:{' '}
                  <span className="text-gray-900">
                    {categories.find((c) => String(c.id) === categoryFilter)?.name || categoryFilter}
                  </span>
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-[#FBFAF6]">
                    <th className="px-5 py-3.5 text-[11px] font-bold text-gray-600">Date</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-gray-600">Category</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-gray-600">Description</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-gray-600 text-right">Amount (₹)</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-gray-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-gray-400 font-bold">
                        <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-[#7A6A4F]" />
                        Loading expenses...
                      </td>
                    </tr>
                  ) : visible.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-gray-400 font-bold">
                        <Layers size={32} className="mx-auto mb-2 opacity-30" />
                        No expense records found matching the filters.
                      </td>
                    </tr>
                  ) : (
                    visible.map((e) => (
                      <tr key={e.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-gray-900 whitespace-nowrap">{expenseDay(e)}</td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#FAF7F2] text-[#111111] border border-[#DDD2BE]">
                            {e.categoryName}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-gray-700 max-w-[280px] truncate">{e.description || '—'}</td>
                        <td className="px-5 py-3.5 text-right font-black text-sm text-[#111111] whitespace-nowrap">
                          {formatInr(rupees(e.amountInPaise))}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditing(e);
                                setModalOpen(true);
                              }}
                              title="Edit record"
                              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 inline-flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Pen size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => remove(e.id)}
                              title="Delete record"
                              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-rose-50 hover:text-rose-600 text-gray-500 inline-flex items-center justify-center transition-colors cursor-pointer"
                            >
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

          <ExpenseModal
            isOpen={modalOpen}
            onClose={() => {
              setModalOpen(false);
              setEditing(null);
            }}
            onSuccess={onSaved}
            categories={categories}
            expenseToEdit={editing}
          />
        </div>
      )}
    </div>
  );
}
