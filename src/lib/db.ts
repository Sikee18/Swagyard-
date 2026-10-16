import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Global singleton for Prisma Client
declare global {
  var prismaGlobal: PrismaClient | undefined;
}

const prisma = global.prismaGlobal || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prismaGlobal = prisma;
}

// Local persistent JSON database for development / tests when PostgreSQL is offline
const DEV_DB_FILE = path.join(process.cwd(), 'prisma', 'dev_db.json');
const SEED_FILE = path.join(process.cwd(), 'prisma', 'seed_data.json');

function getDevData() {
  if (!fs.existsSync(DEV_DB_FILE)) {
    if (fs.existsSync(SEED_FILE)) {
      const initial = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
      fs.writeFileSync(DEV_DB_FILE, JSON.stringify(initial, null, 2));
      return initial;
    }
    return {
      users: [],
      categories: [],
      products: [],
      coupons: [],
      expenses: [],
      customerBirthdays: [],
      advanceOrders: [],
      orders: [],
      orderItems: [],
      inventoryMovements: [],
      invoiceSequences: {}
    };
  }
  return JSON.parse(fs.readFileSync(DEV_DB_FILE, 'utf8'));
}

function saveDevData(data: any) {
  fs.writeFileSync(DEV_DB_FILE, JSON.stringify(data, null, 2));
}

const DEFAULT_EXPENSE_CATEGORIES = ['Maintenance', 'Marketing', 'Other', 'Rent', 'Salaries', 'Supplies'];

let postgresStatus: boolean | null = null;

/**
 * Once PostgreSQL is connected it is the only source of truth: a missing record becomes
 * `null`, and any other query error is raised rather than silently falling back to the
 * local JSON store (which would split data between two places).
 */
function pgError(err: unknown): null {
  if ((err as { code?: string })?.code === 'P2025') return null;
  throw err;
}
let lastPostgresCheck = 0;

export const db = {
  prisma,
  // Helper to check if external database is reachable (cached with quick timeout)
  isPostgresAvailable: async () => {
    // Serverless hosts (Vercel) have a read-only filesystem, so the JSON store can't work there;
    // always use PostgreSQL and let a cold-starting database (e.g. Neon) take the time it needs.
    if (process.env.VERCEL) {
      postgresStatus = true;
      return true;
    }
    const now = Date.now();
    if (postgresStatus !== null && now - lastPostgresCheck < 30000) {
      return postgresStatus;
    }
    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000));
      await Promise.race([prisma.$queryRaw`SELECT 1`, timeoutPromise]);
      postgresStatus = true;
    } catch {
      postgresStatus = false;
    }
    lastPostgresCheck = Date.now();
    return postgresStatus;
  },

  // USERS
  users: {
    findUnique: async ({ where }: { where: { username?: string; id?: string; email?: string } }) => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.user.findUnique({ where: where as any });
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const data = getDevData();
      return data.users?.find((u: any) =>
        (where.username && u.username.toLowerCase() === where.username.toLowerCase()) ||
        (where.id && u.id === where.id) ||
        (where.email && u.email === where.email)
      ) || null;
    },
    create: async ({ data }: { data: any }) => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.user.create({ data });
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      const user = { id: `usr_${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...data };
      dev.users = dev.users || [];
      dev.users.push(user);
      saveDevData(dev);
      return user;
    }
  },

  // CATEGORIES
  categories: {
    findMany: async (args?: any) => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.category.findMany(args);
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      return (dev.categories || []).sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
    },
    create: async ({ data }: { data: any }) => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.category.create({ data });
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      dev.categories = dev.categories || [];
      const id = dev.categories.reduce((m: number, c: any) => Math.max(m, c.id), 0) + 1;
      const cat = { id, createdAt: new Date().toISOString(), ...data };
      dev.categories.push(cat);
      saveDevData(dev);
      return cat;
    },
    update: async ({ where, data }: { where: { id: number }; data: any }) => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.category.update({ where, data });
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      const cat = dev.categories?.find((c: any) => c.id === where.id);
      if (!cat) return null;
      Object.assign(cat, data);
      saveDevData(dev);
      return cat;
    },
    /** Deletes a category and moves its products to "General" (created if missing). */
    delete: async ({ where }: { where: { id: number } }) => {
      try {
        if (await db.isPostgresAvailable()) {
          return await prisma.$transaction(async (tx) => {
            let general = await tx.category.findFirst({ where: { nameEn: 'General', id: { not: where.id } } });
            if (!general) general = await tx.category.create({ data: { nameEn: 'General', isActive: true, sortOrder: 0 } });
            await tx.product.updateMany({ where: { categoryId: where.id }, data: { categoryId: general.id } });
            return tx.category.delete({ where });
          });
        }
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      dev.categories = dev.categories || [];
      let general = dev.categories.find((c: any) => c.nameEn === 'General' && c.id !== where.id);
      if (!general) {
        general = {
          id: dev.categories.reduce((m: number, c: any) => Math.max(m, c.id), 0) + 1,
          nameEn: 'General',
          nameTa: null,
          isActive: true,
          sortOrder: 0,
          createdAt: new Date().toISOString(),
        };
        dev.categories.push(general);
      }
      for (const p of dev.products || []) {
        if (p.categoryId === where.id) p.categoryId = general.id;
      }
      dev.categories = dev.categories.filter((c: any) => c.id !== where.id);
      saveDevData(dev);
      return true;
    }
  },

  // PRODUCTS & VARIANTS
  products: {
    findMany: async (args?: any) => {
      try {
        if (await db.isPostgresAvailable()) {
          return await prisma.product.findMany({
            include: { variants: true, category: true },
            orderBy: { sortOrder: 'asc' }
          });
        }
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      return (dev.products || []).map((p: any) => ({
        ...p,
        category: dev.categories?.find((c: any) => c.id === p.categoryId) || null,
        variants: p.variants || []
      }));
    },
    findUnique: async ({ where }: { where: { id?: number; sku?: string; barcode?: string } }) => {
      try {
        if (await db.isPostgresAvailable()) {
          return await prisma.product.findUnique({ where: where as any, include: { variants: true, category: true } });
        }
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      return (dev.products || []).find((p: any) =>
        (where.id && p.id === Number(where.id)) ||
        (where.sku && p.sku === where.sku) ||
        (where.barcode && p.barcode === where.barcode)
      ) || null;
    },
    create: async ({ data }: { data: any }) => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.product.create({ data, include: { variants: true } });
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      const id = (dev.products?.length ? Math.max(...dev.products.map((p: any) => p.id)) : 0) + 1;
      const product = {
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...data,
        variants: data.variants || []
      };
      dev.products = dev.products || [];
      dev.products.push(product);
      saveDevData(dev);
      return product;
    },
    update: async ({ where, data }: { where: { id: number }; data: any }) => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.product.update({ where, data, include: { variants: true } });
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      const idx = dev.products?.findIndex((p: any) => p.id === Number(where.id));
      if (idx !== -1 && idx !== undefined) {
        dev.products[idx] = { ...dev.products[idx], ...data, updatedAt: new Date().toISOString() };
        saveDevData(dev);
        return dev.products[idx];
      }
      return null;
    },
    delete: async ({ where }: { where: { id: number } }) => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.product.delete({ where });
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      dev.products = (dev.products || []).filter((p: any) => p.id !== Number(where.id));
      saveDevData(dev);
      return { id: where.id };
    }
  },

  // ORDERS & TRANSACTIONAL CHECKOUT
  orders: {
    findMany: async (args?: any) => {
      try {
        if (await db.isPostgresAvailable()) {
          return await prisma.order.findMany({
            include: { items: true },
            orderBy: { createdAt: 'desc' }
          });
        }
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      return (dev.orders || []).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    findUnique: async ({ where }: { where: { id?: string; invoiceNo?: string } }) => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.order.findUnique({ where: where as any, include: { items: true } });
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      return (dev.orders || []).find((o: any) =>
        (where.id && o.id === where.id) ||
        (where.invoiceNo && o.invoiceNo === where.invoiceNo)
      ) || null;
    },
    create: async ({ data }: { data: any }) => {
      try {
        if (await db.isPostgresAvailable()) {
          return await prisma.order.create({
            data: {
              ...data,
              items: { create: data.items }
            },
            include: { items: true }
          });
        }
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      const id = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const order = {
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...data,
        items: (data.items || []).map((it: any, idx: number) => ({ id: idx + 1, orderId: id, ...it }))
      };
      dev.orders = dev.orders || [];
      dev.orders.unshift(order);
      saveDevData(dev);
      return order;
    },
    /** Updates scalar order fields (customer details, remarks, status). */
    update: async ({ where, data }: { where: { id: string }; data: any }) => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.order.update({ where, data, include: { items: true } });
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      const idx = dev.orders?.findIndex((o: any) => o.id === where.id);
      if (idx === -1 || idx === undefined) return null;
      dev.orders[idx] = { ...dev.orders[idx], ...data, updatedAt: new Date().toISOString() };
      saveDevData(dev);
      return dev.orders[idx];
    },
    /** Deletes an order and unlinks any advance order that produced it. */
    delete: async ({ where }: { where: { id: string } }) => {
      try {
        if (await db.isPostgresAvailable()) {
          await prisma.advanceOrder.updateMany({ where: { completedOrderId: where.id }, data: { completedOrderId: null } });
          return await prisma.order.delete({ where });
        }
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      for (const adv of dev.advanceOrders || []) {
        if (adv.completedOrderId === where.id) adv.completedOrderId = null;
      }
      const idx = dev.orders?.findIndex((o: any) => o.id === where.id);
      if (idx === -1 || idx === undefined) return null;
      const removed = dev.orders.splice(idx, 1)[0];
      saveDevData(dev);
      return removed;
    }
  },

  // EXPENSES
  expenses: {
    findMany: async (args?: any) => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.expense.findMany({ orderBy: { expenseDate: 'desc' } });
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      return (dev.expenses || []).sort((a: any, b: any) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
    },
    create: async ({ data }: { data: any }) => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.expense.create({ data });
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      const id = `exp_${Date.now()}`;
      const expense = { id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...data };
      dev.expenses = dev.expenses || [];
      dev.expenses.unshift(expense);
      saveDevData(dev);
      return expense;
    },
    delete: async ({ where }: { where: { id: string } }) => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.expense.delete({ where });
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      const idx = dev.expenses?.findIndex((e: any) => e.id === where.id);
      if (idx !== -1 && idx !== undefined) {
        const removed = dev.expenses.splice(idx, 1)[0];
        saveDevData(dev);
        return removed;
      }
      return null;
    },
    update: async ({ where, data }: { where: { id: string }; data: any }) => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.expense.update({ where, data });
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      const idx = dev.expenses?.findIndex((e: any) => e.id === where.id);
      if (idx === -1 || idx === undefined) return null;
      dev.expenses[idx] = { ...dev.expenses[idx], ...data, updatedAt: new Date().toISOString() };
      saveDevData(dev);
      return dev.expenses[idx];
    }
  },

  // EXPENSE CATEGORIES
  expenseCategories: {
    findMany: async () => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.expenseCategory.findMany({ orderBy: { name: 'asc' } });
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      if (!dev.expenseCategories) {
        dev.expenseCategories = DEFAULT_EXPENSE_CATEGORIES.map((name, i) => ({
          id: i + 1,
          name,
          createdAt: new Date().toISOString(),
        }));
        saveDevData(dev);
      }
      return [...dev.expenseCategories].sort((a: any, b: any) => a.name.localeCompare(b.name));
    },
    create: async ({ data }: { data: { name: string } }) => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.expenseCategory.create({ data });
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      dev.expenseCategories = dev.expenseCategories || [];
      if (dev.expenseCategories.some((c: any) => c.name.toLowerCase() === data.name.toLowerCase())) {
        throw new Error(`Category "${data.name}" already exists`);
      }
      const nextId = dev.expenseCategories.reduce((max: number, c: any) => Math.max(max, c.id), 0) + 1;
      const category = { id: nextId, name: data.name, createdAt: new Date().toISOString() };
      dev.expenseCategories.push(category);
      saveDevData(dev);
      return category;
    },
    update: async ({ where, data }: { where: { id: number }; data: { name: string } }) => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.expenseCategory.update({ where, data });
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      const idx = dev.expenseCategories?.findIndex((c: any) => c.id === where.id);
      if (idx === -1 || idx === undefined) return null;
      dev.expenseCategories[idx] = { ...dev.expenseCategories[idx], ...data };
      saveDevData(dev);
      return dev.expenseCategories[idx];
    },
    delete: async ({ where }: { where: { id: number } }) => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.expenseCategory.delete({ where });
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      dev.expenseCategories = (dev.expenseCategories || []).filter((c: any) => c.id !== where.id);
      saveDevData(dev);
      return null;
    }
  },

  // COUPONS
  coupons: {
    findMany: async (args?: any) => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      return dev.coupons || [];
    },
    findUnique: async ({ where }: { where: { code?: string; id?: number } }) => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.coupon.findUnique({ where: where as any });
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      return (dev.coupons || []).find((c: any) =>
        (where.code && c.code.toUpperCase() === where.code.toUpperCase()) ||
        (where.id && c.id === where.id)
      ) || null;
    },
    create: async ({ data }: { data: any }) => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.coupon.create({ data });
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      const id = (dev.coupons?.length || 0) + 1;
      const coupon = { id, createdAt: new Date().toISOString(), ...data };
      dev.coupons = dev.coupons || [];
      dev.coupons.push(coupon);
      saveDevData(dev);
      return coupon;
    },
    update: async ({ where, data }: { where: { id: number }; data: any }) => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.coupon.update({ where, data });
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      const idx = dev.coupons?.findIndex((c: any) => c.id === where.id);
      if (idx !== -1 && idx !== undefined) {
        dev.coupons[idx] = { ...dev.coupons[idx], ...data };
        saveDevData(dev);
        return dev.coupons[idx];
      }
      return null;
    },
    delete: async ({ where }: { where: { id: number } }) => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.coupon.delete({ where });
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      const idx = dev.coupons?.findIndex((c: any) => c.id === where.id);
      if (idx !== -1 && idx !== undefined) {
        const removed = dev.coupons.splice(idx, 1)[0];
        saveDevData(dev);
        return removed;
      }
      return null;
    }
  },

  // ADVANCE ORDERS
  advanceOrders: {
    findMany: async () => {
      try {
        if (await db.isPostgresAvailable()) {
          return await prisma.advanceOrder.findMany({
            include: { payments: { orderBy: { createdAt: 'asc' } }, timeline: { orderBy: { createdAt: 'asc' } } },
            orderBy: { createdAt: 'desc' }
          });
        }
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      return (dev.advanceOrders || []).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    findUnique: async ({ where }: { where: { id: string } }) => {
      try {
        if (await db.isPostgresAvailable()) {
          return await prisma.advanceOrder.findUnique({
            where,
            include: { payments: { orderBy: { createdAt: 'asc' } }, timeline: { orderBy: { createdAt: 'asc' } } }
          });
        }
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      return (dev.advanceOrders || []).find((a: any) => a.id === where.id) || null;
    },
    /** `payments` and `timeline` are created alongside the order. */
    create: async ({ data, payments = [], timeline = [] }: { data: any; payments?: any[]; timeline?: any[] }) => {
      try {
        if (await db.isPostgresAvailable()) {
          return await prisma.advanceOrder.create({
            data: { ...data, payments: { create: payments }, timeline: { create: timeline } },
            include: { payments: true, timeline: true }
          });
        }
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      const id = `adv_${Date.now()}`;
      const now = new Date().toISOString();
      const adv = {
        id,
        createdAt: now,
        updatedAt: now,
        ...data,
        payments: payments.map((p, i) => ({ id: Date.now() + i, createdAt: now, ...p })),
        timeline: timeline.map((t, i) => ({ id: Date.now() + i, createdAt: now, ...t }))
      };
      dev.advanceOrders = dev.advanceOrders || [];
      dev.advanceOrders.unshift(adv);
      saveDevData(dev);
      return adv;
    },
    /** Updates scalar fields only; use addPayment/addTimeline for related rows. */
    update: async ({ where, data }: { where: { id: string }; data: any }) => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.advanceOrder.update({ where, data, include: { payments: true, timeline: true } });
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      const idx = dev.advanceOrders?.findIndex((a: any) => a.id === where.id);
      if (idx !== -1 && idx !== undefined) {
        dev.advanceOrders[idx] = { ...dev.advanceOrders[idx], ...data, updatedAt: new Date().toISOString() };
        saveDevData(dev);
        return dev.advanceOrders[idx];
      }
      return null;
    },
    addPayment: async (advanceOrderId: string, payment: any) => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.advanceOrderPayment.create({ data: { ...payment, advanceOrderId } });
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      const order = dev.advanceOrders?.find((a: any) => a.id === advanceOrderId);
      if (!order) return null;
      const row = { id: Date.now(), createdAt: new Date().toISOString(), ...payment };
      order.payments = [...(order.payments || []), row];
      saveDevData(dev);
      return row;
    },
    addTimeline: async (advanceOrderId: string, events: any[]) => {
      try {
        if (await db.isPostgresAvailable()) {
          await prisma.advanceOrderTimeline.createMany({ data: events.map((e) => ({ ...e, advanceOrderId })) });
          return;
        }
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      const order = dev.advanceOrders?.find((a: any) => a.id === advanceOrderId);
      if (!order) return;
      const now = new Date().toISOString();
      order.timeline = [...(order.timeline || []), ...events.map((e, i) => ({ id: Date.now() + i, createdAt: now, ...e }))];
      saveDevData(dev);
    },
    delete: async ({ where }: { where: { id: string } }) => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.advanceOrder.delete({ where });
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      const idx = dev.advanceOrders?.findIndex((a: any) => a.id === where.id);
      if (idx !== -1 && idx !== undefined) {
        const removed = dev.advanceOrders.splice(idx, 1)[0];
        saveDevData(dev);
        return removed;
      }
      return null;
    },
    /** Sequential per-day deposit IDs, sharing the invoice sequence table under a DEP- key. */
    nextDepositId: async (dateStr: string) => {
      const key = `DEP-${dateStr}`;
      let n: number | null = null;
      try {
        if (await db.isPostgresAvailable()) {
          const seq = await prisma.invoiceSequence.upsert({
            where: { id: key },
            update: { lastSequence: { increment: 1 } },
            create: { id: key, lastSequence: 1 }
          });
          n = seq.lastSequence;
        }
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      if (n === null) {
        const dev = getDevData();
        dev.invoiceSequences = dev.invoiceSequences || {};
        n = (dev.invoiceSequences[key] || 0) + 1;
        dev.invoiceSequences[key] = n;
        saveDevData(dev);
      }
      return `DEP-${dateStr}-${String(n).padStart(4, '0')}`;
    }
  },

  // CUSTOMER BIRTHDAYS
  customerBirthdays: {
    findMany: async (args?: any) => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.customerBirthday.findMany({ orderBy: { birthDate: 'asc' } });
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      return dev.customerBirthdays || [];
    },
    create: async ({ data }: { data: any }) => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.customerBirthday.create({ data });
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      const id = (dev.customerBirthdays?.length || 0) + 1;
      const bday = { id, createdAt: new Date().toISOString(), ...data };
      dev.customerBirthdays = dev.customerBirthdays || [];
      dev.customerBirthdays.push(bday);
      saveDevData(dev);
      return bday;
    },
    update: async ({ where, data }: { where: { id: number }; data: any }) => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.customerBirthday.update({ where, data });
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      const idx = dev.customerBirthdays?.findIndex((b: any) => b.id === where.id);
      if (idx !== -1 && idx !== undefined) {
        dev.customerBirthdays[idx] = { ...dev.customerBirthdays[idx], ...data };
        saveDevData(dev);
        return dev.customerBirthdays[idx];
      }
      return null;
    },
    delete: async ({ where }: { where: { id: number } }) => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.customerBirthday.delete({ where });
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      const idx = dev.customerBirthdays?.findIndex((b: any) => b.id === where.id);
      if (idx !== -1 && idx !== undefined) {
        const removed = dev.customerBirthdays.splice(idx, 1)[0];
        saveDevData(dev);
        return removed;
      }
      return null;
    }
  },

  // INVOICE NUMBER GENERATION (Sequential & race-safe)
  invoiceSequences: {
    getNextNumber: async (dateStr: string) => {
      try {
        if (await db.isPostgresAvailable()) {
          const seq = await prisma.invoiceSequence.upsert({
            where: { id: dateStr },
            update: { lastSequence: { increment: 1 } },
            create: { id: dateStr, lastSequence: 1 }
          });
          const padded = String(seq.lastSequence).padStart(4, '0');
          return `SWAG-${dateStr}-${padded}`;
        }
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      dev.invoiceSequences = dev.invoiceSequences || {};
      const current = (dev.invoiceSequences[dateStr] || 0) + 1;
      dev.invoiceSequences[dateStr] = current;
      saveDevData(dev);
      const padded = String(current).padStart(4, '0');
      return `SWAG-${dateStr}-${padded}`;
    }
  },

  // INVENTORY (per-SKU stock, product/variant saves) — handles embedded variants in the JSON store
  inventory: {
    /** Sets the stock of a product (or one of its variants) and returns the previous value. */
    setStock: async (productId: number, variantId: number | null, newStock: number): Promise<number | null> => {
      try {
        if (await db.isPostgresAvailable()) {
          return await prisma.$transaction(async (tx) => {
            if (variantId) {
              const v = await tx.productVariant.findUnique({ where: { id: variantId } });
              if (!v) return null;
              await tx.productVariant.update({ where: { id: variantId }, data: { stock: newStock } });
              const agg = await tx.productVariant.aggregate({ where: { productId }, _sum: { stock: true } });
              await tx.product.update({ where: { id: productId }, data: { stockQuantity: agg._sum.stock || 0 } });
              return v.stock;
            }
            const p = await tx.product.findUnique({ where: { id: productId } });
            if (!p) return null;
            await tx.product.update({ where: { id: productId }, data: { stockQuantity: newStock } });
            return p.stockQuantity;
          });
        }
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      const product = dev.products?.find((p: any) => p.id === productId);
      if (!product) return null;
      let previous: number;
      if (variantId) {
        const v = (product.variants || []).find((x: any) => x.id === variantId);
        if (!v) return null;
        previous = v.stock || 0;
        v.stock = newStock;
        product.stockQuantity = product.variants.reduce((s: number, x: any) => s + (x.stock || 0), 0);
      } else {
        previous = product.stockQuantity || 0;
        product.stockQuantity = newStock;
      }
      product.updatedAt = new Date().toISOString();
      saveDevData(dev);
      return previous;
    },
    /** Updates selling (and optionally cost) price of a product or variant. */
    setPrice: async (productId: number, variantId: number | null, priceInPaise: number, costInPaise?: number) => {
      const data: any = { priceInPaise };
      if (costInPaise !== undefined) data.costInPaise = costInPaise;
      try {
        if (await db.isPostgresAvailable()) {
          if (variantId) await prisma.productVariant.update({ where: { id: variantId }, data });
          else await prisma.product.update({ where: { id: productId }, data });
          return true;
        }
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      const product = dev.products?.find((p: any) => p.id === productId);
      if (!product) return false;
      const target = variantId ? (product.variants || []).find((x: any) => x.id === variantId) : product;
      if (!target) return false;
      Object.assign(target, data);
      product.updatedAt = new Date().toISOString();
      saveDevData(dev);
      return true;
    },
    /**
     * Creates or replaces a product with its variants. Variants with an `id` are updated,
     * new ones are created, and existing variants missing from the list are removed.
     */
    saveProduct: async (id: number | null, data: any, variants: any[]) => {
      const stockQuantity = data.hasVariants ? variants.reduce((s, v) => s + (v.stock || 0), 0) : data.stockQuantity;
      try {
        if (await db.isPostgresAvailable()) {
          return await prisma.$transaction(async (tx) => {
            const product = id
              ? await tx.product.update({ where: { id }, data: { ...data, stockQuantity } })
              : await tx.product.create({ data: { ...data, stockQuantity } });
            const keep: number[] = [];
            for (const v of data.hasVariants ? variants : []) {
              const { id: vid, ...vdata } = v;
              if (vid) {
                await tx.productVariant.update({ where: { id: vid }, data: vdata });
                keep.push(vid);
              } else {
                const created = await tx.productVariant.create({ data: { ...vdata, productId: product.id } });
                keep.push(created.id);
              }
            }
            await tx.productVariant.deleteMany({ where: { productId: product.id, id: { notIn: keep } } });
            return tx.product.findUnique({ where: { id: product.id }, include: { variants: true, category: true } });
          });
        }
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      dev.products = dev.products || [];
      const now = new Date().toISOString();
      let nextVariantId =
        dev.products.flatMap((p: any) => (p.variants || []).map((v: any) => v.id)).reduce((m: number, x: number) => Math.max(m, x), 0) + 1;
      const embedded = (data.hasVariants ? variants : []).map((v) => ({ ...v, id: v.id || nextVariantId++, isActive: true }));
      if (id) {
        const idx = dev.products.findIndex((p: any) => p.id === id);
        if (idx === -1) return null;
        dev.products[idx] = { ...dev.products[idx], ...data, stockQuantity, variants: embedded, updatedAt: now };
        saveDevData(dev);
        return dev.products[idx];
      }
      const newId = dev.products.reduce((m: number, p: any) => Math.max(m, p.id), 0) + 1;
      const product = { id: newId, createdAt: now, updatedAt: now, isActive: true, sortOrder: 0, ...data, stockQuantity, variants: embedded };
      dev.products.push(product);
      saveDevData(dev);
      return product;
    },
    setBarcode: async (productId: number, variantId: number | null, barcode: string) => {
      try {
        if (await db.isPostgresAvailable()) {
          if (variantId) await prisma.productVariant.update({ where: { id: variantId }, data: { barcode } });
          else await prisma.product.update({ where: { id: productId }, data: { barcode } });
          return true;
        }
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      const product = dev.products?.find((p: any) => p.id === productId);
      if (!product) return false;
      const target = variantId ? (product.variants || []).find((v: any) => v.id === variantId) : product;
      if (!target) return false;
      target.barcode = barcode;
      saveDevData(dev);
      return true;
    },
    /** Deletes one variant, or the whole product when no variant is given. */
    deleteSku: async (productId: number, variantId: number | null) => {
      try {
        if (await db.isPostgresAvailable()) {
          if (variantId) {
            await prisma.productVariant.delete({ where: { id: variantId } });
            const agg = await prisma.productVariant.aggregate({ where: { productId }, _sum: { stock: true }, _count: true });
            await prisma.product.update({
              where: { id: productId },
              data: { stockQuantity: agg._sum.stock || 0, hasVariants: agg._count > 0 },
            });
          } else {
            await prisma.product.delete({ where: { id: productId } });
          }
          return true;
        }
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      const product = dev.products?.find((p: any) => p.id === productId);
      if (!product) return false;
      if (variantId) {
        product.variants = (product.variants || []).filter((v: any) => v.id !== variantId);
        product.stockQuantity = product.variants.reduce((s: number, v: any) => s + (v.stock || 0), 0);
        product.hasVariants = product.variants.length > 0;
      } else {
        dev.products = dev.products.filter((p: any) => p.id !== productId);
      }
      saveDevData(dev);
      return true;
    },
  },

  // INVENTORY MOVEMENTS (AUDIT TRAIL)
  inventoryMovements: {
    findMany: async (args?: any) => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.inventoryMovement.findMany({ orderBy: { createdAt: 'desc' } });
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      return dev.inventoryMovements || [];
    },
    create: async ({ data }: { data: any }) => {
      try {
        if (await db.isPostgresAvailable()) return await prisma.inventoryMovement.create({ data });
      } catch (err) {
        if (postgresStatus) return pgError(err);
      }
      const dev = getDevData();
      const id = (dev.inventoryMovements?.length || 0) + 1;
      const mov = { id, createdAt: new Date().toISOString(), ...data };
      dev.inventoryMovements = dev.inventoryMovements || [];
      dev.inventoryMovements.unshift(mov);
      saveDevData(dev);
      return mov;
    }
  }
};
