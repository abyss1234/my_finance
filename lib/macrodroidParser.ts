import { TransactionType } from '@prisma/client';

export type ParsedMacroDroidNotification = {
  type: TransactionType;
  amount: number;
  source: string;
  counterparty: string;
  externalRef?: string;
  date?: Date;
};

type StructuredMacroDroidBody = {
  app?: unknown;
  title?: unknown;
  text?: unknown;
  time?: unknown;
};

function parseAmount(value: string) {
  return Number(value.replace(/,/g, ''));
}

function cleanName(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function parseTimestamp(value: unknown) {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;

  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) return undefined;

  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function isStructuredBody(value: unknown): value is StructuredMacroDroidBody {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function parseStructuredNotification(
  parsedBody: unknown
): ParsedMacroDroidNotification | null {
  if (!isStructuredBody(parsedBody)) return null;

  const app = typeof parsedBody.app === 'string' ? cleanName(parsedBody.app) : '';
  const title = typeof parsedBody.title === 'string' ? cleanName(parsedBody.title) : '';
  const text = typeof parsedBody.text === 'string' ? cleanName(parsedBody.text) : '';
  const date = parseTimestamp(parsedBody.time);

  if (!app || !text) return null;

  const maeScanPay = text.match(
    /^Successful payment of RM\s*([\d,]+(?:\.\d{1,2})?)\s+to\s+(.+?)\.\s*REF:\s*([A-Z0-9]+)\.$/i
  );

  if (/^MAE$/i.test(app) && /Maybank2u:\s*Scan\s*&\s*Pay/i.test(title) && maeScanPay) {
    return {
      type: TransactionType.EXPENSE,
      amount: parseAmount(maeScanPay[1]),
      source: app,
      counterparty: cleanName(maeScanPay[2]),
      externalRef: maeScanPay[3].trim(),
      date,
    };
  }

  const tngSent = text.match(
    /^RM\s*([\d,]+(?:\.\d{1,2})?)\s+has been successfully transferred to\s+(.+?)\.$/i
  );

  if (/^TNG eWallet$/i.test(app) && /Transfer Successful/i.test(title) && tngSent) {
    return {
      type: TransactionType.EXPENSE,
      amount: parseAmount(tngSent[1]),
      source: app,
      counterparty: cleanName(tngSent[2]),
      date,
    };
  }

  return null;
}

function parseRawNotification(rawBody: string): ParsedMacroDroidNotification | null {
  const text = rawBody.trim();

  const maybankScanPay = text.match(
    /^Maybank2u:\s*.*?Successful payment of RM\s*([\d,]+(?:\.\d{1,2})?)\s+to\s+(.+?)\.\s*REF:\s*([A-Z0-9]+)\.(.+)$/i
  );

  if (maybankScanPay) {
    return {
      type: TransactionType.EXPENSE,
      amount: parseAmount(maybankScanPay[1]),
      counterparty: cleanName(maybankScanPay[2]),
      externalRef: maybankScanPay[3].trim(),
      source: `Maybank2u/${cleanName(maybankScanPay[4])}`,
    };
  }

  const tngSent = text.match(
    /^(?:TNG eWallet)?Transfer Successful\.RM\s*([\d,]+(?:\.\d{1,2})?)\s+has been successfully transferred to\s+(.+?)\.(?:(\d{8,})Transfer Successful\.|(TNG eWallet))$/i
  );

  if (tngSent) {
    return {
      type: TransactionType.EXPENSE,
      amount: parseAmount(tngSent[1]),
      counterparty: cleanName(tngSent[2]),
      externalRef: tngSent[3]?.trim(),
      source: cleanName(tngSent[4] ?? 'TNG eWallet'),
    };
  }

  const tngReceived = text.match(
    /^You['\u2019]ve received money!(.+?)\s+has transferred RM\s*([\d,]+(?:\.\d{1,2})?)\s+to you\..*?\.(TNG eWallet)$/i
  );

  if (tngReceived) {
    return {
      type: TransactionType.INCOME,
      amount: parseAmount(tngReceived[2]),
      counterparty: cleanName(tngReceived[1]),
      source: cleanName(tngReceived[3]),
    };
  }

  return null;
}

export function parseMacroDroidNotification(
  rawBody: string,
  parsedBody?: unknown
): ParsedMacroDroidNotification | null {
  return parseStructuredNotification(parsedBody) ?? parseRawNotification(rawBody);
}
