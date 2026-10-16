import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const id = parseInt(params.id, 10);
    const body = await request.json();
    const nameEn = String(body.nameEn || '').trim();
    if (!nameEn) return NextResponse.json({ error: 'Category Name (English) is required' }, { status: 400 });
    const all = await db.categories.findMany();
    if (all.some((c: any) => c.id !== id && c.nameEn.trim().toLowerCase() === nameEn.toLowerCase())) {
      return NextResponse.json({ error: `A category named "${nameEn}" already exists.` }, { status: 409 });
    }
    const updated = await db.categories.update({
      where: { id },
      data: {
        nameEn,
        nameTa: body.nameTa?.trim() || null,
        sortOrder: Number(body.sortOrder) || 0,
        isActive: body.isActive !== false,
      },
    });
    if (!updated) return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to save category' }, { status: 500 });
  }
}

/** Deletes a category; its products are moved to "General". */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    await db.categories.delete({ where: { id: parseInt(params.id, 10) } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
