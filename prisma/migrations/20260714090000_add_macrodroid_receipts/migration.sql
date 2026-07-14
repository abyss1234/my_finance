CREATE TABLE "MacroDroidReceipt" (
    "id" SERIAL NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "app" TEXT,
    "title" TEXT,
    "text" TEXT NOT NULL,
    "phoneTime" TEXT,

    CONSTRAINT "MacroDroidReceipt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MacroDroidReceipt_receivedAt_idx" ON "MacroDroidReceipt"("receivedAt");
