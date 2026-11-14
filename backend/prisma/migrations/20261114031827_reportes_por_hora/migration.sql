-- CreateEnum
CREATE TYPE "ReportTrigger" AS ENUM ('AUTOMATICO', 'MANUAL');

-- CreateTable
CREATE TABLE "ReportRun" (
    "id" SERIAL NOT NULL,
    "trigger" "ReportTrigger" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "orders" INTEGER NOT NULL,
    "sales" DECIMAL(12,2) NOT NULL,
    "collected" DECIMAL(12,2) NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error" TEXT,
    "filePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportRun_createdAt_idx" ON "ReportRun"("createdAt");
