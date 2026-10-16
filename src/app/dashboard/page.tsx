'use client';

import React, { Suspense } from 'react';
import { Shell, NavTabId } from '@/components/layout/Shell';
import { PosView } from '@/components/pos/PosView';
import { InventoryView } from '@/components/inventory/InventoryView';
import { OrderHistoryView } from '@/components/orders/OrderHistoryView';
import { AdvanceOrdersView } from '@/components/advance-orders/AdvanceOrdersView';
import { BirthdaysView } from '@/components/birthdays/BirthdaysView';
import { ExpensesView } from '@/components/expenses/ExpensesView';
import { CouponsView } from '@/components/coupons/CouponsView';
import { AnalyticsView } from '@/components/analytics/AnalyticsView';
import { WhatsAppView } from '@/components/whatsapp/WhatsAppView';

function DashboardContent() {
  return (
    <Shell>
      {(tab: NavTabId, lang: 'en' | 'ta', navigate: (tab: NavTabId) => void) => {
        switch (tab) {
          case 'pos':
            return <PosView lang={lang} />;
          case 'inventory':
            return <InventoryView lang={lang} />;
          case 'advance_orders':
            return <AdvanceOrdersView lang={lang} />;
          case 'birthdays':
            return <BirthdaysView lang={lang} />;
          case 'expenses':
            return <ExpensesView lang={lang} />;
          case 'order_history':
            return <OrderHistoryView lang={lang} onOpenPos={() => navigate('pos')} />;
          case 'pos_analytics':
            return <AnalyticsView lang={lang} />;
          case 'coupons':
            return <CouponsView lang={lang} />;
          case 'whatsapp':
            return <WhatsAppView lang={lang} />;
          default:
            return <PosView lang={lang} />;
        }
      }}
    </Shell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen bg-[#111111] flex items-center justify-center text-white text-xs font-bold font-mono">
          Loading Swagyard POS Terminal...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
