import { TransactionType } from '@prisma/client';
import { prisma } from '@/lib/db';

export async function findPreviousCategoryId(
  type: TransactionType,
  counterparty: string | null | undefined
) {
  const name = counterparty?.trim();
  if (!name) return null;

  const transaction = await prisma.transaction.findFirst({
    where: {
      type,
      counterparty: { equals: name, mode: 'insensitive' },
      category: { name: { not: 'Uncategorized' } },
    },
    orderBy: { updatedAt: 'desc' },
    select: { categoryId: true },
  });

  return transaction?.categoryId ?? null;
}
