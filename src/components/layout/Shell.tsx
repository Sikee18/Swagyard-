'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShoppingBag,
  Boxes,
  CalendarClock,
  Cake,
  ReceiptText,
  History,
  BarChart3,
  Tag,
  LogOut,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sparkles,
  ShieldCheck,
  MapPin,
  Phone,
  Menu,
  X,
  MessageCircle
} from 'lucide-react';
import { useAudioAlarm } from '@/hooks/useAudioAlarm';
import { LowStockModal, LowStockItem } from './LowStockModal';

export type NavTabId =
  | 'pos'
  | 'inventory'
  | 'advance_orders'
  | 'birthdays'
  | 'expenses'
  | 'order_history'
  | 'pos_analytics'
  | 'coupons'
  | 'whatsapp';

interface ShellProps {
  children: (tab: NavTabId, lang: 'en' | 'ta', navigate: (tab: NavTabId) => void) => React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Active tab state from query parameter or default 'pos'
  const initialTab = (searchParams.get('tab') as NavTabId) || 'pos';
  const [activeTab, setActiveTab] = useState<NavTabId>(initialTab);
  const [lang, setLang] = useState<'en' | 'ta'>('en');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Audio Alarm Hook
  const { isMuted, toggleMute, playTestChime, startLowStockAlarm, stopLowStockAlarm } = useAudioAlarm();

  // Low stock alarm modal state
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [showLowStockModal, setShowLowStockModal] = useState(false);

  // Fetch low stock items on initial load to verify alarm
  useEffect(() => {
    async function checkLowStock() {
      try {
        const res = await fetch('/api/inventory');
        if (res.ok) {
          const prods = await res.json();
          const lowItems: LowStockItem[] = [];
          for (const p of prods) {
            if (p.stockQuantity <= (p.lowStockAlert || 5)) {
              lowItems.push({
                id: p.id,
                name: p.name,
                stock: p.stockQuantity,
                limit: p.lowStockAlert || 5
              });
            }
          }
          if (lowItems.length > 0) {
            setLowStockItems(lowItems);
            // Only trigger alarm modal once per session
            const acknowledged = sessionStorage.getItem('swagyard_alarm_silenced');
            if (!acknowledged) {
              setShowLowStockModal(true);
              startLowStockAlarm();
            }
          }
        }
      } catch {}
    }
    checkLowStock();
  }, [startLowStockAlarm]);

  const handleSilenceAlarm = () => {
    setShowLowStockModal(false);
    stopLowStockAlarm();
    sessionStorage.setItem('swagyard_alarm_silenced', '1');
  };

  const handleTabChange = (tab: NavTabId) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    const url = tab === 'pos' ? '/dashboard' : `/dashboard?tab=${tab}`;
    window.history.pushState(null, '', url);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    sessionStorage.removeItem('swagyard_alarm_silenced');
    router.push('/admin-login');
  };

  const navItems: { id: NavTabId; labelEn: string; labelTa: string; icon: React.ReactNode }[] = [
    { id: 'pos', labelEn: 'Billing Panel', labelTa: 'பில்லிங் பலகை', icon: <ShoppingBag size={18} /> },
    { id: 'inventory', labelEn: 'Inventory & Barcodes', labelTa: 'சரக்கு & பார்கோடுகள்', icon: <Boxes size={18} /> },
    { id: 'advance_orders', labelEn: 'Advance Orders', labelTa: 'முன்பதிவு ஆர்டர்கள்', icon: <CalendarClock size={18} /> },
    { id: 'birthdays', labelEn: 'Birthdays', labelTa: 'பிறந்தநாட்கள்', icon: <Cake size={18} /> },
    { id: 'expenses', labelEn: 'Expenses', labelTa: 'செலவுகள்', icon: <ReceiptText size={18} /> },
    { id: 'order_history', labelEn: 'Order History', labelTa: 'விற்பனை வரலாறு', icon: <History size={18} /> },
    { id: 'pos_analytics', labelEn: 'Analytics Dashboard', labelTa: 'பகுப்பாய்வு பலகை', icon: <BarChart3 size={18} /> },
    { id: 'coupons', labelEn: 'Coupons', labelTa: 'கூப்பன்கள்', icon: <Tag size={18} /> },
    { id: 'whatsapp', labelEn: 'WhatsApp Center', labelTa: 'வாட்ஸ்அப் மையம்', icon: <MessageCircle size={18} /> },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#FAF7F2]">
      {/* Low Stock Alarm Modal Overlay */}
      <LowStockModal
        isOpen={showLowStockModal}
        items={lowStockItems}
        onSilence={handleSilenceAlarm}
        onTestSound={playTestChime}
      />

      {/* Sidebar Navigation (Desktop / Tablet) */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-[#111111] text-white shrink-0 border-r border-[#262626] select-none z-30">
        {/* Brand Banner */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#111111] to-[#262626] border border-[#C9B79C]/50 flex items-center justify-center text-[#C9B79C] shadow-md">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="font-display font-black text-lg tracking-wider text-white">Swagyard</div>
              <div className="text-[10px] text-[#C9B79C] font-semibold tracking-wide">
                {lang === 'en' ? 'Retail POS & Billing' : 'சில்லறை பில்லிங்'}
              </div>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-[#C9B79C]/20 text-[#C9B79C] text-[10px] font-black tracking-wider">
            ADMIN
          </span>
        </div>

        {/* Navigation Tab Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs lg:text-sm transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#262626] text-[#C9B79C] font-black border border-[#C9B79C]/40 shadow-md'
                    : 'text-white/80 hover:bg-white/10 hover:text-[#C9B79C]'
                }`}
              >
                <div className={isActive ? 'text-[#C9B79C]' : 'text-white/60'}>{item.icon}</div>
                <span className="truncate">{lang === 'en' ? item.labelEn : item.labelTa}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer Logout Button */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-white/70 hover:bg-rose-500/20 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <LogOut size={16} />
            <span>{lang === 'en' ? 'Logout' : 'வெளியேறு'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 bg-[#111111] text-white px-4 flex items-center justify-between shrink-0 border-b border-[#262626] z-20">
          {/* Mobile Menu Toggle & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-white/10 text-white hover:bg-white/20"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-white/70">
              <MapPin size={13} className="text-[#C9B79C] shrink-0" />
              <span className="truncate max-w-xs lg:max-w-md">174, Brazzer St, Ammoor, Ranipet</span>
              <span className="text-white/30">•</span>
              <Phone size={13} className="text-[#C9B79C] shrink-0" />
              <span>+91 63853 68479</span>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-2">
            {/* Audio Mute / Unmute Button */}
            <button
              onClick={toggleMute}
              title={isMuted ? 'Unmute system sounds' : 'Mute system sounds'}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                  : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
              }`}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            {/* Language Switch */}
            <button
              onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}
              title="Toggle English / Tamil"
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-[#C9B79C] border border-[#C9B79C]/30 transition-all cursor-pointer"
            >
              {lang === 'en' ? 'தமிழ்' : 'English'}
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={handleToggleFullscreen}
              title="Toggle Fullscreen"
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            {/* Cashier Badge */}
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-white/15">
              <div className="w-7 h-7 rounded-full bg-[#C9B79C]/20 border border-[#C9B79C]/50 flex items-center justify-center text-[#C9B79C] font-black text-xs">
                A
              </div>
              <span className="text-xs font-bold text-white/90">Admin</span>
            </div>
          </div>
        </header>

        {/* Mobile Slide-Out Drawer Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/80 flex flex-col p-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="font-display font-black text-lg text-white">Swagyard</div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg bg-white/10 text-white"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 space-y-1.5 overflow-y-auto">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium ${
                    activeTab === item.id
                      ? 'bg-[#262626] text-[#C9B79C] font-bold border border-[#C9B79C]/40'
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  {item.icon}
                  <span>{lang === 'en' ? item.labelEn : item.labelTa}</span>
                </button>
              ))}
            </nav>
            <button
              onClick={handleLogout}
              className="mt-4 w-full py-3 rounded-xl bg-rose-500/20 text-rose-400 font-bold text-sm flex items-center justify-center gap-2"
            >
              <LogOut size={16} />
              <span>{lang === 'en' ? 'Logout' : 'வெளியேறு'}</span>
            </button>
          </div>
        )}

        {/* Dynamic Page Tab Content Render */}
        <main className="flex-1 min-h-0 overflow-y-auto bg-[#FAF7F2]">
          {children(activeTab, lang, handleTabChange)}
        </main>
      </div>
    </div>
  );
}
