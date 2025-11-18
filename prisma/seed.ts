import { PrismaClient, TransactionType } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const expense = [
    'Food',
    'Transportation',
    'Bill & Utilities',
    'Entertainment',
    'Others',
  ];
  const income = ['Salary', 'Investment', 'Others'];

  for (const name of expense) {
    await prisma.category.upsert({
      where: { name_kind: { name, kind: TransactionType.EXPENSE } },
      update: {},
      create: { name, kind: TransactionType.EXPENSE },
    });
  }

  for (const name of income) {
    await prisma.category.upsert({
      where: { name_kind: { name, kind: TransactionType.INCOME } },
      update: {},
      create: { name, kind: TransactionType.INCOME },
    });
  }
}

main().finally(async () => prisma.$disconnect());
