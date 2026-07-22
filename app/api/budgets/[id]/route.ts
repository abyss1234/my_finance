import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: 'Invalid budget id' }, { status: 400 });
  }

  try {
    await prisma.budget.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete budget' }, { status: 500 });
  }
}
