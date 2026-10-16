import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { findBarcodeOwner, recordMovement } from '@/lib/inventory-server';

const variantSchema = z.object({
  id: z.number().int().optional().nullable(),
  variantName: z.string(),
  priceInPaise: z.number().int().min(0),
  costInPaise: z.number().int().min(0).optional().nullable(),
  stock: z.number().int().min(0).default(0),
  barcode: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
});

const productSchema = z.object({
  name: z.string(),
  nameTa: z.string().optional().nullable(),
  categoryId: z.number().int().optional().nullable(),
  priceInPaise: z.number().int().min(0),
  costInPaise: z.number().int().min(0).optional().nullable(),
  stockQuantity: z.number().int().min(0).default(0),
  lowStockAlert: z.number().int().min(0).default(5),
  barcode: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  hasVariants: z.boolean().default(false),
  variants: z.array(variantSchema).default([]),
});

type ProductInput = z.infer<typeof productSchema>;

export async function GET() {
  try {
    const products = await db.products.findMany();
    return NextResponse.json(products);
  } catch (err: any) {
    console.error('Inventory fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

/** Shared validation for create and update; returns an error message or null. */
async function validate(input: ProductInput, productId: number | null) {
  if (!input.name.trim()) return 'Product Name is required';
  if (input.hasVariants) {
    const variants = input.variants.filter((v) => v.variantName.trim());
    if (!variants.length) return 'Please add at least one variant SKU (e.g. Size S, 32, or custom variant)';
    const names = variants.map((v) => v.variantName.trim().toLowerCase());
    if (new Set(names).size !== names.length) return 'A variant with this name already exists for this product.';
    if (variants.some((v) => v.priceInPaise <= 0)) return 'Price must be greater than 0';
  } else if (input.priceInPaise <= 0) {
    return 'Price must be greater than 0';
  }

  const products = await db.products.findMany();
  const clash = products.find(
    (p: any) =>
      p.id !== productId &&
      p.name.trim().toLowerCase() === input.name.trim().toLowerCase() &&
      (p.categoryId ?? null) === (input.categoryId ?? null)
  );
  if (clash) return 'A product with this name already exists in the selected category.';

  const barcodes = input.hasVariants
    ? input.variants.map((v) => ({ code: v.barcode?.trim(), variantId: v.id ?? null }))
    : [{ code: input.barcode?.trim(), variantId: null }];
  const seen = new Set<string>();
  for (const b of barcodes) {
    if (!b.code) continue;
    if (seen.has(b.code)) return 'This barcode is already registered to another item.';
    seen.add(b.code);
    const owner = await findBarcodeOwner(b.code, productId ? { productId, variantId: b.variantId } : undefined);
    if (owner && owner.productId !== productId) return 'This barcode is already registered to another item.';
  }
  return null;
}

function toRecord(input: ProductInput) {
  return {
    data: {
      name: input.name.trim(),
      nameTa: input.nameTa?.trim() || null,
      categoryId: input.categoryId ?? null,
      priceInPaise: input.hasVariants ? input.variants[0]?.priceInPaise || input.priceInPaise : input.priceInPaise,
      costInPaise: input.costInPaise ?? null,
      stockQuantity: input.stockQuantity,
      lowStockAlert: input.lowStockAlert,
      barcode: input.hasVariants ? null : input.barcode?.trim() || null,
      sku: input.sku?.trim() || null,
      description: input.description?.trim() || null,
      hasVariants: input.hasVariants,
    },
    variants: input.hasVariants
      ? input.variants
          .filter((v) => v.variantName.trim())
          .map((v) => ({
            ...(v.id ? { id: v.id } : {}),
            variantName: v.variantName.trim(),
            sizeLabel: v.variantName.trim(),
            priceInPaise: v.priceInPaise,
            costInPaise: v.costInPaise ?? null,
            stock: v.stock,
            barcode: v.barcode?.trim() || null,
            sku: v.sku?.trim() || null,
          }))
      : [],
  };
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const parsed = productSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    const input = parsed.data;
    const problem = await validate(input, null);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });

    const { data, variants } = toRecord(input);
    const product = await db.inventory.saveProduct(null, data, variants);
    if (!product) return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });

    const by = user.name || 'Admin';
    if (input.hasVariants) {
      for (const v of product.variants || []) {
        await recordMovement({ productId: product.id, variantId: v.id, type: 'INTAKE', before: 0, after: v.stock || 0, note: `Initial stock for variant ${v.variantName}`, createdByName: by });
      }
    } else {
      await recordMovement({ productId: product.id, variantId: null, type: 'INTAKE', before: 0, after: product.stockQuantity || 0, note: 'Initial received stock on product creation', createdByName: by });
    }
    return NextResponse.json(product, { status: 201 });
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Product create error:', err);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const id = Number(body.id);
    if (!id) return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    const input = parsed.data;
    const existing = await db.products.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    const problem = await validate(input, id);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });

    const { data, variants } = toRecord(input);
    const product = await db.inventory.saveProduct(id, data, variants);
    if (!product) return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });

    const by = user.name || 'Admin';
    if (input.hasVariants) {
      const before = new Map<number, number>((existing.variants || []).map((v: any) => [v.id, v.stock || 0]));
      for (const v of product.variants || []) {
        if (before.has(v.id)) {
          await recordMovement({ productId: id, variantId: v.id, type: 'CORRECTION', before: before.get(v.id)!, after: v.stock || 0, note: `Stock updated for variant ${v.variantName}`, createdByName: by });
        } else {
          await recordMovement({ productId: id, variantId: v.id, type: 'RESTOCK', before: 0, after: v.stock || 0, note: `Added variant ${v.variantName} with stock`, createdByName: by });
        }
      }
    } else if (!existing.hasVariants) {
      await recordMovement({ productId: id, variantId: null, type: 'CORRECTION', before: existing.stockQuantity || 0, after: product.stockQuantity || 0, note: 'Stock updated in product editor', createdByName: by });
    }
    return NextResponse.json(product);
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Product update error:', err);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

/** DELETE ?id=<productId>[&variantId=<variantId>] — removes a product or a single variant SKU. */
export async function DELETE(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    const variantId = searchParams.get('variantId') ? Number(searchParams.get('variantId')) : null;
    if (!id) return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    const ok = await db.inventory.deleteSku(id, variantId);
    if (!ok) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
