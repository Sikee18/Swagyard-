'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Cake,
  ChevronLeft,
  ChevronRight,
  Download,
  Gift,
  MessageCircle,
  Pencil,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';

interface BirthdayRecord {
  id: number;
  name: string;
  phone: string;
  birthDate: string;
}

interface Offer {
  id: string;
  label: string;
}

type RangeKey = 'today' | 'week' | 'month' | 'all';

const STORE_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Swagyard';
const STORE_PHONE = process.env.NEXT_PUBLIC_STORE_PHONE || '+91 63853 68479';
const STORE_INSTA = process.env.NEXT_PUBLIC_STORE_INSTA || 'swagyard.retail';

const OFFERS_KEY = 'swagyard_birthday_offers_v1';
const TEMPLATE_KEY = 'swagyard_birthday_template_v1';

const DEFAULT_TEMPLATE = `Hi {name}! 🎂 Happy Birthday!

Here's a special treat from ${STORE_NAME}:
🎁 {offer}

Visit us in store or call ${STORE_PHONE}.
Follow us on Instagram @${STORE_INSTA}

– ${STORE_NAME}`;

const DEFAULT_OFFERS: Offer[] = [{ id: 'default-20', label: '20% OFF' }];

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const RANGES: { key: RangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All' },
];

const CARD = 'bg-white rounded-2xl border border-gray-200 shadow-sm';
const SELECT =
  'w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-[13px] font-bold text-[#111111] focus:outline-none focus:border-[#C9B79C]';

const pad = (n: number) => String(n).padStart(2, '0');
/** "MM-DD" key for a Date */
const dayKey = (d: Date) => `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** "MM-DD" key from a stored birth date ("YYYY-MM-DD..." ISO string) */
const birthKey = (birthDate: string) => birthDate.slice(5, 10);
/** "DD/MM" display from a stored birth date */
const formatDayMonth = (birthDate: string) => {
  const [m, d] = birthKey(birthDate).split('-');
  return m && d ? `${d}/${m}` : birthDate;
};

/** Inclusive MM-DD range check that wraps across the year end (e.g. 12-28 → 01-03). */
const inRange = (key: string, from: string, to: string) => {
  const f = from || '01-01';
  const t = to || '12-31';
  return f <= t ? key >= f && key <= t : key >= f || key <= t;
};

const rangeFor = (range: RangeKey, now = new Date()) => {
  switch (range) {
    case 'today':
      return { from: dayKey(now), to: dayKey(now) };
    case 'week':
      return { from: dayKey(now), to: dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6)) };
    case 'month': {
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      return { from: `${pad(now.getMonth() + 1)}-01`, to: `${pad(now.getMonth() + 1)}-${pad(last)}` };
    }
    default:
      return { from: '', to: '' };
  }
};

const fillTemplate = (template: string, name: string, offer: string) =>
  template.replace(/\{name\}/g, name.trim() || 'Customer').replace(/\{offer\}/g, offer);

/** +91 XXXXX XXXXX display format */
const formatPhone = (phone: string) => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  return local.length === 10 ? `+91 ${local.slice(0, 5)} ${local.slice(5)}` : phone;
};

const whatsappLink = (phone: string, text: string) => {
  const digits = phone.replace(/\D/g, '');
  const intl = digits.length === 10 ? `91${digits}` : digits;
  return `https://api.whatsapp.com/send?phone=${intl}&text=${encodeURIComponent(text)}`;
};

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function MonthDayPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [month, day] = value ? value.split('-').map(Number) : [0, 0];
  const cls =
    'h-10 pl-3 pr-1 bg-white border border-gray-200 rounded-xl text-[13px] font-bold text-[#111111] focus:outline-none focus:border-[#C9B79C] min-w-0';

  const setMonth = (m: number) => {
    if (!m) return onChange('');
    onChange(`${pad(m)}-${pad(Math.min(day || 1, DAYS_IN_MONTH[m - 1]))}`);
  };
  const setDay = (d: number) => onChange(`${pad(month || 1)}-${pad(d)}`);

  return (
    <div>
      <span className="block text-[10px] font-black text-[#6B7280] mb-1">{label}</span>
      <div className="grid grid-cols-[3fr_2fr] gap-2">
        <select aria-label={`${label} month`} className={cls} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          <option value={0}>Month</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <select
          aria-label={`${label} day`}
          className={cls}
          value={day}
          disabled={!month}
          onChange={(e) => setDay(Number(e.target.value))}
        >
          <option value={0}>Day</option>
          {Array.from({ length: month ? DAYS_IN_MONTH[month - 1] : 0 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function RangePicker({
  range,
  from,
  to,
  onRange,
  onFrom,
  onTo,
}: {
  range: RangeKey;
  from: string;
  to: string;
  onRange: (r: RangeKey) => void;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
}) {
  return (
    <>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => onRange(r.key)}
            className={`px-3 py-1 rounded-lg text-[11px] font-black ${
              range === r.key ? 'bg-[#111111] text-[#C9B79C]' : 'bg-gray-100 text-[#374151] hover:bg-gray-200'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3">
        <MonthDayPicker label="FROM" value={from} onChange={onFrom} />
        <MonthDayPicker label="TO" value={to} onChange={onTo} />
      </div>
    </>
  );
}

function PeopleList({
  people,
  loading,
  onSend,
  onDelete,
}: {
  people: BirthdayRecord[];
  loading: boolean;
  onSend: (p: BirthdayRecord) => void;
  onDelete: (p: BirthdayRecord) => void;
}) {
  if (loading) return <p className="text-[12px] text-gray-500 p-3">Loading…</p>;
  if (!people.length) return <p className="text-[12px] text-gray-500 p-3">No birthdays found for this range.</p>;

  return (
    <div className="divide-y divide-gray-100">
      {people.map((p) => (
        <div key={p.id} className="flex items-center gap-3 py-2.5 px-2">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-[#111111] truncate">{p.name || 'Customer'}</p>
            <p className="text-[11px] text-gray-500">
              {formatPhone(p.phone)} · {formatDayMonth(p.birthDate)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSend(p)}
            className="flex items-center gap-1 px-3 h-8 rounded-lg bg-[#059669] text-white text-[10px] font-black uppercase"
          >
            <MessageCircle size={13} /> Send Offer
          </button>
          <button
            type="button"
            aria-label="Delete"
            onClick={() => onDelete(p)}
            className="w-8 h-8 border border-red-200 rounded-lg text-red-500 flex items-center justify-center"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function BirthdaysView(_props: { lang?: 'en' | 'ta' }) {
  const today = useMemo(() => new Date(), []);
  const [tab, setTab] = useState<'calendar' | 'customers'>('calendar');
  const [records, setRecords] = useState<BirthdayRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [range, setRange] = useState<RangeKey>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [offers, setOffers] = useState<Offer[]>(DEFAULT_OFFERS);
  const [offerId, setOfferId] = useState(DEFAULT_OFFERS[0].id);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [templateDirty, setTemplateDirty] = useState(false);

  useEffect(() => {
    const stored = readStored<Offer[]>(OFFERS_KEY, []);
    const initialOffers = stored.length ? stored : DEFAULT_OFFERS;
    setOffers(initialOffers);
    setOfferId(initialOffers[0].id);
    setTemplate(readStored(TEMPLATE_KEY, DEFAULT_TEMPLATE));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/birthdays')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: BirthdayRecord[]) => {
        if (cancelled) return;
        setRecords([...data].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
        setLoading(false);
      })
      .catch(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const offer = offers.find((o) => o.id === offerId) || offers[0];

  const pickRange = (r: RangeKey) => {
    const next = rangeFor(r);
    setRange(r);
    setFrom(next.from);
    setTo(next.to);
  };
  const pickFrom = (v: string) => {
    setRange('all');
    setFrom(v);
  };
  const pickTo = (v: string) => {
    setRange('all');
    setTo(v);
  };

  const filtered = useMemo(() => records.filter((r) => inRange(birthKey(r.birthDate), from, to)), [records, from, to]);

  const byDay = useMemo(() => {
    const map = new Map<string, BirthdayRecord[]>();
    for (const r of records) {
      const key = birthKey(r.birthDate);
      map.set(key, [...(map.get(key) || []), r]);
    }
    return map;
  }, [records]);

  const shiftMonth = (delta: number) => setViewMonth((m) => (m + delta + 12) % 12);
  const preview = fillTemplate(template, filtered[0]?.name || 'Aarav', offer?.label || '');
  const todayKey = dayKey(today);

  const sendOffer = (p: BirthdayRecord) => {
    window.open(whatsappLink(p.phone, fillTemplate(template, p.name, offer?.label || '')), '_blank', 'noopener');
  };

  const deleteRecord = async (p: BirthdayRecord) => {
    if (!window.confirm(`Remove birthday for ${p.name || p.phone}?`)) return;
    try {
      const res = await fetch(`/api/birthdays/${p.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Could not delete');
      setRecords((prev) => prev.filter((r) => r.id !== p.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete');
    }
  };

  const addOffer = () => {
    const label = window.prompt('Offer text (e.g. 20% OFF)')?.trim();
    if (!label) return;
    const next = [...offers, { id: `o-${Date.now()}`, label }];
    setOffers(next);
    setOfferId(next[next.length - 1].id);
    writeStored(OFFERS_KEY, next);
  };

  const editOffer = () => {
    if (!offer) return;
    const label = window.prompt('Edit offer text', offer.label)?.trim();
    if (!label) return;
    const next = offers.map((o) => (o.id === offer.id ? { ...o, label } : o));
    setOffers(next);
    writeStored(OFFERS_KEY, next);
  };

  const deleteOffer = () => {
    if (!offer || offers.length <= 1) return;
    const next = offers.filter((o) => o.id !== offer.id);
    setOffers(next);
    setOfferId(next[0].id);
    writeStored(OFFERS_KEY, next);
  };

  const saveTemplate = () => {
    writeStored(TEMPLATE_KEY, template);
    setTemplateDirty(false);
  };

  const exportCsv = () => {
    const quote = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [
      ['Customer', 'Mobile', 'Birthday (DD/MM)'],
      ...filtered.map((r) => [r.name, r.phone, formatDayMonth(r.birthDate)]),
    ];
    const blob = new Blob([rows.map((row) => row.map(quote).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'birthdays.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const rangePicker = (
    <RangePicker range={range} from={from} to={to} onRange={pickRange} onFrom={pickFrom} onTo={pickTo} />
  );
  const peopleList = <PeopleList people={filtered} loading={loading} onSend={sendOffer} onDelete={deleteRecord} />;

  return (
    <div className="p-4 md:p-8 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-[#F1EBE0] flex items-center justify-center text-[#7A6A4F]">
          <Cake size={22} />
        </div>
        <div>
          <h2 className="text-xl font-black text-[#111111]">Date of Birth</h2>
          <p className="text-[12px] font-medium text-gray-500">Customer birthdays &amp; one-tap offer sender</p>
        </div>
      </div>

      <div className="flex gap-6 border-b border-gray-200">
        {(['calendar', 'customers'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`pb-2 text-[13px] font-black capitalize border-b-2 -mb-px ${
              tab === t ? 'border-[#7A6A4F] text-[#7A6A4F]' : 'border-transparent text-gray-500 hover:text-[#111111]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <p className="text-[12px] font-bold text-red-600">{error}</p>}

      {tab === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-4 items-start">
          <div className="space-y-4">
            <div className={`${CARD} p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <select
                  className="h-9 px-2 border border-gray-200 rounded-lg text-[12px] font-bold"
                  value={viewMonth}
                  onChange={(e) => setViewMonth(Number(e.target.value))}
                >
                  {SHORT_MONTHS.map((m, i) => (
                    <option key={m} value={i}>
                      {m}
                    </option>
                  ))}
                </select>
                <div className="ml-auto flex gap-1">
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() => shiftMonth(-1)}
                    className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMonth(today.getMonth())}
                    className="px-2 h-8 border border-gray-200 rounded-lg text-[11px] font-bold"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    aria-label="Next month"
                    onClick={() => shiftMonth(1)}
                    className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
                {Array.from({ length: DAYS_IN_MONTH[viewMonth] }, (_, i) => i + 1).map((day) => {
                  const key = `${pad(viewMonth + 1)}-${pad(day)}`;
                  const people = byDay.get(key);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        setRange('all');
                        setFrom(key);
                        setTo(key);
                      }}
                      title={people ? people.map((p) => p.name || p.phone).join(', ') : undefined}
                      className={`h-8 rounded-md border text-[11px] font-bold flex flex-col items-center justify-center leading-none ${
                        key === todayKey ? 'border-[#C9B79C] bg-[#F1EBE0]' : 'border-gray-200 hover:bg-gray-50'
                      } ${from === key && to === key ? 'ring-2 ring-[#7A6A4F]' : ''}`}
                    >
                      {day}
                      {people && <span className="w-1 h-1 rounded-full bg-red-500 mt-0.5" />}
                    </button>
                  );
                })}
              </div>

              <p className="mt-3 text-[10px] text-gray-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Dot = birthday
              </p>
            </div>

            <div className={`${CARD} p-4`}>
              <p className="text-[12px] font-black text-[#111111] mb-2">Step 1 · Pick a date or range</p>
              {rangePicker}
            </div>
          </div>

          <div className="space-y-4">
            <div className={`${CARD} p-4 md:p-5`}>
              <h3 className="text-[14px] font-black text-[#111111]">
                Step 2 · Customers with birthdays ({filtered.length})
              </h3>
              <p className="text-[11px] text-gray-500 mb-3">
                Pick a date or range on the left, then tap Send Offer on a customer.
              </p>
              {peopleList}
            </div>

            <div className={`${CARD} p-4 md:p-5`}>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-[#F1EBE0] flex items-center justify-center text-[#7A6A4F]">
                  <Gift size={18} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-black text-[#111111]">Step 3 · Customise offer message</h3>
                  <p className="text-[11px] text-gray-500">Sent on WhatsApp when you tap &quot;Send Offer&quot;.</p>
                </div>
                <button
                  type="button"
                  onClick={saveTemplate}
                  disabled={!templateDirty}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-[12px] font-black bg-[#111111] text-[#C9B79C] disabled:bg-gray-200 disabled:text-gray-400"
                >
                  <Save size={14} /> Save
                </button>
              </div>

              <p className="text-[10px] font-black text-[#6B7280] mb-1">SELECT OFFER</p>
              <div className="flex gap-2 mb-2">
                <select className={SELECT} value={offer?.id} onChange={(e) => setOfferId(e.target.value)}>
                  {offers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label="Edit offer"
                  onClick={editOffer}
                  className="w-10 h-10 shrink-0 border border-gray-200 rounded-xl flex items-center justify-center text-[#7A6A4F]"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  aria-label="Delete offer"
                  onClick={deleteOffer}
                  disabled={offers.length <= 1}
                  className="w-10 h-10 shrink-0 border border-red-200 bg-red-50 rounded-xl flex items-center justify-center text-red-500 disabled:opacity-40"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <button
                type="button"
                onClick={addOffer}
                className="w-full h-9 mb-4 border border-dashed border-[#C9B79C] rounded-xl text-[12px] font-black text-[#7A6A4F] flex items-center justify-center gap-1"
              >
                <Plus size={14} /> Add Offer
              </button>

              <p className="text-[10px] font-black text-[#6B7280] mb-1">CUSTOMIZE MESSAGE</p>
              <textarea
                rows={6}
                value={template}
                onChange={(e) => {
                  setTemplate(e.target.value);
                  setTemplateDirty(true);
                }}
                className="w-full p-3 border border-gray-200 rounded-xl text-[13px] font-semibold text-[#111111] focus:outline-none focus:border-[#C9B79C]"
              />
              <p className="text-[10px] text-gray-500 mt-1 mb-4">
                Use <b>{'{name}'}</b> for the customer&apos;s name and <b>{'{offer}'}</b> for the selected offer.
              </p>

              <div className="rounded-xl bg-[#F3F9F1] border border-green-200 p-4">
                <p className="text-[10px] font-black text-[#6B7280] mb-2">MESSAGE PREVIEW</p>
                <p className="text-[13px] text-[#111111] whitespace-pre-wrap">{preview}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className={`${CARD} p-4`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-black text-[#111111]">Filter by upcoming birthday</p>
              <button
                type="button"
                onClick={exportCsv}
                disabled={!filtered.length}
                className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-green-50 text-green-700 text-[11px] font-black disabled:opacity-40"
              >
                <Download size={13} /> Export CSV
              </button>
            </div>
            {rangePicker}
          </div>
          <div className={`${CARD} p-2 md:p-4`}>{peopleList}</div>
        </div>
      )}
    </div>
  );
}
