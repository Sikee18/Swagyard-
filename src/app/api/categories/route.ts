import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const categories = await db.categories.findMany();
    return NextResponse.json(categories);
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth();
    const body = await request.json();
    const nameEn = String(body.nameEn || '').trim();
    if (!nameEn) {
      return NextResponse.json({ error: 'Category Name (English) is required' }, { status: 400 });
    }
    const all = await db.categories.findMany();
    if (all.some((c: any) => c.nameEn.trim().toLowerCase() === nameEn.toLowerCase())) {
      return NextResponse.json({ error: `A category named "${nameEn}" already exists.` }, { status: 409 });
    }
    const cat = await db.categories.create({
      data: {
        nameEn,
        nameTa: body.nameTa?.trim() || null,
        isActive: body.isActive !== false,
        sortOrder: Number(body.sortOrder) || 0,
      },
    });
    return NextResponse.json(cat);
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
