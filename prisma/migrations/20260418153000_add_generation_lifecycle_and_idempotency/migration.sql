-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "GenerationPlatform" AS ENUM ('WEB', 'MOBILE');

-- AlterTable
ALTER TABLE "Generation"
ADD COLUMN "platform" "GenerationPlatform" NOT NULL DEFAULT 'WEB',
ADD COLUMN "status" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "terminalAt" TIMESTAMP(3),
ADD COLUMN "errorMessage" TEXT,
ADD COLUMN "errorMeta" JSONB,
ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Generation_idempotencyKey_key" ON "Generation"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Generation_projectId_status_idx" ON "Generation"("projectId", "status");

-- CreateIndex
CREATE INDEX "Generation_status_createdAt_idx" ON "Generation"("status", "createdAt");
