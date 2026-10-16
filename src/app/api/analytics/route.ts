import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authErrorResponse, requireAdmin } from '@/lib/auth';

export async function GET() {
  try {
    await requireAdmin();

    const [orders, products, expenses] = await Promise.all([
      db.orders.findMany(),
      db.products.findMany(),
      db.expenses.findMany(),
    ]);

    // Financial calculations
    const totalGrossRevenuePaise = orders.reduce((acc: number, o: any) => acc + (o.totalInPaise || 0), 0);
    const totalCouponDiscountPaise = orders.reduce((acc: number, o: any) => acc + (o.couponDiscountPaise || 0), 0);
    const totalManualDiscountPaise = orders.reduce((acc: number, o: any) => acc + (o.manualDiscountPaise || 0), 0);
    const totalGstCollectedPaise = orders.reduce((acc: number, o: any) => acc + (o.totalGstPaise || 0), 0);
    const totalExpensesPaise = expenses.reduce((acc: number, e: any) => acc + (e.amountInPaise || 0), 0);

    // Calculate approximate COGS (Cost of goods sold) from order items
    let totalCogsPaise = 0;
    const productSalesMap: Record<string, { name: string; qty: number; revenuePaise: number }> = {};
    const categorySalesMap: Record<string, { name: string; revenuePaise: number; count: number }> = {};

    orders.forEach((o: any) => {
      o.items?.forEach((it: any) => {
        const prod = products.find((p: any) => p.id === it.productId);
        const cost = prod?.costInPaise || Math.round(it.unitPrice * 0.6); // fallback 60% cost if not specified
        totalCogsPaise += cost * it.quantity;

        // Product stats
        const key = it.productName;
        if (!productSalesMap[key]) {
          productSalesMap[key] = { name: key, qty: 0, revenuePaise: 0 };
        }
        productSalesMap[key].qty += it.quantity;
        productSalesMap[key].revenuePaise += it.lineTotal;

        // Category stats
        const cat = it.category || prod?.category?.nameEn || 'Other';
        if (!categorySalesMap[cat]) {
          categorySalesMap[cat] = { name: cat, revenuePaise: 0, count: 0 };
        }
        categorySalesMap[cat].revenuePaise += it.lineTotal;
        categorySalesMap[cat].count += it.quantity;
      });
    });

    const grossProfitPaise = Math.max(0, totalGrossRevenuePaise - totalCogsPaise);
    const netProfitPaise = grossProfitPaise - totalExpensesPaise;

    // Payment modes breakdown
    const paymentModes: Record<string, number> = {
      cash: 0,
      card: 0,
      qr: 0,
      split: 0,
    };
    orders.forEach((o: any) => {
      const mode = o.paymentMode || 'cash';
      paymentModes[mode] = (paymentModes[mode] || 0) + (o.totalInPaise || 0);
    });

    // Daily revenue trends (last 7 days)
    const dailyMap: Record<string, { date: string; revenue: number; orders: number }> = {};
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const str = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      dailyMap[str] = { date: str, revenue: 0, orders: 0 };
    }

    orders.forEach((o: any) => {
      const str = new Date(o.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      if (dailyMap[str]) {
        dailyMap[str].revenue += (o.totalInPaise || 0) / 100;
        dailyMap[str].orders += 1;
      }
    });

    const topSellingProducts = Object.values(productSalesMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    const categoryBreakdown = Object.values(categorySalesMap)
      .sort((a, b) => b.revenuePaise - a.revenuePaise);

    return NextResponse.json({
      summary: {
        totalOrders: orders.length,
        totalGrossRevenuePaise,
        totalCouponDiscountPaise,
        totalManualDiscountPaise,
        totalGstCollectedPaise,
        totalExpensesPaise,
        totalCogsPaise,
        grossProfitPaise,
        netProfitPaise,
        avgOrderPaise: orders.length > 0 ? Math.round(totalGrossRevenuePaise / orders.length) : 0,
      },
      paymentModes,
      dailyTrends: Object.values(dailyMap),
      topSellingProducts,
      categoryBreakdown,
    });
  } catch (err: any) {
    const authError = authErrorResponse(err);
    if (authError) return authError;
    return NextResponse.json({ error: err.message || 'Error calculating analytics' }, { status: 500 });
  }
}
