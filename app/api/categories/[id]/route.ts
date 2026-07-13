import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

type UpdateCategoryBody = {
  name?: unknown;
};

function parseName(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: 'Invalid category id' }, { status: 400 });
  }

  try {
    const body = (await req.json()) as UpdateCategoryBody;
    const name = parseName(body.name);

    if (!name) return NextResponse.json({ error: 'Category name is required' }, { status: 400 });

    const category = await prisma.category.update({
      where: { id },
      data: { name },
    });

    return NextResponse.json(category);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }

      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Category already exists for this type' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: 'Invalid category id' }, { status: 400 });
  }

  try {
    const usedCount = await prisma.transaction.count({
      where: { categoryId: id },
    });

    if (usedCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category because transactions are using it' },
        { status: 409 }
      );
    }

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
