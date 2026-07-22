import { NextResponse } from 'next/server';
import { Prisma, TransactionType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { malaysiaDateKey } from '@/lib/finance';

type BudgetBody = {
  period?: unknown;
  amount?: unknown;
  categoryId?: unknown;
};

function validPeriod(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return false;
  return true;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedPeriods = [...new Set(searchParams.getAll('period').filter(Boolean))];
    const periods =
      requestedPeriods.length > 0
        ? requestedPeriods
        : [malaysiaDateKey(new Date()).slice(0, 7)];

    if (periods.some((period) => !validPeriod(period))) {
      return NextResponse.json({ error: 'Invalid budget period' }, { status: 400 });
    }

    const budgets = await prisma.budget.findMany({
      where: { period: { in: periods } },
      include: { category: true },
      orderBy: [{ period: 'asc' }, { scopeKey: 'asc' }],
    });

    return NextResponse.json(budgets);
  } catch (error) {
    console.error('Failed to load budgets', error);
    return NextResponse.json({ error: 'Failed to load budgets' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BudgetBody;
    const amount = Number(body.amount);
    const categoryId =
      body.categoryId === null || body.categoryId === '' || body.categoryId === undefined
        ? null
        : Number(body.categoryId);

    if (!validPeriod(body.period)) {
      return NextResponse.json({ error: 'Invalid budget period' }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Budget must be greater than zero' }, { status: 400 });
    }
    if (categoryId !== null && (!Number.isInteger(categoryId) || categoryId < 1)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    if (categoryId !== null) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { kind: true },
      });
      if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      if (category.kind !== TransactionType.EXPENSE) {
        return NextResponse.json(
          { error: 'Budgets can only use expense categories' },
          { status: 400 }
        );
      }
    }

    const scopeKey = categoryId === null ? 'OVERALL' : `CATEGORY:${categoryId}`;
    const budget = await prisma.budget.upsert({
      where: { period_scopeKey: { period: body.period, scopeKey } },
      update: { amount: new Prisma.Decimal(amount), categoryId },
      create: {
        period: body.period,
        scopeKey,
        amount: new Prisma.Decimal(amount),
        categoryId,
      },
      include: { category: true },
    });

    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    console.error('Failed to save budget', error);
    return NextResponse.json({ error: 'Failed to save budget' }, { status: 500 });
  }
}
