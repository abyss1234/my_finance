import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const receipts = await prisma.macroDroidReceipt.findMany({
      orderBy: { receivedAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(receipts);
  } catch {
    return NextResponse.json({ error: 'Failed to load phone receipts' }, { status: 500 });
  }
}
