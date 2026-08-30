-- CreateTable
CREATE TABLE "MysteryBagSettings" (
    "id" TEXT NOT NULL DEFAULT 'mystery-bag',
    "heroImageUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MysteryBagSettings_pkey" PRIMARY KEY ("id")
);
