import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authErrorResponse, requireAdmin } from '@/lib/auth';
import { parseCouponInput } from '../validation';

/**
 * Either toggles `isActive` alone, or updates the editable coupon fields.
 * The code itself can't be changed once created.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const id = parseInt(params.id, 10);
    const body = await request.json();

    let data: Record<string, unknown>;
    if (Object.keys(body).length === 1 && typeof body.isActive === 'boolean') {
      data = { isActive: body.isActive };
    } else {
      const parsed = parseCouponInput(body);
      if ('error' in parsed) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      data = { ...parsed.data };
    }

    const updated = await db.coupons.update({ where: { id }, data });
    if (!updated) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err: any) {
    const authError = authErrorResponse(err);
    if (authError) return authError;
    return NextResponse.json({ error: err.message || 'Error updating coupon' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const id = parseInt(params.id, 10);
    await db.coupons.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const authError = authErrorResponse(err);
    if (authError) return authError;
    return NextResponse.json({ error: err.message || 'Error deleting coupon' }, { status: 500 });
  }
}
