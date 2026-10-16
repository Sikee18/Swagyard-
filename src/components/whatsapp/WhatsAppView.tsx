'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageCircle,
  Share2,
  Users,
  FileText,
  Cake,
  Calendar,
  Sparkles,
  Phone,
  User,
  Send,
  Copy,
  CheckCircle2,
} from 'lucide-react';

interface Contact {
  name: string;
  phone: string;
  type: 'order' | 'birthday' | 'advance';
  meta?: string;
}

export function WhatsAppView({ lang = 'en' }: { lang?: 'en' | 'ta' }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<'invoice' | 'birthday' | 'advance' | 'promo'>('promo');
  const [customNote, setCustomNote] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadContacts = async () => {
      try {
        setLoading(true);
        const [ordersRes, bdaysRes, advRes] = await Promise.all([
          fetch('/api/orders?preset=30d'),
          fetch('/api/birthdays'),
          fetch('/api/advance-orders'),
        ]);

        const list: Contact[] = [];
        const seenPhones = new Set<string>();

        if (ordersRes.ok) {
          const oData = await ordersRes.json();
          (oData.orders || []).forEach((o: any) => {
            if (o.phone && !seenPhones.has(o.phone)) {
              seenPhones.add(o.phone);
              list.push({
                name: o.customerName || 'Customer',
                phone: o.phone,
                type: 'order',
                meta: `Inv #${o.invoiceNo}`,
              });
            }
          });
        }

        if (bdaysRes.ok) {
          const bData = await bdaysRes.json();
          (bData || []).forEach((b: any) => {
            if (b.phone && !seenPhones.has(b.phone)) {
              seenPhones.add(b.phone);
              list.push({
                name: b.name,
                phone: b.phone,
                type: 'birthday',
                meta: 'Birthday Contact',
              });
            }
          });
        }

        if (advRes.ok) {
          const aData = await advRes.json();
          (aData || []).forEach((a: any) => {
            if (a.phone && !seenPhones.has(a.phone)) {
              seenPhones.add(a.phone);
              list.push({
                name: a.customerName,
                phone: a.phone,
                type: 'advance',
                meta: `Adv #${a.referenceNumber}`,
              });
            }
          });
        }

        setContacts(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadContacts();
  }, []);

  const handleSelectContact = (c: Contact) => {
    setSelectedContact(c);
    setPhone(c.phone);
    setCustomerName(c.name);
  };

  // Build message based on template
  const getCompiledMessage = () => {
    const name = customerName.trim() || 'Valued Customer';
    if (selectedTemplate === 'invoice') {
      return `Hello ${name}! Thank you for shopping with us at Swagyard Clothing (Ammoor, Ranipet). Your digital tax invoice is available. Please preserve it for exchanges within 7 days. We look forward to serving you again! ${customNote}`;
    }
    if (selectedTemplate === 'birthday') {
      return `Dear ${name}, Happy Birthday from all of us at Swagyard! 🎂✨ To make your day extra special, enjoy an exclusive 10% discount on your next visit with coupon code: SWAG10. Visit us at 174 Brazzer St, Ammoor, Ranipet! ${customNote}`;
    }
    if (selectedTemplate === 'advance') {
      return `Dear ${name}, greeting from Swagyard! Your custom tailored / advance outfit is ready for pickup at our store. Please drop by at your convenience to complete the final trial. Store Ph: +91 63853 68479. ${customNote}`;
    }
    // Promo / New collection broadcast
    return `Hello ${name}! Swagyard has just launched its premium new festive collection: pure cotton shirts, stretch formal trousers, trendy oversized tees & accessories. Visit our store at Ammoor, Ranipet or message us to reserve your sizes! ${customNote}`;
  };

  const compiledMsg = getCompiledMessage();

  const handleCopy = () => {
    navigator.clipboard.writeText(compiledMsg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const cleanPhone = phone.replace(/\D/g, '');
    const url = cleanPhone
      ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(compiledMsg)}`
      : `https://wa.me/?text=${encodeURIComponent(compiledMsg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#FAF7F2] border border-black/10 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <MessageCircle size={18} />
            </div>
            <h2 className="text-base font-black text-black">
              {lang === 'en' ? 'WhatsApp Communications Center' : 'வாட்ஸ்அப் தகவல் மையம்'}
            </h2>
          </div>
          <p className="text-xs text-black/60 mt-1 max-w-xl">
            {lang === 'en'
              ? 'Send automated receipts, birthday discount codes, ready-for-pickup alerts, and restock broadcasts directly to customer phones via WhatsApp Web.'
              : 'வாடிக்கையாளர் தொலைபேசிக்கு பில், பிறந்தநாள் வாழ்த்து மற்றும் ஆர்டர் தகவல்களை உடனடியாக அனுப்புங்கள்.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-800 text-xs font-black border border-emerald-500/20">
            {contacts.length} Registered Customers
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Customer Directory */}
        <div className="bg-white border border-black/10 rounded-2xl p-5 shadow-sm flex flex-col h-[520px]">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-[#7A6A4F]" />
            <h3 className="font-black text-xs uppercase tracking-wider text-black">
              Recent Store Customers
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-black/5 pr-1">
            {loading ? (
              <div className="text-center py-8 text-xs text-black/40">Loading directory...</div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-8 text-xs text-black/40">
                No customer contacts found yet. Customers will appear here automatically upon billing.
              </div>
            ) : (
              contacts.map((c, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectContact(c)}
                  className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between ${
                    phone === c.phone
                      ? 'bg-[#111111] text-white shadow-sm'
                      : 'hover:bg-[#FAF7F2] text-black'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs">{c.name}</div>
                    <div
                      className={`text-[11px] font-mono ${
                        phone === c.phone ? 'text-[#C9B79C]' : 'text-black/50'
                      }`}
                    >
                      +91 {c.phone}
                    </div>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      phone === c.phone
                        ? 'bg-white/10 text-white'
                        : 'bg-black/5 text-black/60'
                    }`}
                  >
                    {c.meta}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Center & Right: Composer & Preview */}
        <div className="lg:col-span-2 space-y-4">
          {/* Template Selector */}
          <div className="bg-[#FAF7F2] border border-black/10 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-black/50 block mb-2">
              Select Message Campaign Template
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'promo', label: 'Festive Broadcast', icon: Sparkles },
                { id: 'invoice', label: 'Receipt / Tax Bill', icon: FileText },
                { id: 'birthday', label: 'Birthday + Coupon', icon: Cake },
                { id: 'advance', label: 'Ready for Pickup', icon: Calendar },
              ].map((tpl) => {
                const Icon = tpl.icon;
                return (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl.id as any)}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${
                      selectedTemplate === tpl.id
                        ? 'bg-[#111111] text-[#C9B79C] border-[#111111] shadow-md'
                        : 'bg-white text-black/70 border-black/10 hover:border-black/20'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="text-[11px]">{tpl.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Fields */}
          <div className="bg-white border border-black/10 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-black/70 font-bold mb-1">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  className="w-full bg-[#FAF7F2] border border-black/15 rounded-xl p-2.5 text-black outline-none focus:border-[#C9B79C]"
                />
              </div>

              <div>
                <label className="block text-black/70 font-bold mb-1">WhatsApp Phone Number *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full bg-[#FAF7F2] border border-black/15 rounded-xl p-2.5 text-black outline-none focus:border-[#C9B79C] font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-black/70 font-bold mb-1">
                Custom Personal Note (Appended to message)
              </label>
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="e.g. Hope you like the trial fitting!"
                className="w-full bg-[#FAF7F2] border border-black/15 rounded-xl p-2.5 text-black outline-none focus:border-[#C9B79C]"
              />
            </div>

            {/* Live Message Preview */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-black/70 font-bold">Live Message Preview</label>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-[11px] text-[#7A6A4F] hover:text-black flex items-center gap-1 font-bold"
                >
                  <Copy size={12} />
                  <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-black/10 font-sans text-xs text-black/80 leading-relaxed whitespace-pre-wrap">
                {compiledMsg}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-black/10">
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-[0.99]"
              >
                <Share2 size={16} />
                <span>Launch in WhatsApp Web</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
