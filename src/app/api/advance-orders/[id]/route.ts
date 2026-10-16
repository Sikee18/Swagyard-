import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { STATUS_EVENT_LABELS, isLocked } from '@/lib/advance-orders';
import { serializeAdvanceOrder } from '../serialize';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const row = await db.advanceOrders.findUnique({ where: { id: params.id } });
    if (!row) return NextResponse.json({ error: 'Advance order not found' }, { status: 404 });
    return NextResponse.json(serializeAdvanceOrder(row));
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message || 'Unable to load order details' }, { status: 500 });
  }
}

/** Moves an order between non-final statuses. Completion goes through /complete. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const row = await db.advanceOrders.findUnique({ where: { id: params.id } });
    if (!row) return NextResponse.json({ error: 'Advance order not found' }, { status: 404 });
    const order = serializeAdvanceOrder(row);

    const { status, remarks } = await request.json();
    if (order.status === 'cancelled') {
      return NextResponse.json({ error: 'A cancelled order cannot be modified.' }, { status: 409 });
    }
    if (isLocked(order)) {
      return NextResponse.json({ error: 'This order is already completed and has an official invoice.' }, { status: 409 });
    }
    const label = STATUS_EVENT_LABELS[status as keyof typeof STATUS_EVENT_LABELS];
    if (!label) {
      return NextResponse.json({ error: 'Unable to update status' }, { status: 400 });
    }

    await db.advanceOrders.update({
      where: { id: params.id },
      data: { status, ...(remarks ? { remarks } : {}) },
    });
    await db.advanceOrders.addTimeline(params.id, [{ eventType: status, label, remarks: remarks || null }]);
    return NextResponse.json(serializeAdvanceOrder(await db.advanceOrders.findUnique({ where: { id: params.id } })));
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message || 'Unable to update status' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    await db.advanceOrders.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message || 'Failed to delete order' }, { status: 500 });
  }
}
