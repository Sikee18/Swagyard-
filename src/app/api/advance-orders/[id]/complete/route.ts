import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { isLocked, sumSplit } from '@/lib/advance-orders';
import { parseSplitRupees, serializeAdvanceOrder } from '../../serialize';

/**
 * Receives the remaining balance, creates the one official invoice (an Order),
 * and recognises the full order value as revenue.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const row = await db.advanceOrders.findUnique({ where: { id: params.id } });
    if (!row) return NextResponse.json({ error: 'Advance order not found' }, { status: 404 });
    const order = serializeAdvanceOrder(row);

    if (order.status === 'cancelled') {
      return NextResponse.json({ error: 'A cancelled order cannot be modified.' }, { status: 409 });
    }
    if (isLocked(order)) {
      return NextResponse.json({ error: 'This order has already been completed.' }, { status: 409 });
    }

    const body = await request.json();
    const rawMethod = String(body.paymentMethod || 'cash').toLowerCase();
    const method = rawMethod === 'upi' ? 'qr' : rawMethod;
    if (!['cash', 'qr', 'card', 'split'].includes(method)) {
      return NextResponse.json({ error: 'Unsupported payment method' }, { status: 400 });
    }
    const remaining = order.remainingBalancePaise;
    const split = method === 'split' ? parseSplitRupees(body.splitDetails) : null;
    if (split && sumSplit(split) !== remaining) {
      return NextResponse.json({ error: 'Split payment amounts must add up to the final amount.' }, { status: 400 });
    }
    const remarks: string | null = body.remarks?.trim() || null;

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const invoiceNo = await db.invoiceSequences.getNextNumber(todayStr);
    const sale = await db.orders.create({
      data: {
        invoiceNo,
        customerName: order.customerName,
        phone: order.phone,
        address: order.address || null,
        subtotalInPaise: order.totalAmountPaise,
        couponDiscountPaise: 0,
        manualDiscountPaise: 0,
        totalGstPaise: 0,
        gstEnabled: false,
        deliveryChargePaise: 0,
        totalInPaise: order.totalAmountPaise,
        paymentMode: method,
        splitDetails: split ? { cashInPaise: split.cash, qrInPaise: split.qr, cardInPaise: 0, otherInPaise: 0 } : null,
        status: 'completed',
        remarks: remarks || order.remarks || null,
        referenceNumber: order.depositId,
        cashierName: user.name || 'Admin',
        items: [
          {
            productName: order.productName,
            category: order.category || null,
            unitPrice: order.totalAmountPaise,
            quantity: 1,
            lineTotal: order.totalAmountPaise,
            isManual: true,
          },
        ],
      },
    });

    await db.advanceOrders.update({
      where: { id: params.id },
      data: {
        status: 'completed',
        remainingBalancePaise: 0,
        completedAt: new Date().toISOString(),
        completedOrderId: sale.id,
        invoiceNo,
        finalPaymentMode: method,
        finalSplitDetails: split,
        ...(remarks ? { remarks } : {}),
      },
    });
    await db.advanceOrders.addPayment(params.id, {
      paymentType: 'remaining',
      amountInPaise: remaining,
      paymentMode: method,
      splitDetails: split,
      remarks,
    });
    await db.advanceOrders.addTimeline(params.id, [
      { eventType: 'remaining_payment_received', label: 'Final Payment Received', remarks },
      { eventType: 'delivered', label: 'Delivered', remarks },
      { eventType: 'revenue_posted', label: `Revenue Posted (INR ${order.totalAmountPaise / 100})`, remarks },
      { eventType: 'invoice_generated', label: `Invoice Generated (${invoiceNo})`, remarks },
    ]);

    return NextResponse.json(serializeAdvanceOrder(await db.advanceOrders.findUnique({ where: { id: params.id } })));
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message || 'Unable to complete payment' }, { status: 500 });
  }
}
