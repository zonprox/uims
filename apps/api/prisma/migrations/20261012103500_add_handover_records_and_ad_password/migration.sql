-- CreateEnum safely
DO $$ BEGIN
    CREATE TYPE "HandoverRecordType" AS ENUM ('ASSIGNMENT', 'RETURN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable DirectoryUser
ALTER TABLE "DirectoryUser" ADD COLUMN IF NOT EXISTS "adInitialPassword" TEXT,
ADD COLUMN IF NOT EXISTS "adInitialPasswordUpdatedAt" TIMESTAMP(3);

-- AlterTable Asset
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "hasPendingRecord" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable AssetHandoverRecord
CREATE TABLE IF NOT EXISTS "AssetHandoverRecord" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "type" "HandoverRecordType" NOT NULL,
    "recipientId" TEXT,
    "signedDocUrl" TEXT,
    "isPending" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetHandoverRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX IF NOT EXISTS "Asset_hasPendingRecord_idx" ON "Asset"("hasPendingRecord");
CREATE INDEX IF NOT EXISTS "AssetHandoverRecord_assetId_idx" ON "AssetHandoverRecord"("assetId");
CREATE INDEX IF NOT EXISTS "AssetHandoverRecord_recipientId_idx" ON "AssetHandoverRecord"("recipientId");
CREATE INDEX IF NOT EXISTS "AssetHandoverRecord_isPending_idx" ON "AssetHandoverRecord"("isPending");

-- AddForeignKeys safely
DO $$ BEGIN
    ALTER TABLE "AssetHandoverRecord" ADD CONSTRAINT "AssetHandoverRecord_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "AssetHandoverRecord" ADD CONSTRAINT "AssetHandoverRecord_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "DirectoryUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
