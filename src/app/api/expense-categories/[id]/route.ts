import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const { name } = await request.json();
    const trimmed = String(name || '').trim();
    if (!trimmed) return NextResponse.json({ error: 'Category name cannot be empty' }, { status: 400 });
    const updated = await db.expenseCategories.update({ where: { id: parseInt(params.id, 10) }, data: { name: trimmed } });
    if (!updated) return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message || 'Could not save category' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    await db.expenseCategories.delete({ where: { id: parseInt(params.id, 10) } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message || 'Could not delete category' }, { status: 500 });
  }
}
