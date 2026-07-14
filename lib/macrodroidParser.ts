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

  const maeFundsReceived = text.match(
    /^You['\u2019]ve just received RM\s*([\d,]+(?:\.\d{1,2})?)\s+in your account ending\s+(.+?)\.\s*REF:\s*([A-Z0-9]+)$/i
  );

  if (/^MAE$/i.test(app) && /Maybank2u:\s*Funds Received/i.test(title) && maeFundsReceived) {
    return {
      type: TransactionType.INCOME,
      amount: parseAmount(maeFundsReceived[1]),
      source: app,
      counterparty: `Account ${cleanName(maeFundsReceived[2])}`,
      externalRef: maeFundsReceived[3].trim(),
      date,
    };
  }

  const maeCardTransaction = text.match(
    /^You['\u2019]ve just spent RM\s*([\d,]+(?:\.\d{1,2})?)\s+at\s+(.+?)\s+with your Maybank Debit Card Visa ending\s+(\d+)\.\s*View your receipt now\.$/i
  );

  if (/^MAE$/i.test(app) && /Maybank2u:\s*Card Transaction/i.test(title) && maeCardTransaction) {
    return {
      type: TransactionType.EXPENSE,
      amount: parseAmount(maeCardTransaction[1]),
      source: app,
      counterparty: cleanName(maeCardTransaction[2]),
      externalRef: `Card ending ${maeCardTransaction[3].trim()}`,
      date,
    };
  }

  const maeM2uPaid = text.match(
    /^M2U:\s*You have successfully paid RM\s*([\d,]+(?:\.\d{1,2})?)\s+to\s+(.+?)\s+on\s+(.+?)\.Call\s+.+$/i
  );

  if (/^MAE$/i.test(app) && /Maybank2u:\s*Scan\s*&\s*Pay/i.test(title) && maeM2uPaid) {
    return {
      type: TransactionType.EXPENSE,
      amount: parseAmount(maeM2uPaid[1]),
      source: app,
      counterparty: cleanName(maeM2uPaid[2]),
      externalRef: cleanName(maeM2uPaid[3]),
      date,
    };
  }

  const cimbDebitCard = text.match(
    /^CIMB:\s*RM\s*([\d,]+(?:\.\d{1,2})?)\s+was charged to your Debit Card on\s+(.+?)\s+at\s+(.+?)\.\s*Pls call.+$/i
  );

  if (/^CIMB OCTO MY$/i.test(app) && cimbDebitCard) {
    return {
      type: TransactionType.EXPENSE,
      amount: parseAmount(cimbDebitCard[1]),
      source: app,
      counterparty: cleanName(cimbDebitCard[3]),
      externalRef: cleanName(cimbDebitCard[2]),
      date,
    };
  }

  const tngIncoming = text.match(
    /^RM\s*([\d,]+(?:\.\d{1,2})?)\s+received from\s+(.+?)\s+for\s+(.+?)\.$/i
  );

  if (/^TNG eWallet$/i.test(app) && /Incoming Money/i.test(title) && tngIncoming) {
    return {
      type: TransactionType.INCOME,
      amount: parseAmount(tngIncoming[1]),
      source: app,
      counterparty: cleanName(tngIncoming[2]),
      externalRef: cleanName(tngIncoming[3]),
      date,
    };
  }

  const tngWalletReload = text.match(
    /^Your money is in!\s*RM\s*([\d,]+(?:\.\d{1,2})?)\s+has been reloaded to your Touch 'n Go eWallet balance\.\s*Reference No\.\s*(.+)$/i
  );

  if (/^TNG eWallet$/i.test(app) && /Reload Successful/i.test(title) && tngWalletReload) {
    return {
      type: TransactionType.INCOME,
      amount: parseAmount(tngWalletReload[1]),
      source: app,
      counterparty: "Touch 'n Go eWallet Reload",
      externalRef: cleanName(tngWalletReload[2]),
      date,
    };
  }

  const tngCardReload = text.match(
    /^.+?successfully reloaded RM\s*([\d,]+(?:\.\d{1,2})?)\s+into Touch 'n Go Card\.\s*View more details now!$/i
  );

  if (/^TNG eWallet$/i.test(app) && /Reload successful/i.test(title) && tngCardReload) {
    return {
      type: TransactionType.EXPENSE,
      amount: parseAmount(tngCardReload[1]),
      source: app,
      counterparty: "Touch 'n Go Card Reload",
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

  const tngDuitNowPayment = text.match(
    /^You have paid RM\s*([\d,]+(?:\.\d{1,2})?)\s+to\s+(.+?)\.$/i
  );

  if (/^TNG eWallet$/i.test(app) && /DuitNow Payment/i.test(title) && tngDuitNowPayment) {
    return {
      type: TransactionType.EXPENSE,
      amount: parseAmount(tngDuitNowPayment[1]),
      source: app,
      counterparty: cleanName(tngDuitNowPayment[2]),
      date,
    };
  }

  const tngPayment = text.match(
    /^You have paid RM\s*([\d,]+(?:\.\d{1,2})?)\s+for\s+(.+?)\.$/i
  );

  if (/^TNG eWallet$/i.test(app) && /^Payment$/i.test(title) && tngPayment) {
    return {
      type: TransactionType.EXPENSE,
      amount: parseAmount(tngPayment[1]),
      source: app,
      counterparty: cleanName(tngPayment[2]),
      date,
    };
  }

  const tngTollPayment = text.match(
    /^RM\s*([\d,]+(?:\.\d{1,2})?)\s+was deducted from your eWallet via\s+(.+?)\s+for toll payment on\s+(.+)$/i
  );

  if (/^TNG eWallet$/i.test(app) && /Successful Toll Payment/i.test(title) && tngTollPayment) {
    return {
      type: TransactionType.EXPENSE,
      amount: parseAmount(tngTollPayment[1]),
      source: app,
      counterparty: `Toll - ${cleanName(tngTollPayment[2])}`,
      externalRef: cleanName(tngTollPayment[3]),
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
