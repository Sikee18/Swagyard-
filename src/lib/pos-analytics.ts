/**
 * POS analytics computed from completed orders, expenses, coupons and the product catalog.
 * All money values returned are in rupees (orders store paise).
 */

export interface AnalyticsOrder {
  id: string;
  invoiceNo: string;
  customerName: string | null;
  createdAt: string;
  status: string;
  totalInPaise: number;
  couponCode: string | null;
  couponDiscountPaise: number;
  paymentMode: string;
  splitDetails?: { cashInPaise?: number; qrInPaise?: number; cardInPaise?: number; otherInPaise?: number } | null;
  items: {
    productId?: number | null;
    variantId?: number | null;
    productName: string;
    category?: string | null;
    quantity: number;
    lineTotal: number;
    isManual?: boolean;
  }[];
}

export interface AnalyticsExpense {
  expenseDate: string;
  amountInPaise: number;
}

export interface AnalyticsCoupon {
  code: string;
  percentage: number;
  usageCount: number;
  isActive: boolean;
}

export interface AnalyticsProduct {
  id: number;
  name: string;
  costInPaise?: number | null;
  category?: { nameEn?: string } | null;
  variants?: { id: number; costInPaise?: number | null }[];
}

export interface ProductStat {
  name: string;
  variant: string;
  qty: number;
  revenue: number;
  billCount: number;
  cost: number;
  hasCost: boolean;
  profit: number;
  margin: number;
}

export interface CouponStat {
  code: string;
  usage: number;
  discounts: number;
  percentage?: number;
  isActive: boolean;
}

const rupees = (paise: number) => (paise || 0) / 100;

export const dayKey = (value: string | Date) => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const isCompleted = (status: string) => ['completed', 'paid'].includes(String(status || '').toLowerCase());
const isCancelled = (status: string) => String(status || '').toLowerCase() === 'cancelled';

/** How much of an order's total was paid in cash / QR / card / other. */
function tenderBreakdown(o: AnalyticsOrder) {
  const out = { cash: 0, qr: 0, card: 0, other: 0 };
  const s = o.splitDetails;
  const splitTotal = s ? (s.cashInPaise || 0) + (s.qrInPaise || 0) + (s.cardInPaise || 0) + (s.otherInPaise || 0) : 0;
  if (s && splitTotal > 0) {
    out.cash = rupees(s.cashInPaise || 0);
    out.qr = rupees(s.qrInPaise || 0);
    out.card = rupees(s.cardInPaise || 0);
    out.other = rupees(s.otherInPaise || 0);
    return out;
  }
  const total = rupees(o.totalInPaise);
  const mode = String(o.paymentMode || '').toLowerCase();
  if (mode === 'cash') out.cash = total;
  else if (mode === 'qr' || mode === 'upi') out.qr = total;
  else if (mode === 'card') out.card = total;
  else out.other = total;
  return out;
}

const hourLabel = (h: number) => `${h === 0 ? 12 : h > 12 ? h - 12 : h} ${h < 12 ? 'AM' : 'PM'}`;

export function computeAnalytics(
  orders: AnalyticsOrder[],
  expenses: AnalyticsExpense[],
  coupons: AnalyticsCoupon[],
  products: AnalyticsProduct[],
  dateFrom: string,
  dateTo: string
) {
  const inRange = (iso: string) => {
    const k = dayKey(iso);
    return (!dateFrom || k >= dateFrom) && (!dateTo || k <= dateTo);
  };
  const ranged = orders.filter((o) => inRange(o.createdAt));
  const active = ranged.filter((o) => !isCancelled(o.status));
  const completed = active.filter((o) => isCompleted(o.status));
  const allCompleted = orders.filter((o) => !isCancelled(o.status) && isCompleted(o.status));
  const total = (o: AnalyticsOrder) => rupees(o.totalInPaise);

  const totalCompletedRevenue = completed.reduce((s, o) => s + total(o), 0);
  const averageRevenuePerBill = completed.length ? totalCompletedRevenue / completed.length : 0;

  const tenders = completed.reduce(
    (acc, o) => {
      const t = tenderBreakdown(o);
      acc.cash += t.cash;
      acc.qr += t.qr;
      acc.card += t.card;
      acc.other += t.other;
      return acc;
    },
    { cash: 0, qr: 0, card: 0, other: 0 }
  );

  const totalExpenses = expenses
    .filter((e) => {
      const k = e.expenseDate.slice(0, 10);
      return (!dateFrom || k >= dateFrom) && (!dateTo || k <= dateTo);
    })
    .reduce((s, e) => s + rupees(e.amountInPaise), 0);
  const netProfit = totalCompletedRevenue - totalExpenses;

  // Today (always the real today, regardless of the period filter)
  const todayKey = dayKey(new Date());
  const todayOrders = completed.filter((o) => dayKey(o.createdAt) === todayKey);
  const todaySales = allCompleted.filter((o) => dayKey(o.createdAt) === todayKey).reduce((s, o) => s + total(o), 0);
  const todayItemsSold = todayOrders.reduce((s, o) => s + o.items.reduce((q, it) => q + (it.quantity || 0), 0), 0);
  const todayAvgOrderValue = todayOrders.length ? todaySales / todayOrders.length : 0;
  const hourly = new Map<number, number>();
  const todayProducts = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const o of todayOrders) {
    const h = new Date(o.createdAt).getHours();
    hourly.set(h, (hourly.get(h) || 0) + total(o));
    for (const it of o.items) {
      const name = String(it.productName || 'Product').trim();
      const p = todayProducts.get(name) || { name, qty: 0, revenue: 0 };
      p.qty += it.quantity || 0;
      p.revenue += rupees(it.lineTotal);
      todayProducts.set(name, p);
    }
  }
  const todayHourlyTrend = Array.from({ length: 24 }, (_, h) => ({ hour: hourLabel(h), revenue: hourly.get(h) || 0 }));
  const todayTopProducts = Array.from(todayProducts.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  const todayBills = [...todayOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

  // Product performance (cost from current catalog cost prices; manual items have no cost)
  const variantCost = new Map<number, number>();
  const productCost = new Map<number, number>();
  const nameCost = new Map<string, number>();
  const nameCategory = new Map<string, string>();
  for (const p of products) {
    const c = rupees(p.costInPaise || 0);
    if (c > 0) {
      productCost.set(p.id, c);
      nameCost.set(p.name.trim().toLowerCase(), c);
    }
    nameCategory.set(p.name.trim().toLowerCase(), p.category?.nameEn || 'Uncategorized');
    for (const v of p.variants || []) {
      const vc = rupees(v.costInPaise || 0);
      if (vc > 0) variantCost.set(v.id, vc);
    }
  }

  const productMap = new Map<string, Omit<ProductStat, 'hasCost' | 'profit' | 'margin'> & { costedRevenue: number; costedQty: number }>();
  const productBills = new Map<string, Set<string>>();
  const categoryMap = new Map<string, { name: string; qty: number; revenue: number }>();
  let totalProductsSold = 0;
  for (const o of completed) {
    for (const it of o.items) {
      const qty = it.quantity || 0;
      const revenue = rupees(it.lineTotal);
      totalProductsSold += qty;
      const full = String(it.productName || 'Product').trim() || 'Product';
      const split = full.indexOf(' - ');
      const base = split > 0 ? full.slice(0, split) : full;
      const variant = split > 0 ? full.slice(split + 3) : '';
      const stat = productMap.get(full) || { name: base, variant, qty: 0, revenue: 0, billCount: 0, cost: 0, costedRevenue: 0, costedQty: 0 };
      stat.qty += qty;
      stat.revenue += revenue;
      const unitCost = it.isManual
        ? 0
        : (it.variantId != null && variantCost.get(it.variantId)) ||
          (it.productId != null && productCost.get(it.productId)) ||
          nameCost.get(base.toLowerCase()) ||
          0;
      if (unitCost > 0) {
        stat.cost += unitCost * qty;
        stat.costedRevenue += revenue;
        stat.costedQty += qty;
      }
      productMap.set(full, stat);
      if (!productBills.has(full)) productBills.set(full, new Set());
      productBills.get(full)!.add(o.id);
      const cat = it.category || nameCategory.get(base.toLowerCase()) || 'Uncategorized';
      const c = categoryMap.get(cat) || { name: cat, qty: 0, revenue: 0 };
      c.qty += qty;
      c.revenue += revenue;
      categoryMap.set(cat, c);
    }
  }
  const topProducts: ProductStat[] = Array.from(productMap.entries())
    .map(([key, s]) => {
      const hasCost = s.costedQty > 0;
      const profit = hasCost ? s.costedRevenue - s.cost : 0;
      return {
        name: s.name,
        variant: s.variant,
        qty: s.qty,
        revenue: s.revenue,
        billCount: productBills.get(key)?.size || 0,
        cost: s.cost,
        hasCost,
        profit,
        margin: hasCost && s.costedRevenue > 0 ? (profit / s.costedRevenue) * 100 : 0,
      };
    })
    .sort((a, b) => b.qty - a.qty);
  const totalProductCost = topProducts.reduce((s, p) => s + p.cost, 0);
  const totalProductProfit = topProducts.reduce((s, p) => s + (p.hasCost ? p.profit : 0), 0);
  const costedRevenue = Array.from(productMap.values()).reduce((s, p) => s + (p.costedQty > 0 ? p.costedRevenue : 0), 0);
  const productsWithoutCost = topProducts.filter((p) => !p.hasCost).length;
  const overallProfitMargin = costedRevenue > 0 ? (totalProductProfit / costedRevenue) * 100 : 0;
  const topCategories = Array.from(categoryMap.values()).sort((a, b) => b.revenue - a.revenue);

  // Trends use all completed bills (not the period filter), like the original
  const year = new Date().getFullYear();
  const byMonth = new Map<string, number>();
  const byDay = new Map<string, number>();
  for (const o of allCompleted) {
    const k = dayKey(o.createdAt);
    byMonth.set(k.slice(0, 7), (byMonth.get(k.slice(0, 7)) || 0) + total(o));
    byDay.set(k, (byDay.get(k) || 0) + total(o));
  }
  const monthlyTrend = Array.from({ length: 12 }, (_, m) => {
    const d = new Date(year, m, 1);
    return { month: d.toLocaleDateString('en-IN', { month: 'short' }), revenue: byMonth.get(dayKey(d).slice(0, 7)) || 0 };
  });
  const monthlyRevenue = completed.filter((o) => dayKey(o.createdAt).slice(0, 7) === todayKey.slice(0, 7)).reduce((s, o) => s + total(o), 0);
  const monday = new Date();
  monday.setDate(monday.getDate() - (monday.getDay() || 7) + 1);
  const weeklySales = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const k = dayKey(d);
    return { day: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d), date: k, revenue: byDay.get(k) || 0 };
  });

  // Coupons
  const filtered = !!(dateFrom || dateTo);
  const couponMap = new Map<string, CouponStat>();
  for (const c of coupons) {
    const code = c.code.trim().toUpperCase();
    couponMap.set(code, { code, usage: filtered ? 0 : c.usageCount || 0, discounts: 0, percentage: c.percentage, isActive: c.isActive });
  }
  const orderUses = new Map<string, number>();
  const couponDays = new Map<string, number>();
  for (const o of active) {
    const code = String(o.couponCode || '').trim().toUpperCase();
    if (!code) continue;
    const stat = couponMap.get(code) || { code, usage: 0, discounts: 0, isActive: false };
    orderUses.set(code, (orderUses.get(code) || 0) + 1);
    stat.discounts += rupees(o.couponDiscountPaise);
    couponMap.set(code, stat);
    const k = dayKey(o.createdAt);
    couponDays.set(k, (couponDays.get(k) || 0) + 1);
  }
  couponMap.forEach((stat) => {
    const used = orderUses.get(stat.code) || 0;
    stat.usage = filtered ? used : Math.max(stat.usage, used);
  });
  const topCoupons = Array.from(couponMap.values()).sort((a, b) => (b.usage !== a.usage ? b.usage - a.usage : b.discounts - a.discounts));
  const totalCouponDiscounts = topCoupons.reduce((s, c) => s + c.discounts, 0);
  const totalCouponOrders = topCoupons.reduce((s, c) => s + c.usage, 0);
  const couponUsageRate = active.length ? (totalCouponOrders / active.length) * 100 : 0;
  const couponDailyTrend = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const k = dayKey(d);
    return { day: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d), date: k, orders: couponDays.get(k) || 0 };
  });

  return {
    totalCompletedRevenue,
    averageRevenuePerBill,
    totalExpenses,
    netProfit,
    isProfitable: netProfit >= 0,
    completedOrders: completed.length,
    posRevenue: totalCompletedRevenue,
    offlineOrderCount: completed.length,
    onlinePosRevenue: 0,
    onlineBillCount: 0,
    cashCollected: tenders.cash,
    qrCollected: tenders.qr,
    cardCollected: tenders.card,
    otherCollected: tenders.other,
    totalProductsSold,
    bestProduct: topProducts[0]?.name || 'No sales yet',
    todaySales,
    todayCompletedOrdersCount: todayOrders.length,
    todayItemsSold,
    todayAvgOrderValue,
    todayHourlyTrend,
    todayTopProducts,
    todayBills,
    averageProductRevenue: totalProductsSold > 0 ? totalCompletedRevenue / totalProductsSold : 0,
    topProducts,
    topCategories,
    totalProductCost,
    totalProductProfit,
    productsWithoutCost,
    overallProfitMargin,
    chartYear: year,
    monthlyTrend,
    monthlyRevenue,
    weeklySales,
    topCoupons,
    totalCouponDiscounts,
    totalCouponOrders,
    couponUsageRate,
    couponDailyTrend,
  };
}

export type AnalyticsData = ReturnType<typeof computeAnalytics>;
