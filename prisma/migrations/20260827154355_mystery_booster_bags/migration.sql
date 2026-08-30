-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isTopLevel" BOOLEAN NOT NULL DEFAULT false,
    "navStyle" TEXT NOT NULL DEFAULT 'default',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "priceCents" INTEGER NOT NULL,
    "sourceMarketplace" TEXT,
    "sourceUrl" TEXT,
    "sourceProductId" INTEGER,
    "sourceProductLine" TEXT,
    "sourceSetName" TEXT,
    "sourceProductType" TEXT,
    "sourcePriceCents" INTEGER,
    "sourceImageUrl" TEXT,
    "autoUpdatePrice" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "compareAtCents" INTEGER,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT NOT NULL,
    "featuredOnHome" BOOLEAN NOT NULL DEFAULT false,
    "featuredOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoKeywords" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestockNotify" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestockNotify_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "stripeSessionId" TEXT,
    "stripePaymentIntent" TEXT,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "subtotalCents" INTEGER NOT NULL,
    "shippingCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "shippingAddress" TEXT,
    "confirmationEmailSentAt" TIMESTAMP(3),
    "confirmationEmailError" TEXT,
    "saleNotificationSentAt" TIMESTAMP(3),
    "saleNotificationError" TEXT,
    "trackingCarrier" TEXT,
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "shippedAt" TIMESTAMP(3),
    "trackingEmailSentAt" TIMESTAMP(3),
    "trackingEmailError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'site',
    "brandName" TEXT NOT NULL DEFAULT 'Lotus Pro TCG',
    "logoWideUrl" TEXT NOT NULL DEFAULT '/logo/logo-wide.svg',
    "logoSquareUrl" TEXT NOT NULL DEFAULT '/logo/logo-square.svg',
    "heroBannerUrl" TEXT,
    "heroSlidesJson" TEXT NOT NULL DEFAULT '[]',
    "heroEyebrow" TEXT NOT NULL DEFAULT 'Expert-Built - Limited Runs - Every Major TCG',
    "heroTitle" TEXT NOT NULL DEFAULT 'Your Store for MTG, Pokemon, One Piece, Riftbound & Weiss Schwarz',
    "heroDescription" TEXT NOT NULL DEFAULT 'Sealed cases, booster boxes, booster packs, pro-built Commander decks, and more - shipped fast with a flat $5.99 rate, free over $75.',
    "heroPrimaryLabel" TEXT NOT NULL DEFAULT 'Shop Magic',
    "heroPrimaryHref" TEXT NOT NULL DEFAULT '/category/magic-the-gathering',
    "heroSecondaryLabel" TEXT NOT NULL DEFAULT 'View Featured',
    "heroSecondaryHref" TEXT NOT NULL DEFAULT '/#featured-right-now',
    "categoryBackgroundsJson" TEXT NOT NULL DEFAULT '{}',
    "featuredSectionTitle" TEXT NOT NULL DEFAULT 'Featured Right Now',
    "siteMetaTitle" TEXT NOT NULL DEFAULT 'Lotus Pro TCG | MTG, Pokemon, One Piece, Riftbound & Weiss Schwarz',
    "siteMetaDescription" TEXT NOT NULL DEFAULT 'Sealed product, singles, and pro-built decks for Magic the Gathering, Pokemon, One Piece, Riftbound, and Weiss Schwarz.',
    "footerDescription" TEXT NOT NULL DEFAULT 'Sealed product, singles, and pro-built decks for Magic, Pokemon, One Piece, Riftbound, and Weiss Schwarz.',
    "footerShopHeading" TEXT NOT NULL DEFAULT 'Shop',
    "footerSupportHeading" TEXT NOT NULL DEFAULT 'Support',
    "footerShippingHeading" TEXT NOT NULL DEFAULT 'Shipping',
    "footerContactLabel" TEXT NOT NULL DEFAULT 'Contact Us',
    "footerContactHref" TEXT NOT NULL DEFAULT '/contact',
    "footerShippingLabel" TEXT NOT NULL DEFAULT 'Shipping & Returns',
    "footerShippingHref" TEXT NOT NULL DEFAULT '/shipping',
    "footerFaqLabel" TEXT NOT NULL DEFAULT 'FAQ',
    "footerFaqHref" TEXT NOT NULL DEFAULT '/faq',
    "footerShippingLinePrimary" TEXT NOT NULL DEFAULT 'Flat rate: $5.99 on every order.',
    "footerShippingLineHighlight" TEXT NOT NULL DEFAULT 'Free shipping on orders over $75.',
    "footerLegalText" TEXT NOT NULL DEFAULT 'Copyright {year} {brandName}. Not affiliated with Wizards of the Coast, Pokemon Company, Bandai, Riot Games, or Bushiroad.',
    "footerBottomPromoLeft" TEXT NOT NULL DEFAULT '$5.99 flat shipping',
    "footerBottomPromoRight" TEXT NOT NULL DEFAULT 'Free shipping over $75',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MysteryPackInventory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "setName" TEXT NOT NULL,
    "tcgplayerUrl" TEXT,
    "productId" TEXT,
    "imageUrl" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unitCostCents" INTEGER NOT NULL,
    "marketValueCents" INTEGER NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'Basic',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MysteryPackInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MysteryBatch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "ruleSetJson" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "metricsJson" TEXT NOT NULL,
    "claimsJson" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MysteryBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MysteryBag" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "bagNumber" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "totalMarketValueCents" INTEGER NOT NULL,
    "totalCostCents" INTEGER NOT NULL,
    "profitCents" INTEGER NOT NULL,
    "outcome" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unpacked',
    "packedAt" TIMESTAMP(3),

    CONSTRAINT "MysteryBag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MysteryBagAssignment" (
    "id" TEXT NOT NULL,
    "bagId" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "nameSnapshot" TEXT NOT NULL,
    "setNameSnapshot" TEXT NOT NULL,
    "tcgplayerUrlSnapshot" TEXT,
    "imageUrlSnapshot" TEXT,
    "unitCostCents" INTEGER NOT NULL,
    "marketValueCents" INTEGER NOT NULL,

    CONSTRAINT "MysteryBagAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_parentId_slug_key" ON "Category"("parentId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_featuredOnHome_idx" ON "Product"("featuredOnHome");

-- CreateIndex
CREATE INDEX "Product_sourceMarketplace_sourceProductId_idx" ON "Product"("sourceMarketplace", "sourceProductId");

-- CreateIndex
CREATE INDEX "RestockNotify_productId_idx" ON "RestockNotify"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_stripeSessionId_key" ON "Order"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "MysteryPackInventory_tier_idx" ON "MysteryPackInventory"("tier");

-- CreateIndex
CREATE INDEX "MysteryPackInventory_setName_idx" ON "MysteryPackInventory"("setName");

-- CreateIndex
CREATE UNIQUE INDEX "MysteryBatch_auditId_key" ON "MysteryBatch"("auditId");

-- CreateIndex
CREATE INDEX "MysteryBatch_status_createdAt_idx" ON "MysteryBatch"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MysteryBag_code_key" ON "MysteryBag"("code");

-- CreateIndex
CREATE UNIQUE INDEX "MysteryBag_batchId_bagNumber_key" ON "MysteryBag"("batchId", "bagNumber");

-- CreateIndex
CREATE INDEX "MysteryBagAssignment_inventoryId_idx" ON "MysteryBagAssignment"("inventoryId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestockNotify" ADD CONSTRAINT "RestockNotify_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MysteryBag" ADD CONSTRAINT "MysteryBag_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "MysteryBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MysteryBagAssignment" ADD CONSTRAINT "MysteryBagAssignment_bagId_fkey" FOREIGN KEY ("bagId") REFERENCES "MysteryBag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MysteryBagAssignment" ADD CONSTRAINT "MysteryBagAssignment_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "MysteryPackInventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
