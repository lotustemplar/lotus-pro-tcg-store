-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "manapoolProductId" TEXT,
ADD COLUMN     "tcgplayerListingName" TEXT,
ADD COLUMN     "tcgplayerSku" INTEGER;

-- CreateTable
CREATE TABLE "VisitorActivity" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "productId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "priceCents" INTEGER,
    "path" TEXT,
    "meta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitorActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryEvent" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelChange" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "eventId" TEXT,
    "note" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),

    CONSTRAINT "ChannelChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncSettings" (
    "id" TEXT NOT NULL DEFAULT 'sync',
    "manapoolMode" TEXT NOT NULL DEFAULT 'approval',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncIssue" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VisitorActivity_createdAt_idx" ON "VisitorActivity"("createdAt");

-- CreateIndex
CREATE INDEX "VisitorActivity_sessionId_idx" ON "VisitorActivity"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryEvent_source_externalOrderId_productId_key" ON "InventoryEvent"("source", "externalOrderId", "productId");

-- CreateIndex
CREATE INDEX "ChannelChange_channel_status_idx" ON "ChannelChange"("channel", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SyncIssue_source_externalId_detail_key" ON "SyncIssue"("source", "externalId", "detail");

-- CreateIndex
CREATE UNIQUE INDEX "Product_tcgplayerSku_key" ON "Product"("tcgplayerSku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_manapoolProductId_key" ON "Product"("manapoolProductId");

-- AddForeignKey
ALTER TABLE "VisitorActivity" ADD CONSTRAINT "VisitorActivity_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryEvent" ADD CONSTRAINT "InventoryEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelChange" ADD CONSTRAINT "ChannelChange_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelChange" ADD CONSTRAINT "ChannelChange_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "InventoryEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- DataMigration: move unpaid Stripe checkouts out of Orders into VisitorActivity (kept, not lost).
-- Only rows the old checkout created before payment: status pending, placeholder email, no payment intent.
-- Manual admin orders (real email) are untouched.
CREATE TEMP TABLE "_legacy_pending" AS
  SELECT "id", "stripeSessionId", "createdAt", "totalCents"
  FROM "Order"
  WHERE "status" = 'pending' AND "email" = 'pending@checkout' AND "stripePaymentIntent" IS NULL;

INSERT INTO "VisitorActivity" ("id", "sessionId", "action", "productId", "quantity", "priceCents", "meta", "createdAt")
SELECT
  'legacy_' || oi."id",
  'legacy:' || o."id",
  'legacy_pending_order',
  CASE WHEN EXISTS (SELECT 1 FROM "Product" p WHERE p."id" = oi."productId") THEN oi."productId" ELSE NULL END,
  oi."quantity",
  oi."priceCents",
  json_build_object('legacyOrderId', o."id", 'stripeSessionId', o."stripeSessionId", 'nameSnapshot', oi."nameSnapshot", 'orderTotalCents', o."totalCents")::text,
  o."createdAt"
FROM "_legacy_pending" o
JOIN "OrderItem" oi ON oi."orderId" = o."id";

-- Production has a prevent_order_delete trigger (20260827221500_protect_catalog_deletes), so the old
-- rows are archived, not deleted: status becomes 'archived_checkout'. Admin Orders only lists paid/finalized orders.
UPDATE "Order" SET "status" = 'archived_checkout' WHERE "id" IN (SELECT "id" FROM "_legacy_pending");
DROP TABLE "_legacy_pending";
