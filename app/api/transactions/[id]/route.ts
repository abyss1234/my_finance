import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// In Next.js app routes params is a Promise and must be awaited before use.
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  await prisma.transaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
