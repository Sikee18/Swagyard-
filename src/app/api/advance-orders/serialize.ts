import { normalizeStatus, type AdvanceOrder } from '@/lib/advance-orders';

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : (v as string | null | undefined) ?? null);

/** Shapes a stored advance order (Prisma row or JSON record) for the client, mapping legacy statuses. */
export function serializeAdvanceOrder(row: any): AdvanceOrder {
  const byDate = (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  return {
    ...row,
    depositId: row.depositId || row.referenceNumber || row.id,
    status: normalizeStatus(row.status),
    createdAt: iso(row.createdAt) || new Date(0).toISOString(),
    expectedDeliveryDate: iso(row.expectedDeliveryDate),
    completedAt: iso(row.completedAt),
    payments: [...(row.payments || [])]
      .map((p: any) => ({ ...p, paymentType: p.paymentType || 'deposit', createdAt: iso(p.createdAt) }))
      .sort(byDate),
    timeline: [...(row.timeline || [])].map((t: any) => ({ ...t, createdAt: iso(t.createdAt) })).sort(byDate),
  };
}

/** Parses `{ cash, qr }` rupee amounts into paise. */
export function parseSplitRupees(split: any) {
  const toPaise = (v: unknown) => Math.max(0, Math.round((Number(v) || 0) * 100));
  return { cash: toPaise(split?.cash), qr: toPaise(split?.qr) };
}
