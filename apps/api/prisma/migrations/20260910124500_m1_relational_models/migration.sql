-- DropIndex
DROP INDEX "AppUser_roleName_idx";

-- DropIndex
DROP INDEX "DirectoryUser_adGroup_idx";

-- DropIndex
DROP INDEX "DirectoryUser_company_idx";

-- DropIndex
DROP INDEX "DirectoryUser_computerName_idx";

-- DropIndex
DROP INDEX "DirectoryUser_department_idx";

-- DropIndex
DROP INDEX "DirectoryUser_jobTitle_idx";

-- DropIndex
DROP INDEX "DirectoryUser_plant_idx";

-- DropIndex
DROP INDEX "DirectoryUser_section_idx";

-- DropIndex
DROP INDEX "InventoryItem_category_idx";

-- AlterTable
ALTER TABLE "AppUser" DROP COLUMN "roleName";

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "departmentId" TEXT;

-- AlterTable
ALTER TABLE "DirectoryUser" DROP COLUMN "adGroup",
DROP COLUMN "company",
DROP COLUMN "computerName",
DROP COLUMN "computerName2",
DROP COLUMN "department",
DROP COLUMN "groupCompany",
DROP COLUMN "isClosed",
DROP COLUMN "jobTitle",
DROP COLUMN "location",
DROP COLUMN "plant",
DROP COLUMN "section",
DROP COLUMN "subSection",
DROP COLUMN "telephone";

-- Clean legacy un-normalized inventory items prior to schema restructuring
DELETE FROM "InventoryItem";

-- AlterTable
ALTER TABLE "InventoryItem" DROP COLUMN "category",
DROP COLUMN "location",
ADD COLUMN     "categoryId" TEXT NOT NULL,
ADD COLUMN     "locationId" TEXT;

-- CreateTable
CREATE TABLE "InventoryCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCategory_name_key" ON "InventoryCategory"("name");

-- CreateIndex
CREATE INDEX "Asset_departmentId_idx" ON "Asset"("departmentId");

-- CreateIndex
CREATE INDEX "AssetCategory_parentId_idx" ON "AssetCategory"("parentId");

-- CreateIndex
CREATE INDEX "InventoryItem_categoryId_idx" ON "InventoryItem"("categoryId");

-- CreateIndex
CREATE INDEX "InventoryItem_locationId_idx" ON "InventoryItem"("locationId");

-- CreateIndex
CREATE INDEX "LicenseAssignment_unassignedAt_idx" ON "LicenseAssignment"("unassignedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_action_subject_key" ON "Permission"("action", "subject");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InventoryCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

