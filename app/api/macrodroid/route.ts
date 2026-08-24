import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { parseMacroDroidNotification } from '@/lib/macrodroidParser';
import { findPreviousCategoryId } from '@/lib/autoCategory';

export const runtime = 'nodejs';

function searchParamsToObject(searchParams: URLSearchParams) {
  const result: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

function parseBody(rawBody: string, contentType: string | null) {
  if (!rawBody) {
    return null;
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    // MacroDroid may send form data or plain text depending on the action setup.
  }

  if (contentType?.includes('application/x-www-form-urlencoded')) {
    return searchParamsToObject(new URLSearchParams(rawBody));
  }

  return rawBody;
}

function optionalString(value: unknown) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number') return String(value);
  return null;
}

function getReceiptData(rawBody: string, parsedBody: unknown) {
  if (parsedBody && typeof parsedBody === 'object' && !Array.isArray(parsedBody)) {
    const body = parsedBody as Record<string, unknown>;

    return {
      app: optionalString(body.app),
      title: optionalString(body.title),
      text: optionalString(body.text) ?? rawBody,
      phoneTime: optionalString(body.time),
    };
  }

  return {
    app: null,
    title: null,
    text: typeof parsedBody === 'string' ? parsedBody : rawBody,
    phoneTime: null,
  };
}

async function getUncategorizedCategoryId(type: 'INCOME' | 'EXPENSE') {
  const category = await prisma.category.upsert({
    where: { name_kind: { name: 'Uncategorized', kind: type } },
    update: {},
    create: { name: 'Uncategorized', kind: type },
    select: { id: true },
  });

  return category.id;
}

export async function POST(req: Request) {
  const contentType = req.headers.get('content-type');
  const rawBody = await req.text();
  const parsedBody = parseBody(rawBody, contentType);

  const receipt = await prisma.macroDroidReceipt.create({
    data: getReceiptData(rawBody, parsedBody),
  });

  const parsedNotification = parseMacroDroidNotification(rawBody, parsedBody);
  let savedTransaction = null;

  if (parsedNotification) {
    const categoryId =
      (await findPreviousCategoryId(
        parsedNotification.type,
        parsedNotification.counterparty
      )) ?? (await getUncategorizedCategoryId(parsedNotification.type));

    savedTransaction = await prisma.transaction.create({
      data: {
        type: parsedNotification.type,
        amount: new Prisma.Decimal(parsedNotification.amount),
        categoryId,
        source: parsedNotification.source,
        counterparty: parsedNotification.counterparty,
        externalRef: parsedNotification.externalRef ?? null,
        date: parsedNotification.date,
        rawBody,
        importedAt: new Date(),
      },
      include: { category: true },
    });
  }

  console.log('MacroDroid request received:', {
    receiptId: receipt.id,
    receivedAt: receipt.receivedAt,
    app: receipt.app,
    title: receipt.title,
  });

  return NextResponse.json({
    received: true,
    receipt,
    message: savedTransaction
      ? 'MacroDroid request received and transaction saved'
      : 'MacroDroid request received but no known transaction format matched',
    parsedNotification,
    savedTransaction,
  });
}
