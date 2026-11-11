-- Absolute quantity sets from POST /api/admin/inventory/quantity.
-- Additive only: new table, no changes to existing tables.
CREATE TABLE "QuantitySetIdempotency" (
    "key" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "beforeQty" INTEGER NOT NULL,
    "afterQty" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuantitySetIdempotency_pkey" PRIMARY KEY ("key")
);
