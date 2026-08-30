/*
  Warnings:

  - Added the required column `costBasisCents` to the `MysteryBagAssignment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MysteryBagAssignment" ADD COLUMN     "costBasisCents" INTEGER NOT NULL;
