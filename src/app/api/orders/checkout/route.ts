import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { recordMovement } from '@/lib/inventory-server';
import {
  calculateGstAndTotals,
  validateSplitPayment,
  validateAndCalculateCoupon,
} from '@/lib/business-rules';

const checkoutSchema = z.object({
  customerName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  birthday: z.string().optional().nullable(),
  billingDate: z.string().optional().nullable(),
  posMode: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.number().int().optional().nullable(),
        variantId: z.number().int().optional().nullable(),
        productName: z.string().min(1),
        quantity: z.number().int().min(1),
        isManual: z.boolean().default(false),
        manualPriceInPaise: z.number().int().min(0).optional().nullable(),
      })
    )
    .min(1, 'Cart cannot be empty'),
  couponCode: z.string().optional().nullable(),
  manualDiscountInPaise: z.number().int().min(0).default(0),
  gstEnabled: z.boolean().default(false),
  paymentMode: z.enum(['cash', 'card', 'qr', 'split']),
  splitDetails: z
    .object({
      cashInPaise: z.number().int().min(0).default(0),
      cardInPaise: z.number().int().min(0).default(0),
      qrInPaise: z.number().int().min(0).default(0),
      otherInPaise: z.number().int().min(0).default(0),
    })
    .optional()
    .nullable(),
  remarks: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const result = checkoutSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid checkout request', details: result.error.format() },
        { status: 400 }
      );
    }

    const {
      customerName,
      phone,
      address,
      birthday,
      billingDate,
      posMode,
      items,
      couponCode,
      manualDiscountInPaise,
      gstEnabled,
      paymentMode,
      splitDetails,
      remarks,
    } = result.data;

    // =========================================================================
    // SECURITY: RECALCULATE ALL PRICES SERVER-SIDE FROM VERIFIED DATABASE DATA
    // Client prices are NEVER trusted.
    // =========================================================================
    const validatedCartItems: any[] = [];
    const stockDeductionPlan: { productId: number; variantId?: number | null; qty: number }[] = [];

    for (const item of items) {
      if (item.isManual) {
        // Ad-hoc custom manual item allowed by cashier
        const price = item.manualPriceInPaise || 0;
        validatedCartItems.push({
          productId: null,
          variantId: null,
          productName: item.productName,
          category: 'Custom Item',
          priceInPaise: price,
          quantity: item.quantity,
          lineTotalInPaise: price * item.quantity,
          isManual: true,
        });
      } else if (item.variantId) {
        // Variant lookup from product
        const product = await db.products.findUnique({ where: { id: item.productId || 0 } });
        if (!product) {
          return NextResponse.json({ error: `Product ID ${item.productId} not found` }, { status: 400 });
        }
        const variant = product.variants?.find((v: any) => v.id === item.variantId);
        if (!variant) {
          return NextResponse.json({ error: `Variant ID ${item.variantId} not found` }, { status: 400 });
        }

        // Verify available stock
        if (variant.stock < item.quantity) {
          return NextResponse.json(
            { error: `Insufficient stock for '${product.name} (${variant.variantName})'. Available: ${variant.stock}` },
            { status: 400 }
          );
        }

        const price = variant.priceInPaise || product.priceInPaise;
        validatedCartItems.push({
          productId: product.id,
          variantId: variant.id,
          productName: `${product.name} - ${variant.sizeLabel || variant.variantName}`,
          category: product.category?.nameEn || 'Standard',
          priceInPaise: price,
          quantity: item.quantity,
          lineTotalInPaise: price * item.quantity,
          isManual: false,
        });

        stockDeductionPlan.push({ productId: product.id, variantId: variant.id, qty: item.quantity });
      } else if (item.productId) {
        // Standard single product
        const product = await db.products.findUnique({ where: { id: item.productId } });
        if (!product) {
          return NextResponse.json({ error: `Product ID ${item.productId} not found` }, { status: 400 });
        }

        if (product.stockQuantity < item.quantity) {
          return NextResponse.json(
            { error: `Insufficient stock for '${product.name}'. Available: ${product.stockQuantity}` },
            { status: 400 }
          );
        }

        const price = product.priceInPaise;
        validatedCartItems.push({
          productId: product.id,
          variantId: null,
          productName: product.name,
          category: product.category?.nameEn || 'Standard',
          priceInPaise: price,
          quantity: item.quantity,
          lineTotalInPaise: price * item.quantity,
          isManual: false,
        });

        stockDeductionPlan.push({ productId: product.id, qty: item.quantity });
      }
    }

    // Compute subtotal from verified line items
    const baseSubtotalInPaise = validatedCartItems.reduce((acc, it) => acc + it.lineTotalInPaise, 0);

    // Validate Coupon if supplied
    let couponDiscountInPaise = 0;
    let appliedCoupon: any = null;
    if (couponCode?.trim()) {
      appliedCoupon = await db.coupons.findUnique({ where: { code: couponCode.trim() } });
      const cCheck = validateAndCalculateCoupon(appliedCoupon, baseSubtotalInPaise);
      if (!cCheck.valid) {
        return NextResponse.json({ error: cCheck.error }, { status: 400 });
      }
      couponDiscountInPaise = cCheck.discountInPaise;
    }

    // Execute server financial calculation engine
    const calc = calculateGstAndTotals(
      validatedCartItems,
      couponDiscountInPaise,
      manualDiscountInPaise,
      gstEnabled,
      0 // in-store POS delivery charge is 0
    );

    // Validate Split Tender if payment mode is 'split'
    if (paymentMode === 'split') {
      if (!splitDetails) {
        return NextResponse.json({ error: 'Split payment breakdown details required' }, { status: 400 });
      }
      const splitCheck = validateSplitPayment(calc.grandTotalInPaise, splitDetails);
      if (!splitCheck.valid) {
        return NextResponse.json({ error: splitCheck.error }, { status: 400 });
      }
    }

    // Generate atomic sequential invoice number
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const invoiceNo = await db.invoiceSequences.getNextNumber(todayStr);

    // Transactionally create order and deduct inventory
    const order = await db.orders.create({
      data: {
        invoiceNo,
        customerName: customerName?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        subtotalInPaise: calc.baseSubtotalInPaise,
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        couponDiscountPaise: calc.couponDiscountInPaise,
        manualDiscountPaise: calc.manualDiscountInPaise,
        totalGstPaise: calc.totalGstInPaise,
        gstEnabled,
        deliveryChargePaise: 0,
        totalInPaise: calc.grandTotalInPaise,
        paymentMode,
        splitDetails: paymentMode === 'split' ? splitDetails : null,
        status: 'completed',
        remarks: remarks?.trim() || null,
        cashierName: user.name || 'Admin',
        items: validatedCartItems.map((it) => ({
          productId: it.productId,
          variantId: it.variantId,
          productName: it.productName,
          category: it.category,
          unitPrice: it.priceInPaise,
          quantity: it.quantity,
          lineTotal: it.lineTotalInPaise,
          isManual: it.isManual,
        })),
      },
    });

    // Deduct stock for all purchased items and record each sale in the movement ledger
    for (const plan of stockDeductionPlan) {
      const prod = await db.products.findUnique({ where: { id: plan.productId } });
      if (!prod) continue;
      const variant = plan.variantId ? prod.variants?.find((v: any) => v.id === plan.variantId) : null;
      const current = variant ? variant.stock || 0 : prod.stockQuantity || 0;
      const next = Math.max(0, current - plan.qty);
      await db.inventory.setStock(prod.id, variant ? variant.id : null, next);
      await recordMovement({
        productId: prod.id,
        variantId: variant ? variant.id : null,
        type: 'SALE',
        before: current,
        after: next,
        note: `POS Sale checkout (${invoiceNo})`,
        createdByName: user.name || 'Admin',
      });
    }

    // Increment coupon usage count if used
    if (appliedCoupon) {
      await db.coupons.update({
        where: { id: appliedCoupon.id },
        data: { usageCount: (appliedCoupon.usageCount || 0) + 1 },
      });
    }

    // Save customer phone for loyalty & birthday rewards if customer provided
    if (phone?.trim() && customerName?.trim()) {
      const existing = (await db.customerBirthdays.findMany()).find((c: any) => c.phone === phone.trim());
      const bDate = birthday ? new Date(birthday).toISOString() : new Date('2000-01-01').toISOString();
      if (!existing) {
        await db.customerBirthdays.create({
          data: {
            name: customerName.trim(),
            phone: phone.trim(),
            birthDate: bDate,
          },
        });
      } else if (birthday) {
        await db.customerBirthdays.update({
          where: { id: existing.id },
          data: { birthDate: bDate },
        });
      }
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      invoiceNo: order.invoiceNo,
      totalInPaise: order.totalInPaise,
      createdAt: order.createdAt,
    });
  } catch (err: any) {
    console.error('Checkout error:', err);
    return NextResponse.json({ error: err.message || 'Checkout failed' }, { status: 500 });
  }
}
