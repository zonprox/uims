-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED', 'LOST');

-- CreateEnum
CREATE TYPE "LicenseType" AS ENUM ('SUBSCRIPTION', 'PERPETUAL', 'OPEN_SOURCE', 'VOLUME', 'OEM');

-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'EXPIRING_SOON', 'REVOKED');

-- CreateEnum
CREATE TYPE "IPStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'ASSIGNED');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'DISABLED', 'LOCKED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "DirectorySource" AS ENUM ('LOCAL', 'LDAP', 'AZURE_AD');

-- CreateEnum
CREATE TYPE "DomainJoinStatus" AS ENUM ('JOINED', 'NOT_JOINED', 'PENDING');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'WARNING', 'ALERT');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "VlanStatus" AS ENUM ('ACTIVE', 'RESERVED', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "RackStatus" AS ENUM ('ACTIVE', 'PLANNED', 'MAINTENANCE', 'RETIRED');

-- CreateEnum
CREATE TYPE "SwitchRole" AS ENUM ('CORE', 'DISTRIBUTION', 'ACCESS', 'TOR');

-- CreateEnum
CREATE TYPE "SwitchStatus" AS ENUM ('ONLINE', 'OFFLINE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "PortFormFactor" AS ENUM ('RJ45_1G', 'SFP_1G', 'SFP_PLUS_10G', 'SFP28_25G', 'QSFP_PLUS_40G', 'QSFP28_100G');

-- CreateEnum
CREATE TYPE "PortAdminStatus" AS ENUM ('UP', 'DOWN');

-- CreateEnum
CREATE TYPE "PortOperStatus" AS ENUM ('ACTIVE', 'DOWN', 'CONNECTED_NO_SIGNAL', 'RESERVED');

-- CreateEnum
CREATE TYPE "PortMode" AS ENUM ('ACCESS', 'TRUNK', 'LACP');

-- CreateTable
CREATE TABLE "AppUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "displayName" TEXT,
    "avatar" TEXT,
    "phone" TEXT,
    "roleId" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectoryUser" (
    "id" TEXT NOT NULL,
    "employeeCode" TEXT,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "displayName" TEXT,
    "phone" TEXT,
    "avatar" TEXT,
    "managerName" TEXT,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" "DirectorySource" NOT NULL DEFAULT 'LOCAL',
    "accountExpiresAt" TIMESTAMP(3),
    "adDomain" TEXT,
    "computerName" TEXT,
    "domainJoined" BOOLEAN NOT NULL DEFAULT false,
    "domainJoinStatus" "DomainJoinStatus" NOT NULL DEFAULT 'NOT_JOINED',
    "emailPassword" TEXT,
    "emailPasswordUpdatedAt" TIMESTAMP(3),
    "departmentId" TEXT,
    "positionId" TEXT,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectoryUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "conditions" JSONB,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "CostCenter" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "assetCode" TEXT,
    "subcode" TEXT,
    "assetTag" TEXT,
    "parentId" TEXT,
    "costCenterId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "serialNumber" TEXT,
    "model" TEXT,
    "manufacturer" TEXT,
    "specifications" TEXT,
    "unitCost" DOUBLE PRECISION,
    "vendorId" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "warrantyExpiry" TIMESTAMP(3),
    "assignedToId" TEXT,
    "departmentId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,

    CONSTRAINT "AssetCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "minThreshold" INTEGER NOT NULL DEFAULT 5,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "binNumber" TEXT,
    "supplier" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vendor" TEXT,
    "vendorId" TEXT,
    "licenseKey" TEXT,
    "type" "LicenseType" NOT NULL DEFAULT 'SUBSCRIPTION',
    "totalSeats" INTEGER NOT NULL,
    "usedSeats" INTEGER NOT NULL DEFAULT 0,
    "costPerSeat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "purchaseDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "cost" DOUBLE PRECISION,
    "status" "LicenseStatus" NOT NULL DEFAULT 'ACTIVE',
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicenseAssignment" (
    "id" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "userId" TEXT,
    "assignedName" TEXT,
    "assignedEmail" TEXT,
    "department" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),

    CONSTRAINT "LicenseAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectoryGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "description" TEXT,
    "type" TEXT,
    "scope" TEXT DEFAULT 'Internal Only',
    "ouPath" TEXT,
    "managedBy" TEXT,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectoryGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectoryMembership" (
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "DirectoryMembership_pkey" PRIMARY KEY ("userId","groupId")
);

-- CreateTable
CREATE TABLE "VLAN" (
    "id" TEXT NOT NULL,
    "vlanNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "VlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VLAN_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subnet" (
    "id" TEXT NOT NULL,
    "cidr" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vlanId" TEXT,
    "gateway" TEXT,
    "networkAddress" TEXT,
    "netmask" TEXT,
    "broadcastAddress" TEXT,
    "startIp" TEXT,
    "endIp" TEXT,
    "totalIps" INTEGER NOT NULL DEFAULT 254,
    "usedIps" INTEGER NOT NULL DEFAULT 0,
    "reservedIps" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subnet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IPAddress" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "macAddress" TEXT,
    "vendor" TEXT,
    "deviceType" TEXT DEFAULT 'Workstation',
    "model" TEXT,
    "serialNumber" TEXT,
    "section" TEXT,
    "floor" TEXT,
    "subnetId" TEXT,
    "vlanId" TEXT,
    "assetId" TEXT,
    "assignedUserId" TEXT,
    "status" "IPStatus" NOT NULL DEFAULT 'AVAILABLE',
    "pingStatus" TEXT DEFAULT 'online',
    "responseTimeMs" DOUBLE PRECISION,
    "lastSeen" TIMESTAMP(3),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IPAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NetworkRack" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "totalHeight" INTEGER NOT NULL DEFAULT 42,
    "depth" DOUBLE PRECISION,
    "width" DOUBLE PRECISION,
    "maxPowerKw" DOUBLE PRECISION,
    "maxWeightKg" DOUBLE PRECISION,
    "status" "RackStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NetworkRack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NetworkSwitch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "serialNumber" TEXT,
    "macAddress" TEXT,
    "ipAddressId" TEXT,
    "firmwareVersion" TEXT,
    "role" "SwitchRole" NOT NULL DEFAULT 'ACCESS',
    "status" "SwitchStatus" NOT NULL DEFAULT 'ONLINE',
    "totalPorts" INTEGER NOT NULL DEFAULT 24,
    "uplinkPorts" INTEGER DEFAULT 2,
    "fiberPorts" INTEGER DEFAULT 2,
    "rackId" TEXT,
    "rackPosition" INTEGER,
    "rackHeight" INTEGER NOT NULL DEFAULT 1,
    "assetId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NetworkSwitch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwitchPort" (
    "id" TEXT NOT NULL,
    "switchId" TEXT NOT NULL,
    "portNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "formFactor" "PortFormFactor" NOT NULL DEFAULT 'RJ45_1G',
    "poeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "adminStatus" "PortAdminStatus" NOT NULL DEFAULT 'UP',
    "operStatus" "PortOperStatus" NOT NULL DEFAULT 'DOWN',
    "speed" TEXT,
    "duplex" TEXT,
    "vlanId" TEXT,
    "mode" "PortMode" NOT NULL DEFAULT 'ACCESS',
    "taggedVlanIds" JSONB,
    "ipAddressId" TEXT,
    "connectedAssetId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SwitchPort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "userName" TEXT,
    "action" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'Info',
    "entity" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "ipAddress" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Success',
    "details" TEXT,
    "diffPayload" JSONB,
    "oldValue" JSONB,
    "newValue" JSONB,
    "userAgent" TEXT,
    "hash" TEXT,
    "statusCode" INTEGER DEFAULT 200,
    "durationMs" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "device" TEXT,
    "ipAddress" TEXT,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "group" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportSchedule" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'PDF',
    "recipients" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "taxId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "website" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "organizationId" TEXT,
    "parentId" TEXT,
    "managerName" TEXT,
    "managerEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "departmentId" TEXT,
    "level" TEXT DEFAULT 'Mid',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_username_key" ON "AppUser"("username");

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_email_key" ON "AppUser"("email");

-- CreateIndex
CREATE INDEX "AppUser_status_idx" ON "AppUser"("status");

-- CreateIndex
CREATE INDEX "AppUser_roleId_idx" ON "AppUser"("roleId");

-- CreateIndex
CREATE INDEX "AppUser_email_idx" ON "AppUser"("email");

-- CreateIndex
CREATE INDEX "AppUser_username_idx" ON "AppUser"("username");

-- CreateIndex
CREATE UNIQUE INDEX "DirectoryUser_employeeCode_key" ON "DirectoryUser"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "DirectoryUser_email_key" ON "DirectoryUser"("email");

-- CreateIndex
CREATE INDEX "DirectoryUser_organizationId_idx" ON "DirectoryUser"("organizationId");

-- CreateIndex
CREATE INDEX "DirectoryUser_departmentId_idx" ON "DirectoryUser"("departmentId");

-- CreateIndex
CREATE INDEX "DirectoryUser_positionId_idx" ON "DirectoryUser"("positionId");

-- CreateIndex
CREATE INDEX "DirectoryUser_status_idx" ON "DirectoryUser"("status");

-- CreateIndex
CREATE INDEX "DirectoryUser_employeeCode_idx" ON "DirectoryUser"("employeeCode");

-- CreateIndex
CREATE INDEX "DirectoryUser_email_idx" ON "DirectoryUser"("email");

-- CreateIndex
CREATE INDEX "DirectoryUser_firstName_lastName_idx" ON "DirectoryUser"("firstName", "lastName");

-- CreateIndex
CREATE INDEX "DirectoryUser_managerName_idx" ON "DirectoryUser"("managerName");

-- CreateIndex
CREATE INDEX "DirectoryUser_adDomain_idx" ON "DirectoryUser"("adDomain");

-- CreateIndex
CREATE INDEX "DirectoryUser_computerName_idx" ON "DirectoryUser"("computerName");

-- CreateIndex
CREATE INDEX "DirectoryUser_domainJoined_idx" ON "DirectoryUser"("domainJoined");

-- CreateIndex
CREATE INDEX "DirectoryUser_domainJoinStatus_idx" ON "DirectoryUser"("domainJoinStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_action_subject_key" ON "Permission"("action", "subject");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "CostCenter_code_key" ON "CostCenter"("code");

-- CreateIndex
CREATE INDEX "CostCenter_code_idx" ON "CostCenter"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_assetCode_key" ON "Asset"("assetCode");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_subcode_key" ON "Asset"("subcode");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_assetTag_key" ON "Asset"("assetTag");

-- CreateIndex
CREATE INDEX "Asset_parentId_idx" ON "Asset"("parentId");

-- CreateIndex
CREATE INDEX "Asset_costCenterId_idx" ON "Asset"("costCenterId");

-- CreateIndex
CREATE INDEX "Asset_assetCode_idx" ON "Asset"("assetCode");

-- CreateIndex
CREATE INDEX "Asset_subcode_idx" ON "Asset"("subcode");

-- CreateIndex
CREATE INDEX "Asset_assetTag_idx" ON "Asset"("assetTag");

-- CreateIndex
CREATE INDEX "Asset_assignedToId_idx" ON "Asset"("assignedToId");

-- CreateIndex
CREATE INDEX "Asset_categoryId_idx" ON "Asset"("categoryId");

-- CreateIndex
CREATE INDEX "Asset_departmentId_idx" ON "Asset"("departmentId");

-- CreateIndex
CREATE INDEX "Asset_vendorId_idx" ON "Asset"("vendorId");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE INDEX "Asset_status_updatedAt_idx" ON "Asset"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "Asset_warrantyExpiry_idx" ON "Asset"("warrantyExpiry");

-- CreateIndex
CREATE INDEX "Asset_name_idx" ON "Asset"("name");

-- CreateIndex
CREATE INDEX "Asset_model_idx" ON "Asset"("model");

-- CreateIndex
CREATE INDEX "Asset_serialNumber_idx" ON "Asset"("serialNumber");

-- CreateIndex
CREATE INDEX "AssetCategory_parentId_idx" ON "AssetCategory"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCategory_name_key" ON "InventoryCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_sku_key" ON "InventoryItem"("sku");

-- CreateIndex
CREATE INDEX "InventoryItem_sku_idx" ON "InventoryItem"("sku");

-- CreateIndex
CREATE INDEX "InventoryItem_categoryId_idx" ON "InventoryItem"("categoryId");

-- CreateIndex
CREATE INDEX "InventoryItem_quantity_idx" ON "InventoryItem"("quantity");

-- CreateIndex
CREATE INDEX "InventoryItem_name_idx" ON "InventoryItem"("name");

-- CreateIndex
CREATE INDEX "InventoryItem_supplier_idx" ON "InventoryItem"("supplier");

-- CreateIndex
CREATE INDEX "License_status_idx" ON "License"("status");

-- CreateIndex
CREATE INDEX "License_expiryDate_idx" ON "License"("expiryDate");

-- CreateIndex
CREATE INDEX "License_vendor_idx" ON "License"("vendor");

-- CreateIndex
CREATE INDEX "License_vendorId_idx" ON "License"("vendorId");

-- CreateIndex
CREATE INDEX "License_name_idx" ON "License"("name");

-- CreateIndex
CREATE INDEX "LicenseAssignment_licenseId_idx" ON "LicenseAssignment"("licenseId");

-- CreateIndex
CREATE INDEX "LicenseAssignment_userId_idx" ON "LicenseAssignment"("userId");

-- CreateIndex
CREATE INDEX "LicenseAssignment_assignedEmail_idx" ON "LicenseAssignment"("assignedEmail");

-- CreateIndex
CREATE INDEX "LicenseAssignment_unassignedAt_idx" ON "LicenseAssignment"("unassignedAt");

-- CreateIndex
CREATE INDEX "DirectoryGroup_name_idx" ON "DirectoryGroup"("name");

-- CreateIndex
CREATE INDEX "DirectoryMembership_userId_idx" ON "DirectoryMembership"("userId");

-- CreateIndex
CREATE INDEX "DirectoryMembership_groupId_idx" ON "DirectoryMembership"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "VLAN_vlanNumber_key" ON "VLAN"("vlanNumber");

-- CreateIndex
CREATE INDEX "VLAN_vlanNumber_idx" ON "VLAN"("vlanNumber");

-- CreateIndex
CREATE INDEX "VLAN_name_idx" ON "VLAN"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Subnet_cidr_key" ON "Subnet"("cidr");

-- CreateIndex
CREATE INDEX "Subnet_vlanId_idx" ON "Subnet"("vlanId");

-- CreateIndex
CREATE INDEX "Subnet_cidr_idx" ON "Subnet"("cidr");

-- CreateIndex
CREATE INDEX "Subnet_name_idx" ON "Subnet"("name");

-- CreateIndex
CREATE INDEX "IPAddress_subnetId_idx" ON "IPAddress"("subnetId");

-- CreateIndex
CREATE INDEX "IPAddress_vlanId_idx" ON "IPAddress"("vlanId");

-- CreateIndex
CREATE INDEX "IPAddress_assetId_idx" ON "IPAddress"("assetId");

-- CreateIndex
CREATE INDEX "IPAddress_assignedUserId_idx" ON "IPAddress"("assignedUserId");

-- CreateIndex
CREATE INDEX "IPAddress_status_idx" ON "IPAddress"("status");

-- CreateIndex
CREATE INDEX "IPAddress_pingStatus_idx" ON "IPAddress"("pingStatus");

-- CreateIndex
CREATE INDEX "IPAddress_macAddress_idx" ON "IPAddress"("macAddress");

-- CreateIndex
CREATE INDEX "IPAddress_deviceType_idx" ON "IPAddress"("deviceType");

-- CreateIndex
CREATE UNIQUE INDEX "IPAddress_address_subnetId_key" ON "IPAddress"("address", "subnetId");

-- CreateIndex
CREATE UNIQUE INDEX "NetworkRack_code_key" ON "NetworkRack"("code");

-- CreateIndex
CREATE INDEX "NetworkRack_code_idx" ON "NetworkRack"("code");

-- CreateIndex
CREATE INDEX "NetworkRack_name_idx" ON "NetworkRack"("name");

-- CreateIndex
CREATE INDEX "NetworkRack_status_idx" ON "NetworkRack"("status");

-- CreateIndex
CREATE UNIQUE INDEX "NetworkSwitch_serialNumber_key" ON "NetworkSwitch"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "NetworkSwitch_assetId_key" ON "NetworkSwitch"("assetId");

-- CreateIndex
CREATE INDEX "NetworkSwitch_rackId_idx" ON "NetworkSwitch"("rackId");

-- CreateIndex
CREATE INDEX "NetworkSwitch_assetId_idx" ON "NetworkSwitch"("assetId");

-- CreateIndex
CREATE INDEX "NetworkSwitch_ipAddressId_idx" ON "NetworkSwitch"("ipAddressId");

-- CreateIndex
CREATE INDEX "NetworkSwitch_role_idx" ON "NetworkSwitch"("role");

-- CreateIndex
CREATE INDEX "NetworkSwitch_status_idx" ON "NetworkSwitch"("status");

-- CreateIndex
CREATE INDEX "NetworkSwitch_vendor_idx" ON "NetworkSwitch"("vendor");

-- CreateIndex
CREATE INDEX "NetworkSwitch_name_idx" ON "NetworkSwitch"("name");

-- CreateIndex
CREATE INDEX "NetworkSwitch_model_idx" ON "NetworkSwitch"("model");

-- CreateIndex
CREATE INDEX "SwitchPort_switchId_idx" ON "SwitchPort"("switchId");

-- CreateIndex
CREATE INDEX "SwitchPort_vlanId_idx" ON "SwitchPort"("vlanId");

-- CreateIndex
CREATE INDEX "SwitchPort_ipAddressId_idx" ON "SwitchPort"("ipAddressId");

-- CreateIndex
CREATE INDEX "SwitchPort_connectedAssetId_idx" ON "SwitchPort"("connectedAssetId");

-- CreateIndex
CREATE INDEX "SwitchPort_adminStatus_idx" ON "SwitchPort"("adminStatus");

-- CreateIndex
CREATE INDEX "SwitchPort_operStatus_idx" ON "SwitchPort"("operStatus");

-- CreateIndex
CREATE INDEX "SwitchPort_mode_idx" ON "SwitchPort"("mode");

-- CreateIndex
CREATE INDEX "SwitchPort_portNumber_idx" ON "SwitchPort"("portNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SwitchPort_switchId_portNumber_key" ON "SwitchPort"("switchId", "portNumber");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_entity_idx" ON "AuditLog"("entity");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_severity_idx" ON "AuditLog"("severity");

-- CreateIndex
CREATE INDEX "AuditLog_ipAddress_idx" ON "AuditLog"("ipAddress");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_tokenHash_idx" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- CreateIndex
CREATE INDEX "ReportSchedule_createdAt_idx" ON "ReportSchedule"("createdAt");

-- CreateIndex
CREATE INDEX "ReportSchedule_frequency_idx" ON "ReportSchedule"("frequency");

-- CreateIndex
CREATE INDEX "ReportSchedule_category_idx" ON "ReportSchedule"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_code_key" ON "Organization"("code");

-- CreateIndex
CREATE INDEX "Organization_parentId_idx" ON "Organization"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE INDEX "Department_organizationId_idx" ON "Department"("organizationId");

-- CreateIndex
CREATE INDEX "Department_parentId_idx" ON "Department"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Position_code_key" ON "Position"("code");

-- CreateIndex
CREATE INDEX "Position_departmentId_idx" ON "Position"("departmentId");

-- CreateIndex
CREATE INDEX "Vendor_name_idx" ON "Vendor"("name");

-- AddForeignKey
ALTER TABLE "AppUser" ADD CONSTRAINT "AppUser_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectoryUser" ADD CONSTRAINT "DirectoryUser_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectoryUser" ADD CONSTRAINT "DirectoryUser_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectoryUser" ADD CONSTRAINT "DirectoryUser_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AssetCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "DirectoryUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetCategory" ADD CONSTRAINT "AssetCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "AssetCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InventoryCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "License" ADD CONSTRAINT "License_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseAssignment" ADD CONSTRAINT "LicenseAssignment_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseAssignment" ADD CONSTRAINT "LicenseAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "DirectoryUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectoryMembership" ADD CONSTRAINT "DirectoryMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "DirectoryUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectoryMembership" ADD CONSTRAINT "DirectoryMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "DirectoryGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subnet" ADD CONSTRAINT "Subnet_vlanId_fkey" FOREIGN KEY ("vlanId") REFERENCES "VLAN"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPAddress" ADD CONSTRAINT "IPAddress_subnetId_fkey" FOREIGN KEY ("subnetId") REFERENCES "Subnet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPAddress" ADD CONSTRAINT "IPAddress_vlanId_fkey" FOREIGN KEY ("vlanId") REFERENCES "VLAN"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPAddress" ADD CONSTRAINT "IPAddress_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPAddress" ADD CONSTRAINT "IPAddress_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "DirectoryUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkSwitch" ADD CONSTRAINT "NetworkSwitch_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "NetworkRack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkSwitch" ADD CONSTRAINT "NetworkSwitch_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkSwitch" ADD CONSTRAINT "NetworkSwitch_ipAddressId_fkey" FOREIGN KEY ("ipAddressId") REFERENCES "IPAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwitchPort" ADD CONSTRAINT "SwitchPort_switchId_fkey" FOREIGN KEY ("switchId") REFERENCES "NetworkSwitch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwitchPort" ADD CONSTRAINT "SwitchPort_vlanId_fkey" FOREIGN KEY ("vlanId") REFERENCES "VLAN"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwitchPort" ADD CONSTRAINT "SwitchPort_ipAddressId_fkey" FOREIGN KEY ("ipAddressId") REFERENCES "IPAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwitchPort" ADD CONSTRAINT "SwitchPort_connectedAssetId_fkey" FOREIGN KEY ("connectedAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

