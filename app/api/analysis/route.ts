import { NextResponse } from 'next/server';
import { Prisma, TransactionType } from '@prisma/client';
import {
  buildAnalysisResponse,
  resolveAnalysisGrouping,
  type AnalysisTransaction,
} from '@/lib/analysis';
import type { AnalysisGrouping } from '@/lib/analysisTypes';
import { prisma } from '@/lib/db';
import { resolveAnalysisPeriods } from '@/lib/analysisPeriods';

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseType(value: string | null) {
  if (value === TransactionType.INCOME || value === TransactionType.EXPENSE) return value;
  return null;
}

function parseGrouping(value: string | null): AnalysisGrouping | null {
  const normalized = value?.toUpperCase();
  if (normalized === 'DAY' || normalized === 'WEEK' || normalized === 'MONTH') {
    return normalized;
  }
  return null;
}

function transactionWhere(
  type: TransactionType | null,
  categoryIds: number[],
  from: Date | null,
  to: Date | null
) {
  const where: Prisma.TransactionWhereInput = {};
  if (type) where.type = type;
  if (categoryIds.length > 0) where.categoryId = { in: categoryIds };
  if (from || to) {
    where.date = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }
  return where;
}

const transactionSelect = {
  id: true,
  amount: true,
  date: true,
  type: true,
  categoryId: true,
  counterparty: true,
  category: {
    select: { id: true, name: true, kind: true },
  },
} satisfies Prisma.TransactionSelect;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = parseType(searchParams.get('type'));
    const from = parseDate(searchParams.get('from'));
    const to = parseDate(searchParams.get('to'));
    const compare = searchParams.get('compare') === 'true';
    const preset = searchParams.get('preset');
    const requestedGrouping = parseGrouping(searchParams.get('grouping'));
    const rawCategoryIds = searchParams.getAll('categoryId').filter(Boolean);
    const categoryIds = [...new Set(rawCategoryIds.map(Number))];

    if (from === undefined || to === undefined || (from && to && from > to)) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }
    if (categoryIds.some((categoryId) => !Number.isInteger(categoryId) || categoryId < 1)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const { current, previous, mode } = resolveAnalysisPeriods(from, to, preset, compare);
    const grouping = resolveAnalysisGrouping(current.from, current.to, requestedGrouping);
    const currentWhere = transactionWhere(type, categoryIds, current.from, current.to);
    const previousWhere = transactionWhere(type, categoryIds, previous.from, previous.to);

    const [items, previousItems] = await Promise.all([
      prisma.transaction.findMany({
        where: currentWhere,
        orderBy: [{ date: 'asc' }, { id: 'asc' }],
        select: transactionSelect,
      }),
      compare && previous.from && previous.to
        ? prisma.transaction.findMany({
            where: previousWhere,
            orderBy: [{ date: 'asc' }, { id: 'asc' }],
            select: transactionSelect,
          })
        : Promise.resolve([]),
    ]);

    return NextResponse.json(
      buildAnalysisResponse(
        items as AnalysisTransaction[],
        previousItems as AnalysisTransaction[],
        {
          from: current.from,
          to: current.to,
          previousFrom: previous.from,
          previousTo: previous.to,
          grouping,
          compare,
          periodMode: mode,
          merchantType: type ?? TransactionType.EXPENSE,
        }
      )
    );
  } catch (error) {
    console.error('Failed to load analysis', error);
    return NextResponse.json({ error: 'Failed to load analysis' }, { status: 500 });
  }
}
