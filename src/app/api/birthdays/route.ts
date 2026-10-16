import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // '1' to '12' or null

    const all = await db.customerBirthdays.findMany();

    let filtered = all;
    if (month && month !== 'all') {
      const targetMonth = parseInt(month, 10) - 1; // 0-indexed in JS
      filtered = all.filter((b: any) => {
        const d = new Date(b.birthDate);
        return d.getMonth() === targetMonth;
      });
    }

    return NextResponse.json(filtered);
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message || 'Error fetching birthdays' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth();
    const body = await request.json();
    const { name, phone, birthDate } = body;

    if (!name || !phone || !birthDate) {
      return NextResponse.json({ error: 'Name, phone, and birth date are required' }, { status: 400 });
    }

    const created = await db.customerBirthdays.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        birthDate: new Date(birthDate).toISOString(),
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message || 'Error creating birthday record' }, { status: 500 });
  }
}
