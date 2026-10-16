import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search')?.toLowerCase() || '';
    const paymentMode = searchParams.get('paymentMode') || 'all';
    const preset = searchParams.get('preset') || 'all';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const orders = await db.orders.findMany();

    // Filter orders
    const filtered = orders.filter((o: any) => {
      // 1. Search filter
      if (search) {
        const matchInvoice = o.invoiceNo?.toLowerCase().includes(search);
        const matchName = o.customerName?.toLowerCase().includes(search);
        const matchPhone = o.phone?.toLowerCase().includes(search);
        if (!matchInvoice && !matchName && !matchPhone) return false;
      }

      // 2. Payment mode filter
      if (paymentMode !== 'all' && o.paymentMode !== paymentMode) {
        return false;
      }

      // 3. Date filter
      const oDate = new Date(o.createdAt);
      const now = new Date();

      if (preset === 'today') {
        const isToday =
          oDate.getDate() === now.getDate() &&
          oDate.getMonth() === now.getMonth() &&
          oDate.getFullYear() === now.getFullYear();
        if (!isToday) return false;
      } else if (preset === '7d') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (oDate < sevenDaysAgo) return false;
      } else if (preset === '30d') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (oDate < thirtyDaysAgo) return false;
      } else if (startDate || endDate) {
        if (startDate && oDate < new Date(startDate)) return false;
        if (endDate && oDate > new Date(endDate)) return false;
      }

      return true;
    });

    // Summary calculations
    const totalRevenuePaise = filtered.reduce((acc: number, o: any) => acc + (o.totalInPaise || 0), 0);
    const avgOrderPaise = filtered.length > 0 ? Math.round(totalRevenuePaise / filtered.length) : 0;

    return NextResponse.json({
      orders: filtered,
      summary: {
        totalCount: filtered.length,
        totalRevenuePaise,
        avgOrderPaise,
      },
    });
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
