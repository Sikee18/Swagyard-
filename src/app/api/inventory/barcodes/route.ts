import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { findBarcodeOwner, recordMovement } from '@/lib/inventory-server';

const schema = z.object({
  updateStock: z.boolean().default(false),
  items: z
    .array(
      z.object({
        productId: z.number().int(),
        variantId: z.number().int().optional().nullable(),
        barcode: z.string().min(1, 'Item Code / Barcode is required'),
        labels: z.number().int().min(1),
      })
    )
    .min(1, 'Please add and select at least one item to generate barcodes'),
});

/**
 * Assigns barcodes to SKUs from the Barcode Generator queue and, when requested,
 * receives the printed label count as new stock.
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid request' }, { status: 400 });
    }
    const { items, updateStock } = parsed.data;

    for (const item of items) {
      const owner = await findBarcodeOwner(item.barcode, { productId: item.productId, variantId: item.variantId ?? null });
      if (owner) {
        return NextResponse.json({ error: `Barcode ${item.barcode} is already assigned to ${owner.name}.` }, { status: 409 });
      }
    }

    let labels = 0;
    for (const item of items) {
      const variantId = item.variantId ?? null;
      await db.inventory.setBarcode(item.productId, variantId, item.barcode.trim());
      labels += item.labels;
      if (!updateStock) continue;
      const product = await db.products.findUnique({ where: { id: item.productId } });
      const current = variantId
        ? (product?.variants || []).find((v: any) => v.id === variantId)?.stock || 0
        : product?.stockQuantity || 0;
      await db.inventory.setStock(item.productId, variantId, current + item.labels);
      await recordMovement({
        productId: item.productId,
        variantId,
        type: 'INITIAL_BARCODE_STOCK',
        before: current,
        after: current + item.labels,
        note: `Received via Barcode Generator (${item.labels} labels)`,
        createdByName: user.name || 'Admin',
      });
    }
    return NextResponse.json({ success: true, items: items.length, labels });
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to receive stock with barcodes' }, { status: 500 });
  }
}
