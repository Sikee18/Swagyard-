import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const body = await request.json();
    const { categoryId, categoryName, amountInPaise, description, expenseDate } = body;

    const data: Record<string, unknown> = {};
    if (categoryId !== undefined) data.categoryId = categoryId;
    if (categoryName !== undefined) data.categoryName = String(categoryName).trim();
    if (amountInPaise !== undefined) {
      if (!Number.isInteger(amountInPaise) || amountInPaise <= 0) {
        return NextResponse.json({ error: 'Please enter a valid positive amount.' }, { status: 400 });
      }
      data.amountInPaise = amountInPaise;
    }
    if (description !== undefined) data.description = description || null;
    if (expenseDate !== undefined) data.expenseDate = new Date(expenseDate).toISOString();

    const updated = await db.expenses.update({ where: { id: params.id }, data });
    if (!updated) return NextResponse.json({ error: 'Expense record not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message || 'Error updating expense' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const { id } = params;
    await db.expenses.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message || 'Error deleting expense' }, { status: 500 });
  }
}
