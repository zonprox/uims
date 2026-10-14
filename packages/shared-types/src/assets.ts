import type { AssetCategory, AssetStatus, CostCenter } from './entities/asset';
import type { Vendor } from './entities/common';
import type { DirectoryUser } from './entities/directory';
import type { IPAddress, NetworkSwitch, SwitchPort } from './entities/network';
import type { Department } from './entities/organization';

// ==========================================
// MASTER CATALOG: DEVICE MODEL
// ==========================================

export interface DeviceModel {
  id: string;
  name: string;
  modelCode: string;
  categoryId: string;
  manufacturer: string;
  vendorId?: string | null;
  specifications: Record<string, unknown>;
  unitCost: number;
  minThreshold: number;
  binLocation?: string | null;
  createdAt: string;
  updatedAt: string;
  category?: AssetCategory;
  vendor?: Vendor;
  // Computed live stock metrics (aggregated in PostgreSQL)
  totalUnits?: number;
  availableUnits?: number;
  assignedUnits?: number;
  maintenanceUnits?: number;
  retiredUnits?: number;
  lostUnits?: number;
  stockStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export interface DeviceModelSummary {
  id: string;
  name: string;
  modelCode: string;
  categoryName?: string;
  manufacturer: string;
  totalUnits: number;
  availableUnits: number;
  assignedUnits: number;
  maintenanceUnits: number;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

// ==========================================
// PHYSICAL UNIT (SERIALIZED ASSET)
// ==========================================

export interface PhysicalUnit {
  id: string;
  deviceModelId?: string;
  deviceModel?: DeviceModel | null;
  name?: string;
  model?: string;
  manufacturer?: string;
  assetTag: string;
  subcode?: string | null;
  serialNumber?: string | null;
  status: AssetStatus | `${AssetStatus}` | string;
  assignedToId?: string | null;
  assignedTo?: DirectoryUser | null;
  assignedUser?: string;
  assignedEmail?: string;
  departmentId?: string | null;
  department?: Department | null;
  costCenterId?: string | null;
  costCenter?: CostCenter | null;
  purchaseDate?: string | null;
  warrantyExpiry?: string | null;
  hasPendingRecord?: boolean;
  notes?: string | null;
  ipAddresses?: IPAddress[];
  networkSwitch?: NetworkSwitch | null;
  connectedPorts?: SwitchPort[];
  createdAt: string;
  updatedAt: string;
}

export type Asset = PhysicalUnit;

// ==========================================
// CUSTODY & INTAKE WORKFLOW CONTRACTS
// ==========================================

export interface StockIntakeDto {
  deviceModelId: string;
  count: number;
  tagPrefix?: string;
  startSequence?: number;
  serialNumbers?: string[];
  purchaseDate?: string;
  warrantyExpiry?: string;
  costCenterId?: string;
  initialBinLocation?: string;
  notes?: string;
}

export type BatchStockIntakeDto = StockIntakeDto;

export interface AllocateAssetDto {
  assetIds: string[];
  assignedToId: string;
  departmentId?: string;
  costCenterId?: string;
  conditionNotes?: string;
  signedDocUrl?: string;
}

export interface ReturnAssetDto {
  assetIds: string[];
  targetStatus: 'AVAILABLE' | 'MAINTENANCE' | 'RETIRED';
  inspectionNotes?: string;
  signedDocUrl?: string;
}

export interface TransferAssetDto {
  assetIds: string[];
  toUserId: string;
  toDepartmentId?: string;
  transferReason?: string;
  signedDocUrl?: string;
}

export interface RegisterPhysicalUnitDto {
  deviceModelId: string;
  assetTag?: string;
  tag?: string;
  subcode?: string;
  serialNumber?: string;
  costCenterId?: string;
  departmentId?: string;
  assignedToId?: string | null;
  purchaseDate?: string | Date;
  warrantyExpiry?: string | Date;
  notes?: string;
}

export type CreateAssetUnitDto = RegisterPhysicalUnitDto;

export interface UpdatePhysicalUnitDto extends Partial<RegisterPhysicalUnitDto> {
  status?: string | AssetStatus;
  assignedToId?: string | null;
}

export type UpdateAssetUnitDto = UpdatePhysicalUnitDto;
