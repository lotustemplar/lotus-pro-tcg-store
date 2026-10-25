-- Daily price sync: store tcgcsv group id per product; new products default to auto-price ON.
ALTER TABLE "Product" ADD COLUMN "tcgplayerGroupId" INTEGER;
ALTER TABLE "Product" ALTER COLUMN "autoUpdatePrice" SET DEFAULT true;
-- Existing products keep their current on/off setting. Optional (needs Filipe's OK), turn all on:
-- UPDATE "Product" SET "autoUpdatePrice" = true;
