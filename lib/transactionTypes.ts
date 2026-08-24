export type TransactionKind = 'INCOME' | 'EXPENSE';

export type CategoryOption = {
  id: number;
  name: string;
  kind: TransactionKind;
};

export type CounterpartyOption = {
  name: string;
  categoryIds: Record<TransactionKind, number | null>;
};

export type TransactionRow = {
  id: number;
  type: TransactionKind;
  amount: string;
  date: string;
  note?: string | null;
  source?: string | null;
  counterparty?: string | null;
  externalRef?: string | null;
  rawBody?: string | null;
  category: CategoryOption;
};

export type TransactionEditForm = {
  id: number;
  type: TransactionKind;
  amount: string;
  date: string;
  categoryId: string;
  note: string;
  source: string;
  counterparty: string;
  externalRef: string;
  rawBody: string;
};

export function transactionToEditForm(transaction: TransactionRow): TransactionEditForm {
  return {
    id: transaction.id,
    type: transaction.type,
    amount: String(transaction.amount),
    date: transaction.date,
    categoryId: String(transaction.category.id),
    note: transaction.note ?? '',
    source: transaction.source ?? '',
    counterparty: transaction.counterparty ?? '',
    externalRef: transaction.externalRef ?? '',
    rawBody: transaction.rawBody ?? '',
  };
}
