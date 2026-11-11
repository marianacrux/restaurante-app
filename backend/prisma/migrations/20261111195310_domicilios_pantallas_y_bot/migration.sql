-- CreateEnum
CREATE TYPE "TransportType" AS ENUM ('A_PIE', 'BICICLETA', 'MOTOCICLETA');

-- CreateEnum
CREATE TYPE "DeliveryPersonStatus" AS ENUM ('DISPONIBLE', 'OCUPADO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('ASIGNADO', 'EN_CAMINO', 'ENTREGADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PORCENTAJE', 'VALOR_FIJO');

-- CreateEnum
CREATE TYPE "ScreenContentType" AS ENUM ('PRODUCTO', 'PROMOCION', 'ANUNCIO');

-- CreateEnum
CREATE TYPE "ChatChannel" AS ENUM ('SIMULADOR', 'WHATSAPP_CLOUD');

-- CreateTable
CREATE TABLE "DeliveryPerson" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "transportType" "TransportType" NOT NULL,
    "availability" "DeliveryPersonStatus" NOT NULL DEFAULT 'DISPONIBLE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "deliveryPersonId" INTEGER NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'ASIGNADO',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pickedUpAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "discountType" "DiscountType" NOT NULL DEFAULT 'PORCENTAJE',
    "discountValue" DECIMAL(12,2) NOT NULL,
    "imageUrl" TEXT,
    "productId" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuScreen" (
    "id" SERIAL NOT NULL,
    "screenNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuScreen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreenContent" (
    "id" SERIAL NOT NULL,
    "screenId" INTEGER NOT NULL,
    "contentType" "ScreenContentType" NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "productId" INTEGER,
    "promotionId" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ScreenContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL,
    "channel" "ChatChannel" NOT NULL DEFAULT 'SIMULADOR',
    "phone" TEXT,
    "step" TEXT NOT NULL DEFAULT 'INICIO',
    "data" JSONB NOT NULL DEFAULT '{}',
    "orderId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryPerson_phone_key" ON "DeliveryPerson"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryPerson_userId_key" ON "DeliveryPerson"("userId");

-- CreateIndex
CREATE INDEX "DeliveryPerson_availability_active_idx" ON "DeliveryPerson"("availability", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_orderId_key" ON "Delivery"("orderId");

-- CreateIndex
CREATE INDEX "Delivery_deliveryPersonId_status_idx" ON "Delivery"("deliveryPersonId", "status");

-- CreateIndex
CREATE INDEX "Promotion_active_startDate_endDate_idx" ON "Promotion"("active", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "MenuScreen_screenNumber_key" ON "MenuScreen"("screenNumber");

-- CreateIndex
CREATE INDEX "ScreenContent_screenId_position_idx" ON "ScreenContent"("screenId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ChatSession_orderId_key" ON "ChatSession"("orderId");

-- CreateIndex
CREATE INDEX "ChatSession_phone_updatedAt_idx" ON "ChatSession"("phone", "updatedAt");

-- AddForeignKey
ALTER TABLE "DeliveryPerson" ADD CONSTRAINT "DeliveryPerson_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_deliveryPersonId_fkey" FOREIGN KEY ("deliveryPersonId") REFERENCES "DeliveryPerson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreenContent" ADD CONSTRAINT "ScreenContent_screenId_fkey" FOREIGN KEY ("screenId") REFERENCES "MenuScreen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreenContent" ADD CONSTRAINT "ScreenContent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreenContent" ADD CONSTRAINT "ScreenContent_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
