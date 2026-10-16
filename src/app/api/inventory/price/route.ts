import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/** Quick edit of a SKU's selling price (and optional cost price), in rupees. */
export async function PATCH(request: Request) {
  try {
    await requireAuth();
    const { productId, variantId, price, costPrice } = await request.json();
    const selling = Number(price);
    if (!Number.isFinite(selling) || selling < 0) {
      return NextResponse.json({ error: 'Please enter a valid selling price.' }, { status: 400 });
    }
    let cost: number | undefined;
    if (costPrice !== undefined && costPrice !== null && costPrice !== '') {
      cost = Number(costPrice);
      if (!Number.isFinite(cost) || cost < 0) {
        return NextResponse.json({ error: 'Please enter a valid cost price.' }, { status: 400 });
      }
    }
    const ok = await db.inventory.setPrice(
      Number(productId),
      variantId ? Number(variantId) : null,
      Math.round(selling * 100),
      cost === undefined ? undefined : Math.round(cost * 100)
    );
    if (!ok) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    return NextResponse.json({ success: true, price: selling, costPrice: cost });
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to update price' }, { status: 500 });
  }
}
