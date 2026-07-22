CREATE TABLE "Budget" (
    "id" SERIAL NOT NULL,
    "period" VARCHAR(7) NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "categoryId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Budget_period_scopeKey_key" ON "Budget"("period", "scopeKey");
CREATE INDEX "Budget_period_idx" ON "Budget"("period");

ALTER TABLE "Budget"
ADD CONSTRAINT "Budget_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
