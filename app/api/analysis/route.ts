import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma, TransactionType } from "@prisma/client";

function toDayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type DayAgg = { date: string; income: number; expense: number; net: number };
type CategoryAgg = { categoryId: number; name: string; kind: TransactionType; amount: number };

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // INCOME | EXPENSE | null
    const from = parseDate(searchParams.get("from"));
    const to = parseDate(searchParams.get("to"));
    const rawCategoryId = searchParams.get("categoryId");
    let categoryId: number | undefined;

    const where: Prisma.TransactionWhereInput = {};

    if (type === TransactionType.INCOME || type === TransactionType.EXPENSE) {
      where.type = type;
    }

    if (from === undefined || to === undefined) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }

    if (from || to) {
      const date: Prisma.DateTimeFilter = {};
      if (from) date.gte = from;
      if (to) date.lte = to;
      where.date = date;
    }

    if (rawCategoryId) {
      const parsedCategoryId = Number(rawCategoryId);
      if (!Number.isInteger(parsedCategoryId) || parsedCategoryId < 1) {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 });
      }
      categoryId = parsedCategoryId;
    }

    if (categoryId !== undefined) {
      where.categoryId = categoryId;
    }

    const items = await prisma.transaction.findMany({
      where,
      orderBy: { date: "asc" },
      select: {
        id: true,
        amount: true,
        date: true,
        type: true,
        categoryId: true,
        category: {
          select: { id: true, name: true, kind: true },
        },
      },
    });

    const byCategoryMap = new Map<number, CategoryAgg>();
    const byDayMap = new Map<string, DayAgg>();

    let totalIncome = 0;
    let totalExpense = 0;

    for (const tx of items) {
      // Prisma Decimal -> number
      const amt =
        tx.amount instanceof Prisma.Decimal ? tx.amount.toNumber() : Number(tx.amount);

      const cid = tx.category?.id ?? tx.categoryId;

      if (!byCategoryMap.has(cid)) {
        byCategoryMap.set(cid, {
          categoryId: cid,
          name: tx.category?.name ?? "Uncategorized",
          kind: tx.category?.kind ?? TransactionType.EXPENSE,
          amount: 0,
        });
      }
      byCategoryMap.get(cid)!.amount += amt;

      const dayKey = toDayKey(new Date(tx.date));
      if (!byDayMap.has(dayKey)) {
        byDayMap.set(dayKey, { date: dayKey, income: 0, expense: 0, net: 0 });
      }

      const dayEntry = byDayMap.get(dayKey)!;
      if (tx.type === "INCOME") {
        dayEntry.income += amt;
        totalIncome += amt;
      } else {
        dayEntry.expense += amt;
        totalExpense += amt;
      }
      dayEntry.net = dayEntry.income - dayEntry.expense;
    }

    const byCategory = Array.from(byCategoryMap.values()).sort((a, b) => b.amount - a.amount);
    const byDay = Array.from(byDayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      byCategory,
      byDay,
      totals: { income: totalIncome, expense: totalExpense, net: totalIncome - totalExpense },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load analysis" },
      { status: 500 }
    );
  }
}
