import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const rows = await prisma.transaction.findMany({
      where: { counterparty: { not: null } },
      distinct: ['counterparty'],
      select: { counterparty: true },
    });

    const names = new Map<string, string>();
    for (const row of rows) {
      const name = row.counterparty?.trim();
      if (name) names.set(name.toLocaleLowerCase('en-MY'), name);
    }

    return NextResponse.json(
      [...names.values()].sort((first, second) =>
        first.localeCompare(second, 'en-MY', { sensitivity: 'base' })
      )
    );
  } catch {
    return NextResponse.json({ error: 'Failed to load people and shops' }, { status: 500 });
  }
}
