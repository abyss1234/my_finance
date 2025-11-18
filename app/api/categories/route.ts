import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const categories = await prisma.category.findMany({ orderBy: [{ kind: 'asc' }, { name: 'asc' }] });
  return NextResponse.json(categories);
}
