-- NOT YET APPLIED to the database (Oct 24, 2026). Mystery bag rows were already deleted; this only drops the empty tables.
-- DropForeignKey
ALTER TABLE "MysteryBag" DROP CONSTRAINT "MysteryBag_batchId_fkey";

-- DropForeignKey
ALTER TABLE "MysteryBagAssignment" DROP CONSTRAINT "MysteryBagAssignment_bagId_fkey";

-- DropForeignKey
ALTER TABLE "MysteryBagAssignment" DROP CONSTRAINT "MysteryBagAssignment_inventoryId_fkey";

-- DropTable
DROP TABLE "MysteryBagSettings";

-- DropTable
DROP TABLE "MysteryPackInventory";

-- DropTable
DROP TABLE "MysteryBatch";

-- DropTable
DROP TABLE "MysteryBag";

-- DropTable
DROP TABLE "MysteryBagAssignment";

