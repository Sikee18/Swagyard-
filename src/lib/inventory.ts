/**
 * Inventory helpers shared by the inventory API and screens: one row per sellable SKU
 * (a product, or each of its variants), and the stock movement ledger.
 */

export type MovementType = 'INITIAL_BARCODE_STOCK' | 'INTAKE' | 'RESTOCK' | 'SALE' | 'RETURN' | 'DAMAGE' | 'CORRECTION' | 'VOID';

export const MOVEMENT_TYPES: MovementType[] = ['INITIAL_BARCODE_STOCK', 'INTAKE', 'RESTOCK', 'SALE', 'RETURN', 'DAMAGE', 'CORRECTION', 'VOID'];

export interface InventorySku {
  /** "p-<productId>" or "v-<variantId>" */
  id: string;
  productId: number;
  variantId: number | null;
  name: string;
  nameTa: string | null;
  variantName: string | null;
  barcode: string | null;
  sku: string | null;
  category: string | null;
  categoryId: number | null;
  stock: number;
  /** Rupees */
  price: number;
  /** Rupees, 0 when unknown */
  purchasePrice: number;
  lowStockThreshold: number;
  isActive: boolean;
  updatedAt: string | null;
}

export interface Movement {
  id: number;
  createdAt: string;
  movementType: MovementType;
  productId: number | null;
  variantId: number | null;
  productName: string;
  variantName: string | null;
  barcode: string | null;
  quantityDelta: number;
  quantityBefore: number;
  quantityAfter: number;
  createdByName: string;
  note: string | null;
}

const rupees = (paise: number | null | undefined) => (paise || 0) / 100;

/** Flattens products into SKU rows: one per variant, or one per product without variants. */
export function toSkus(products: any[]): InventorySku[] {
  const rows: InventorySku[] = [];
  for (const p of products) {
    const base = {
      productId: p.id,
      name: p.name,
      nameTa: p.nameTa || null,
      category: p.category?.nameEn || null,
      categoryId: p.categoryId ?? null,
      lowStockThreshold: p.lowStockAlert || 5,
      isActive: p.isActive !== false,
      updatedAt: p.updatedAt || null,
    };
    const variants = p.hasVariants ? p.variants || [] : [];
    if (variants.length) {
      for (const v of variants) {
        rows.push({
          ...base,
          id: `v-${v.id}`,
          variantId: v.id,
          variantName: v.sizeLabel || v.variantName || null,
          barcode: v.barcode || null,
          sku: v.sku || null,
          stock: v.stock || 0,
          price: rupees(v.priceInPaise || p.priceInPaise),
          purchasePrice: rupees(v.costInPaise ?? p.costInPaise),
        });
      }
    } else {
      rows.push({
        ...base,
        id: `p-${p.id}`,
        variantId: null,
        variantName: null,
        barcode: p.barcode || null,
        sku: p.sku || null,
        stock: p.stockQuantity || 0,
        price: rupees(p.priceInPaise),
        purchasePrice: rupees(p.costInPaise),
      });
    }
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name) || (a.variantName || '').localeCompare(b.variantName || ''));
}

/** Maps stored reason strings (including legacy free-text reasons) to a movement type. */
export function movementTypeOf(reason: string, delta: number): MovementType {
  const r = String(reason || '').trim();
  if ((MOVEMENT_TYPES as string[]).includes(r)) return r as MovementType;
  const l = r.toLowerCase();
  if (l.includes('sale')) return 'SALE';
  if (l.includes('damage') || l.includes('shrink') || l.includes('lost')) return 'DAMAGE';
  if (l.includes('return')) return 'RETURN';
  if (l.includes('inward') || l.includes('restock') || l.includes('shipment')) return delta >= 0 ? 'RESTOCK' : 'CORRECTION';
  if (l.includes('initial') || l.includes('creation')) return 'INTAKE';
  return 'CORRECTION';
}

export const MOVEMENT_BADGE: Record<MovementType, { label: string; cls: string }> = {
  INITIAL_BARCODE_STOCK: { label: 'INTAKE', cls: 'bg-gray-50 text-gray-800 border border-gray-200' },
  INTAKE: { label: 'INTAKE', cls: 'bg-gray-50 text-gray-800 border border-gray-200' },
  RESTOCK: { label: 'RESTOCK', cls: 'bg-emerald-50 text-emerald-800 border border-emerald-200' },
  SALE: { label: 'SALE', cls: 'bg-gray-50 text-gray-800 border border-gray-200' },
  RETURN: { label: 'RETURN', cls: 'bg-gray-50 text-gray-800 border border-gray-200' },
  DAMAGE: { label: 'DAMAGE', cls: 'bg-red-50 text-red-800 border border-red-200' },
  CORRECTION: { label: 'CORRECTION', cls: 'bg-amber-50 text-amber-800 border border-amber-200' },
  VOID: { label: 'VOID', cls: 'bg-gray-50 text-gray-800 border border-gray-200' },
};

/** Incoming / sold / damaged / returned totals for a set of movements. */
export function summarizeMovements(movements: Movement[]) {
  let incomingStock = 0;
  let unitsSold = 0;
  let unitsDamaged = 0;
  let unitsReturned = 0;
  for (const m of movements) {
    const d = m.quantityDelta || 0;
    switch (m.movementType) {
      case 'INITIAL_BARCODE_STOCK':
      case 'INTAKE':
        incomingStock += d;
        break;
      case 'RESTOCK':
        if (d > 0) incomingStock += d;
        break;
      case 'SALE':
        unitsSold += Math.abs(d);
        break;
      case 'DAMAGE':
        unitsDamaged += Math.abs(d);
        break;
      case 'RETURN':
        unitsReturned += Math.abs(d);
        break;
      case 'CORRECTION':
        if (d > 0) incomingStock += d;
        else if (d < 0) unitsDamaged += Math.abs(d);
        break;
      case 'VOID':
        if (d > 0) unitsReturned += d;
        break;
    }
  }
  return {
    incomingStock,
    unitsSold,
    unitsDamaged,
    unitsReturned,
    netDelta: incomingStock + unitsReturned - unitsSold - unitsDamaged,
  };
}
