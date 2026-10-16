import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { paymentMethodLabel, sumSplit } from '@/lib/advance-orders';
import { parseSplitRupees, serializeAdvanceOrder } from './serialize';

export async function GET() {
  try {
    await requireAuth();
    const orders = await db.advanceOrders.findMany();
    return NextResponse.json(orders.map(serializeAdvanceOrder));
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message || 'Unable to load advance orders' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const {
      customerName,
      phone,
      address,
      productName,
      category,
      description,
      totalAmountPaise,
      depositAmountPaise,
      depositPaymentMode = 'cash',
      splitDetails,
      expectedDeliveryDate,
      referenceNumber,
      remarks,
    } = body;

    if (!customerName?.trim() || !phone?.trim() || !productName?.trim()) {
      return NextResponse.json({ error: 'Customer name, phone and product are required' }, { status: 400 });
    }
    const total = Number(totalAmountPaise);
    const deposit = Number(depositAmountPaise);
    if (!Number.isInteger(total) || !Number.isInteger(deposit) || total <= 0 || deposit <= 0 || deposit >= total) {
      return NextResponse.json(
        { error: 'Deposit must be greater than ₹0 and less than the total order amount.' },
        { status: 400 }
      );
    }
    const rawMode = String(depositPaymentMode).toLowerCase();
    const mode = rawMode === 'upi' ? 'qr' : rawMode;
    const split = mode === 'split' ? parseSplitRupees(splitDetails) : null;
    if (split && sumSplit(split) !== deposit) {
      return NextResponse.json({ error: 'Split payment amounts must add up to the deposit amount.' }, { status: 400 });
    }

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const depositId = await db.advanceOrders.nextDepositId(todayStr);
    const note = remarks?.trim() || null;

    const created = await db.advanceOrders.create({
      data: {
        depositId,
        customerName: customerName.trim(),
        phone: phone.trim(),
        address: address?.trim() || null,
        productName: productName.trim(),
        category: category?.trim() || null,
        description: description?.trim() || null,
        totalAmountPaise: total,
        depositAmountPaise: deposit,
        remainingBalancePaise: total - deposit,
        depositPaymentMode: mode,
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate).toISOString() : null,
        status: 'pending_deposit',
        referenceNumber: referenceNumber?.trim() || null,
        remarks: note,
        createdByName: user.name || 'Admin',
      },
      payments: [
        { paymentType: 'deposit', amountInPaise: deposit, paymentMode: mode, splitDetails: split, remarks: note },
      ],
      timeline: [
        { eventType: 'created', label: 'Deposit Created', remarks: note },
        {
          eventType: 'deposit_received',
          label: 'Deposit Received',
          remarks: `Received INR ${deposit / 100} via ${paymentMethodLabel(mode, split).toUpperCase()}`,
        },
      ],
    });

    return NextResponse.json(serializeAdvanceOrder(created), { status: 201 });
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message || 'Unable to create advance order' }, { status: 500 });
  }
}
