/*
  Warnings:

  - You are about to drop the column `address` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `iamgeURL` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "address";

-- AlterTable
ALTER TABLE "Product" RENAME COLUMN "iamgeURL" TO "imageUrl";

