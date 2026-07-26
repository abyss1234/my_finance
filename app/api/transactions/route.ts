import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma, TransactionType } from '@prisma/client';

type CreateTransactionBody = {
  type?: unknown;
  amount?: unknown;
  date?: unknown;
  note?: unknown;
  categoryId?: unknown;
  source?: unknown;
  counterparty?: unknown;
};

function parseTransactionType(value: string | null) {
  if (value === TransactionType.INCOME || value === TransactionType.EXPENSE) return value;
  return null;
}

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseOptionalText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = parseTransactionType(searchParams.get('type'));
    const from = parseDate(searchParams.get('from'));
    const to = parseDate(searchParams.get('to'));
    const counterparty = searchParams.get('counterparty')?.trim() ?? '';
    const rawCategoryIds = searchParams.getAll('categoryId').filter(Boolean);
    const requestedPage = Number(searchParams.get('page') || '1');
    const requestedPageSize = Number(searchParams.get('pageSize') || '10');
    const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
    const pageSize = [10, 15, 20, 50].includes(requestedPageSize) ? requestedPageSize : 10;

    if (from === undefined || to === undefined) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }

    const categoryIds = rawCategoryIds.map(Number);
    if (categoryIds.some((categoryId) => !Number.isInteger(categoryId) || categoryId < 1)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const where: Prisma.TransactionWhereInput = {};
    if (type) where.type = type;
    if (from || to) {
      const date: Prisma.DateTimeFilter = {};
      if (from) date.gte = from;
      if (to) date.lte = to;
      where.date = date;
    }
    if (categoryIds.length > 0) where.categoryId = { in: [...new Set(categoryIds)] };
    if (counterparty === '__UNKNOWN__') {
      where.OR = [{ counterparty: null }, { counterparty: '' }];
    } else if (counterparty) {
      where.counterparty = { equals: counterparty, mode: 'insensitive' };
    }

    const [items, totals, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
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
      totals.find((total) => total.type === TransactionType.INCOME)?._sum.amount?.toNumber() ?? 0;
    const sumExpense =
      totals.find((total) => total.type === TransactionType.EXPENSE)?._sum.amount?.toNumber() ?? 0;

    return NextResponse.json({
      items,
      totals: { income: sumIncome, expense: sumExpense, net: sumIncome - sumExpense },
      page,
      pageSize,
      totalCount,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to load transactions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateTransactionBody;
    const type = parseTransactionType(typeof body.type === 'string' ? body.type : null);
    const amount = Number(body.amount);
    const categoryId = Number(body.categoryId);
    let date: Date | undefined = new Date();
    const note = parseOptionalText(body.note);

    if (typeof body.date === 'string' && body.date) {
      date = parseDate(body.date) ?? undefined;
    }

    if (!type) return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 });
    }
    if (!Number.isInteger(categoryId) || categoryId < 1) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }
    if (date === undefined) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { kind: true },
    });

    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    if (category.kind !== type) {
      return NextResponse.json(
        { error: 'Category type does not match transaction type' },
        { status: 400 }
      );
    }

    const created = await prisma.transaction.create({
      data: {
        type,
        amount: new Prisma.Decimal(amount),
        date,
        note,
        categoryId,
        source: parseOptionalText(body.source),
        counterparty: parseOptionalText(body.counterparty),
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to save transaction' }, { status: 500 });
  }
}
