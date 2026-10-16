import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    await requireAuth();
    return NextResponse.json(await db.expenseCategories.findMany());
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message || 'Error fetching expense categories' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth();
    const { name } = await request.json();
    const trimmed = String(name || '').trim();
    if (!trimmed) return NextResponse.json({ error: 'Category name cannot be empty' }, { status: 400 });
    const created = await db.expenseCategories.create({ data: { name: trimmed } });
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message || 'Could not save category' }, { status: 500 });
  }
}
