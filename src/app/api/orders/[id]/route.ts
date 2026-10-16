import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authErrorResponse, requireAdmin, requireAuth } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const { id } = params;

    const order = await db.orders.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

const ORDER_STATUSES = ['pending', 'completed'];

/** Edits customer details, remarks, reference number and status. Amounts and items are never editable. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.customerName !== undefined) data.customerName = String(body.customerName).trim() || 'Customer';
    if (body.phone !== undefined) data.phone = String(body.phone).trim() || null;
    if (body.address !== undefined) data.address = String(body.address).trim() || null;
    if (body.remarks !== undefined) data.remarks = String(body.remarks).trim() || null;
    if (body.referenceNumber !== undefined) data.referenceNumber = String(body.referenceNumber).trim() || null;
    if (body.status !== undefined) {
      if (!ORDER_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: 'Failed to update order status: invalid status' }, { status: 400 });
      }
      data.status = body.status;
    }

    const updated = await db.orders.update({ where: { id: params.id }, data });
    if (!updated) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message || 'Failed to update order' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const removed = await db.orders.delete({ where: { id: params.id } });
    if (!removed) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const authError = authErrorResponse(err);
    if (authError) return authError;
    return NextResponse.json({ error: err.message || 'Error deleting order' }, { status: 500 });
  }
}
