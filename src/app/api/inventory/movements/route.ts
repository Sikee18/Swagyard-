import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listMovements } from '@/lib/inventory-server';

/** GET ?productId&variantId&from&to&limit — the stock movement audit ledger, newest first. */
export async function GET(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const variantParam = searchParams.get('variantId');
    const limit = Number(searchParams.get('limit')) || 1000;
    const movements = await listMovements({
      productId: productId ? Number(productId) : undefined,
      variantId: productId ? (variantParam ? Number(variantParam) : null) : undefined,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
    });
    return NextResponse.json({ movements: movements.slice(0, limit) });
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to load stock movements' }, { status: 500 });
  }
}
