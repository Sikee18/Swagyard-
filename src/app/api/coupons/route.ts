import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { parseCouponInput } from './validation';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (code) {
      const coupon = await db.coupons.findUnique({ where: { code: code.trim().toUpperCase() } });
      if (!coupon || !coupon.isActive) {
        return NextResponse.json({ error: 'Coupon not found or inactive' }, { status: 404 });
      }
      return NextResponse.json(coupon);
    }

    const coupons = await db.coupons.findMany();
    return NextResponse.json(coupons);
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth();
    const body = await request.json();
    const code = String(body.code || '').trim().toUpperCase();
    if (!code) {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 });
    }
    const parsed = parseCouponInput(body);
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    if (await db.coupons.findUnique({ where: { code } })) {
      return NextResponse.json({ error: `Coupon code "${code}" already exists` }, { status: 409 });
    }

    const coupon = await db.coupons.create({
      data: { code, ...parsed.data, usageCount: 0, isActive: true },
    });

    return NextResponse.json(coupon, { status: 201 });
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to save coupon' }, { status: 500 });
  }
}
