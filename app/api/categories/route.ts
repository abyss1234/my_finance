import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma, TransactionType } from '@prisma/client';

type CreateCategoryBody = {
  name?: unknown;
  kind?: unknown;
};

function parseKind(value: unknown) {
  if (value === TransactionType.INCOME || value === TransactionType.EXPENSE) return value;
  return null;
}

function parseName(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: [{ kind: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json(categories);
  } catch {
    return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateCategoryBody;
    const name = parseName(body.name);
    const kind = parseKind(body.kind);

    if (!name) return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    if (!kind) return NextResponse.json({ error: 'Invalid category type' }, { status: 400 });

    const category = await prisma.category.create({
      data: { name, kind },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Category already exists for this type' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
