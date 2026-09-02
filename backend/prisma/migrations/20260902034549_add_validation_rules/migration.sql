-- AlterTable
ALTER TABLE "Endpoint" ADD COLUMN     "expectedStatus" INTEGER,
ADD COLUMN     "maxResponseTime" INTEGER;

-- AlterTable
ALTER TABLE "TestResult" ADD COLUMN     "bugDetected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bugMessage" TEXT,
ADD COLUMN     "bugType" TEXT;
