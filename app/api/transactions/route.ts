import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type'); // INCOME | EXPENSE | null
  const from = searchParams.get('from'); // ISO
  const to   = searchParams.get('to');   // ISO
  const categoryId = searchParams.get('categoryId'); // number or null
  const page = Math.max(1, Number(searchParams.get('page') || '1'));
  const pageSize = [10, 20, 50].includes(Number(searchParams.get('pageSize')))
    ? Number(searchParams.get('pageSize'))
    : 10;

  const where: Prisma.TransactionWhereInput = {};
  if (type === 'INCOME' || type === 'EXPENSE') where.type = type as any;
  if (from || to) {
    where.date = {};
    if (from) (where.date as any).gte = new Date(from);
    if (to) (where.date as any).lte = new Date(to);
  }
  if (categoryId) where.categoryId = Number(categoryId);

  const [items, totals, totalCount] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { category: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaction.groupBy({
      by: ['type'],
      _sum: { amount: true },
      where,
    }),
    prisma.transaction.count({ where }),
  ]);

  const sumIncome =
    totals.find(t => t.type === 'INCOME')?._sum.amount?.toNumber() ?? 0;
  const sumExpense =
    totals.find(t => t.type === 'EXPENSE')?._sum.amount?.toNumber() ?? 0;

  return NextResponse.json({
    items,
    totals: { income: sumIncome, expense: sumExpense, net: sumIncome - sumExpense },
    page,
    pageSize,
    totalCount,
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  // { type, amount, date?, note?, categoryId }
  if (!body?.type || !body?.amount || !body?.categoryId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const created = await prisma.transaction.create({
    data: {
      type: body.type,
      amount: new Prisma.Decimal(body.amount),
      date: body.date ? new Date(body.date) : new Date(),
      note: body.note ?? null,
      categoryId: Number(body.categoryId),
    },
  });
  return NextResponse.json(created, { status: 201 });
}
