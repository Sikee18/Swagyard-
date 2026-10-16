/**
 * One-time import of the local JSON store (prisma/dev_db.json) into PostgreSQL.
 * Keeps record IDs, then advances the SERIAL sequences past the imported IDs.
 *
 * Usage: node scripts/import-json-to-postgres.js [--force]
 *   --force  wipe existing rows first (otherwise refuses to run on a non-empty database)
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
// The live JSON store if present, otherwise the seed it starts from (dev_db.json is git-ignored).
const devDb = path.join(__dirname, '..', 'prisma', 'dev_db.json');
const source = fs.existsSync(devDb) ? devDb : path.join(__dirname, '..', 'prisma', 'seed_data.json');
console.log(`Importing from ${path.basename(source)}`);
const data = JSON.parse(fs.readFileSync(source, 'utf8'));

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));
const date = (v) => (v ? new Date(v) : undefined);

async function main() {
  const existing = await prisma.user.count();
  if (existing && !process.argv.includes('--force')) {
    console.error('Database already has data. Re-run with --force to wipe and re-import.');
    process.exit(1);
  }

  await prisma.$transaction(async (tx) => {
    // Children before parents
    for (const model of [
      'advanceOrderTimeline', 'advanceOrderPayment', 'advanceOrder', 'orderItem', 'order', 'inventoryMovement',
      'productVariant', 'product', 'category', 'coupon', 'expense', 'expenseCategory', 'customerBirthday',
      'invoiceSequence', 'user',
    ]) {
      await tx[model].deleteMany();
    }

    await tx.user.createMany({ data: (data.users || []).map((u) => pick(u, ['id', 'username', 'email', 'passwordHash', 'role', 'name'])) });
    await tx.category.createMany({ data: (data.categories || []).map((c) => pick(c, ['id', 'nameEn', 'nameTa', 'isActive', 'sortOrder'])) });

    for (const p of data.products || []) {
      await tx.product.create({
        data: {
          ...pick(p, ['id', 'name', 'nameTa', 'categoryId', 'priceInPaise', 'costInPaise', 'stockQuantity', 'lowStockAlert', 'sku', 'barcode', 'hasVariants', 'isActive', 'sortOrder', 'description']),
          variants: {
            create: (p.variants || []).map((v) =>
              pick(v, ['id', 'variantName', 'sizeLabel', 'sku', 'barcode', 'costInPaise', 'mrpInPaise', 'priceInPaise', 'stock', 'isActive'])
            ),
          },
        },
      });
    }

    await tx.coupon.createMany({
      data: (data.coupons || []).map((c) => ({
        ...pick(c, ['id', 'code', 'percentage', 'minOrderPaise', 'usageLimit', 'usageCount', 'isActive']),
        expiryDate: date(c.expiryDate),
      })),
    });
    await tx.expenseCategory.createMany({ data: (data.expenseCategories || []).map((c) => pick(c, ['id', 'name'])) });
    await tx.expense.createMany({
      data: (data.expenses || []).map((e) => ({
        ...pick(e, ['id', 'categoryId', 'categoryName', 'amountInPaise', 'paymentMode', 'recordedByName', 'description']),
        expenseDate: date(e.expenseDate),
      })),
    });
    await tx.customerBirthday.createMany({
      data: (data.customerBirthdays || []).map((b) => ({ ...pick(b, ['id', 'name', 'phone']), birthDate: date(b.birthDate) })),
    });

    const productIds = new Set((data.products || []).map((p) => p.id));
    const variantIds = new Set((data.products || []).flatMap((p) => (p.variants || []).map((v) => v.id)));
    for (const o of data.orders || []) {
      await tx.order.create({
        data: {
          ...pick(o, [
            'id', 'invoiceNo', 'customerName', 'phone', 'address', 'subtotalInPaise', 'couponCode', 'couponDiscountPaise',
            'manualDiscountPaise', 'totalGstPaise', 'gstEnabled', 'deliveryChargePaise', 'totalInPaise', 'paymentMode',
            'splitDetails', 'status', 'remarks', 'referenceNumber', 'cashierName',
          ]),
          createdAt: date(o.createdAt),
          items: {
            create: (o.items || []).map((it) => ({
              ...pick(it, ['productName', 'category', 'unitPrice', 'quantity', 'lineTotal', 'isManual']),
              productId: productIds.has(it.productId) ? it.productId : null,
              variantId: variantIds.has(it.variantId) ? it.variantId : null,
            })),
          },
        },
      });
    }

    for (const a of data.advanceOrders || []) {
      await tx.advanceOrder.create({
        data: {
          ...pick(a, [
            'id', 'depositId', 'customerName', 'phone', 'address', 'productName', 'category', 'description', 'totalAmountPaise',
            'depositAmountPaise', 'remainingBalancePaise', 'depositPaymentMode', 'status', 'referenceNumber', 'remarks',
            'completedOrderId', 'invoiceNo', 'finalPaymentMode', 'finalSplitDetails', 'createdByName',
          ]),
          expectedDeliveryDate: date(a.expectedDeliveryDate),
          completedAt: date(a.completedAt),
          createdAt: date(a.createdAt),
          payments: {
            create: (a.payments || []).map((p) => ({
              ...pick(p, ['paymentType', 'amountInPaise', 'paymentMode', 'splitDetails', 'remarks']),
              createdAt: date(p.createdAt),
            })),
          },
          timeline: {
            create: (a.timeline || []).map((t) => ({ ...pick(t, ['eventType', 'label', 'remarks']), createdAt: date(t.createdAt) })),
          },
        },
      });
    }

    await tx.inventoryMovement.createMany({
      data: (data.inventoryMovements || []).map((m) => ({
        ...pick(m, ['id', 'previousStock', 'newStock', 'quantityChange', 'reason', 'createdByName', 'note']),
        productId: productIds.has(m.productId) ? m.productId : null,
        variantId: variantIds.has(m.variantId) ? m.variantId : null,
        createdAt: date(m.createdAt),
      })),
    });
    await tx.invoiceSequence.createMany({
      data: Object.entries(data.invoiceSequences || {}).map(([id, lastSequence]) => ({ id, lastSequence })),
    });
  });

  // Advance SERIAL sequences past imported IDs
  for (const table of [
    'categories', 'products', 'product_variants', 'coupons', 'expense_categories', 'customer_birthdays', 'order_items',
    'inventory_movements', 'advance_order_payments', 'advance_order_timeline',
  ]) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1, false)`
    );
  }

  const counts = {
    users: await prisma.user.count(),
    products: await prisma.product.count(),
    variants: await prisma.productVariant.count(),
    orders: await prisma.order.count(),
    advanceOrders: await prisma.advanceOrder.count(),
    expenses: await prisma.expense.count(),
    coupons: await prisma.coupon.count(),
    birthdays: await prisma.customerBirthday.count(),
  };
  console.log('Imported:', JSON.stringify(counts));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
