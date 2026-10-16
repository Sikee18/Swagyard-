import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const paymentMode = searchParams.get('paymentMode');

    const all = await db.expenses.findMany();

    let filtered = all;
    if (category && category !== 'all') {
      filtered = filtered.filter((e: any) => e.categoryName?.toLowerCase() === category.toLowerCase());
    }
    if (paymentMode && paymentMode !== 'all') {
      filtered = filtered.filter((e: any) => e.paymentMode?.toLowerCase() === paymentMode.toLowerCase());
    }

    const totalExpensePaise = filtered.reduce((acc: number, e: any) => acc + (e.amountInPaise || 0), 0);

    return NextResponse.json({
      expenses: filtered,
      totalExpensePaise,
    });
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message || 'Error fetching expenses' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { categoryId, categoryName, amountInPaise, paymentMode = 'cash', description, expenseDate } = body;

    if (!categoryName || !amountInPaise) {
      return NextResponse.json({ error: 'Category and amount are required' }, { status: 400 });
    }

    const created = await db.expenses.create({
      data: {
        categoryId: categoryId ?? null,
        categoryName: categoryName.trim(),
        amountInPaise: Number(amountInPaise),
        paymentMode,
        description: description || null,
        recordedByName: user.name || 'Admin',
        expenseDate: expenseDate ? new Date(expenseDate).toISOString() : new Date().toISOString(),
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message || 'Error recording expense' }, { status: 500 });
  }
}
