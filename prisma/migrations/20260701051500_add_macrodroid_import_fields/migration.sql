ALTER TABLE "Transaction"
ADD COLUMN "source" TEXT,
ADD COLUMN "counterparty" TEXT,
ADD COLUMN "externalRef" TEXT,
ADD COLUMN "rawBody" TEXT,
ADD COLUMN "importedAt" TIMESTAMP(3);

INSERT INTO "Category" ("name", "kind", "createdAt", "updatedAt")
VALUES
  ('Uncategorized', 'EXPENSE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Uncategorized', 'INCOME', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name", "kind") DO NOTHING;
