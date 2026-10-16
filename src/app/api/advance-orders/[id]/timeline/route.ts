import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { serializeAdvanceOrder } from '../../serialize';

const QUICK_EVENTS: Record<string, string> = {
  order_confirmed: 'Order Confirmed',
  order_packed: 'Order Packed',
  ready_for_delivery: 'Ready for Delivery',
  customer_contacted: 'Customer Contacted',
  delivered: 'Delivered',
};

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const { eventType, remarks } = await request.json();
    if (!QUICK_EVENTS[eventType]) {
      return NextResponse.json({ error: 'Unable to add timeline event' }, { status: 400 });
    }
    if (!(await db.advanceOrders.findUnique({ where: { id: params.id } }))) {
      return NextResponse.json({ error: 'Advance order not found' }, { status: 404 });
    }
    await db.advanceOrders.addTimeline(params.id, [{ eventType, label: QUICK_EVENTS[eventType], remarks: remarks || null }]);
    return NextResponse.json(serializeAdvanceOrder(await db.advanceOrders.findUnique({ where: { id: params.id } })));
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message || 'Unable to add timeline event' }, { status: 500 });
  }
}
