import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma, TransactionType } from '@prisma/client';

type UpdateTransactionBody = {
  type?: unknown;
  amount?: unknown;
  date?: unknown;
  note?: unknown;
  categoryId?: unknown;
  source?: unknown;
  counterparty?: unknown;
  externalRef?: unknown;
};

function parseTransactionType(value: unknown) {
  if (value === TransactionType.INCOME || value === TransactionType.EXPENSE) return value;
  return null;
}

function parseDate(value: unknown) {
  if (typeof value !== 'string' || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseOptionalText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

// In Next.js app routes params is a Promise and must be awaited before use.
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    await prisma.transaction.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    const body = (await req.json()) as UpdateTransactionBody;
    const type = parseTransactionType(body.type);
    const amount = Number(body.amount);
    const date = parseDate(body.date);
    const categoryId = Number(body.categoryId);

    if (!type) return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 });
    }
    if (!date) return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    if (!Number.isInteger(categoryId) || categoryId < 1) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
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

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        type,
        amount: new Prisma.Decimal(amount),
        date,
        categoryId,
        note: parseOptionalText(body.note),
        source: parseOptionalText(body.source),
        counterparty: parseOptionalText(body.counterparty),
        externalRef: parseOptionalText(body.externalRef),
      },
      include: { category: true },
    });

    return NextResponse.json(transaction);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
  }
}
