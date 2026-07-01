import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { parseMacroDroidNotification } from '@/lib/macrodroidParser';

export const runtime = 'nodejs';

type CapturedRequest = {
  id: number;
  receivedAt: string;
  method: string;
  url: string;
  contentType: string | null;
  headers: Record<string, string>;
  query: Record<string, string>;
  rawBody: string;
  parsedBody: unknown;
  parseMode: 'json' | 'form' | 'text' | 'empty';
  savedTransactionId?: number;
};

const debugFile = path.join(process.cwd(), '.macrodroid-requests.json');

function headersToObject(headers: Headers) {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

function searchParamsToObject(searchParams: URLSearchParams) {
  const result: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

function parseBody(rawBody: string, contentType: string | null) {
  if (!rawBody) {
    return { parsedBody: null, parseMode: 'empty' as const };
  }

  try {
    return { parsedBody: JSON.parse(rawBody), parseMode: 'json' as const };
  } catch {
    // MacroDroid may send JSON, form data, or plain text depending on the action setup.
  }

  if (contentType?.includes('application/x-www-form-urlencoded')) {
    return {
      parsedBody: searchParamsToObject(new URLSearchParams(rawBody)),
      parseMode: 'form' as const,
    };
  }

  return { parsedBody: rawBody, parseMode: 'text' as const };
}

async function readRequests() {
  try {
    const file = await readFile(debugFile, 'utf8');
    const requests = JSON.parse(file) as CapturedRequest[];
    return Array.isArray(requests) ? requests : [];
  } catch {
    return [];
  }
}

async function writeRequests(requests: CapturedRequest[]) {
  await writeFile(debugFile, JSON.stringify(requests, null, 2), 'utf8');
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

export async function GET() {
  const requests = await readRequests();

  return NextResponse.json({
    ok: true,
    message: 'MacroDroid debug receiver is ready. Send POST requests here and refresh this URL to view them.',
    receivedCount: requests.length,
    latest: requests[0] ?? null,
    requests,
  });
}

export async function POST(req: Request) {
  const requests = await readRequests();
  const url = new URL(req.url);
  const contentType = req.headers.get('content-type');
  const rawBody = await req.text();
  const { parsedBody, parseMode } = parseBody(rawBody, contentType);
  const parsedNotification = parseMacroDroidNotification(rawBody, parsedBody);
  let savedTransaction = null;

  if (parsedNotification) {
    const categoryId = await getUncategorizedCategoryId(parsedNotification.type);

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

  const captured: CapturedRequest = {
    id: (requests[0]?.id ?? 0) + 1,
    receivedAt: new Date().toISOString(),
    method: req.method,
    url: req.url,
    contentType,
    headers: headersToObject(req.headers),
    query: searchParamsToObject(url.searchParams),
    rawBody,
    parsedBody,
    parseMode,
    savedTransactionId: savedTransaction?.id,
  };

  requests.unshift(captured);
  requests.splice(10);
  await writeRequests(requests);

  console.log('Captured MacroDroid request:', captured);

  return NextResponse.json({
    ok: true,
    message: savedTransaction
      ? 'MacroDroid request captured and transaction saved'
      : 'MacroDroid request captured but no known transaction format matched',
    parsedNotification,
    savedTransaction,
    captured,
  });
}
