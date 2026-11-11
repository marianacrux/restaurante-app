/*
  Warnings:

  - You are about to drop the column `imageURL` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
-- Renombrar conserva los datos
ALTER TABLE "Product" RENAME COLUMN "imageURL" TO "imageUrl";
