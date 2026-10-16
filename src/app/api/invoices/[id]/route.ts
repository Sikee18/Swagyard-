import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Support lookup by UUID id or invoiceNo (e.g. SWAG-20261015-0001)
    let order = await db.orders.findUnique({
      where: { id },
    });

    if (!order) {
      order = await db.orders.findUnique({
        where: { invoiceNo: id },
      });
    }

    if (!order) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({
      store: {
        name: 'SWAGYARD',
        tagline: 'Retail POS & Billing System',
        address: '174, Brazzer Street, Opp. Apollo Medical, Ammoor, Ranipet - 632501',
        phone: '+91 63853 68479',
        email: 'swagyard.retail@gmail.com',
        social: '@swagyard.retail',
      },
      order,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
