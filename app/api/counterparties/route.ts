import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { CounterpartyOption } from '@/lib/transactionTypes';

export async function GET() {
  try {
    const rows = await prisma.transaction.findMany({
      where: { counterparty: { not: null } },
      orderBy: { updatedAt: 'desc' },
      select: {
        counterparty: true,
        type: true,
        categoryId: true,
        category: { select: { name: true } },
      },
    });

    const options = new Map<string, CounterpartyOption>();
    for (const row of rows) {
      const name = row.counterparty?.trim();
      if (!name) continue;

      const key = name.toLocaleLowerCase('en-MY');
      const option = options.get(key) ?? {
        name,
        categoryIds: { INCOME: null, EXPENSE: null },
      };

      if (
        option.categoryIds[row.type] === null &&
        row.category.name.toLocaleLowerCase('en-MY') !== 'uncategorized'
      ) {
        option.categoryIds[row.type] = row.categoryId;
      }

      options.set(key, option);
    }

    return NextResponse.json(
      [...options.values()].sort((first, second) =>
        first.name.localeCompare(second.name, 'en-MY', { sensitivity: 'base' })
      )
    );
  } catch {
    return NextResponse.json({ error: 'Failed to load people and shops' }, { status: 500 });
  }
}
