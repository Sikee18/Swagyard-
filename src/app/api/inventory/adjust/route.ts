import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { recordMovement } from '@/lib/inventory-server';

const adjustSchema = z.object({
  productId: z.number().int(),
  variantId: z.number().int().optional().nullable(),
  newQuantity: z.number().int().min(0, 'Reconciled stock quantity cannot be negative.'),
  reason: z.enum(['RESTOCK', 'DAMAGE', 'RETURN', 'CORRECTION']),
  note: z.string().optional().nullable(),
});

/** Sets a SKU to an exact stock level and records the movement. */
export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const result = adjustSchema.safeParse(await request.json());
    if (!result.success) {
      const message = result.error.issues[0]?.message || 'Invalid adjustment parameters';
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const { productId, variantId, newQuantity, reason, note } = result.data;

    const previous = await db.inventory.setStock(productId, variantId ?? null, newQuantity);
    if (previous === null) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    if (previous === newQuantity) {
      return NextResponse.json({ error: 'No stock change detected. Please adjust the quantity.' }, { status: 400 });
    }

    const movement = await recordMovement({
      productId,
      variantId: variantId ?? null,
      type: reason,
      before: previous,
      after: newQuantity,
      note,
      createdByName: user.name || 'Admin',
    });
    return NextResponse.json({ success: true, newStock: newQuantity, movement });
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Stock adjustment error:', err);
    return NextResponse.json({ error: 'Failed to adjust stock' }, { status: 500 });
  }
}
