import { db } from './db';
import { movementTypeOf, type MovementType, type Movement } from './inventory';

/** Appends an immutable stock movement to the audit ledger. */
export async function recordMovement(m: {
  productId: number;
  variantId: number | null;
  type: MovementType;
  before: number;
  after: number;
  note?: string | null;
  createdByName?: string;
}) {
  if (m.before === m.after && m.type !== 'SALE') return null;
  return db.inventoryMovements.create({
    data: {
      productId: m.productId,
      variantId: m.variantId,
      previousStock: m.before,
      newStock: m.after,
      quantityChange: m.after - m.before,
      reason: m.type,
      createdByName: m.createdByName || 'Admin',
      note: m.note || null,
    },
  });
}

/** Ledger rows joined with current product/variant names and barcodes. */
export async function listMovements(filter: { productId?: number; variantId?: number | null; from?: string; to?: string } = {}) {
  const [movements, products] = await Promise.all([db.inventoryMovements.findMany(), db.products.findMany()]);
  const byId = new Map<number, any>(products.map((p: any) => [p.id, p]));
  const rows: Movement[] = [];
  for (const m of movements as any[]) {
    if (filter.productId && m.productId !== filter.productId) continue;
    if (filter.variantId !== undefined && (m.variantId ?? null) !== (filter.variantId ?? null)) continue;
    const created = new Date(m.createdAt);
    if (filter.from && created < new Date(filter.from)) continue;
    if (filter.to && created > new Date(filter.to)) continue;
    const product = byId.get(m.productId);
    const variant = m.variantId ? (product?.variants || []).find((v: any) => v.id === m.variantId) : null;
    rows.push({
      id: m.id,
      createdAt: created.toISOString(),
      movementType: movementTypeOf(m.reason, m.quantityChange),
      productId: m.productId ?? null,
      variantId: m.variantId ?? null,
      productName: product?.name || `Product #${m.productId}`,
      variantName: variant ? variant.sizeLabel || variant.variantName : null,
      barcode: (variant ? variant.barcode : product?.barcode) || null,
      quantityDelta: m.quantityChange,
      quantityBefore: m.previousStock,
      quantityAfter: m.newStock,
      createdByName: m.createdByName || 'Admin',
      note: m.note || null,
    });
  }
  return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Returns the item already using a barcode, ignoring the given SKU. */
export async function findBarcodeOwner(barcode: string, except?: { productId: number; variantId: number | null }) {
  const value = barcode.trim();
  if (!value) return null;
  const products = await db.products.findMany();
  for (const p of products as any[]) {
    if (p.barcode === value && !(except && except.productId === p.id && !except.variantId)) return { productId: p.id, variantId: null, name: p.name };
    for (const v of p.variants || []) {
      if (v.barcode === value && !(except && except.variantId === v.id)) return { productId: p.id, variantId: v.id, name: `${p.name} (${v.sizeLabel || v.variantName})` };
    }
  }
  return null;
}
