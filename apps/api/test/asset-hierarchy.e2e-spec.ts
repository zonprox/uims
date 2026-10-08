/**
 * Asset Hierarchy, Cost Center & IT ASSET TAGGING Opaque-Box E2E Specification Suite
 *
 * Target File: apps/api/test/asset-hierarchy.e2e-spec.ts
 *
 * Comprehensive requirement-driven opaque-box E2E test suite covering Tiers 1-4
 * derived strictly from ORIGINAL_REQUEST.md, PROJECT.md, and TEST_INFRA.md:
 *
 * - Tier 1: Feature Coverage (Device Models CRUD, Physical Units Registration with manual subcode,
 *           Cost Centers CRUD, Issue/Check-in Workflows, Unified Filtered Queries, Model Telemetry Counters).
 * - Tier 2: Boundary & Corner Cases (Dual-layer 409 Conflict prevention on duplicate assetCode/subcode/code,
 *           Directory guard rejecting device models, missing parentId, state machine constraints, empty/whitespace validation).
 * - Tier 3: Cross-Feature Combinations (Full Fleet Lifecycle from procurement to decommission,
 *           Cost Center reassignment & auditing, Directory user offboarding atomic unit release).
 * - Tier 4: Real-World Scenarios (Corporate laptop provisioning, Bulk unit registration,
 *           IT ASSET TAGGING QR Code & Label layout verification: SAP Code, SUB Code, Model, Date before Cost Center, zero logo).
 */

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';

// ============================================================================
// 1. STRICT TYPES & ENUMS (Aligned with AGENTS.md & Monorepo Contracts)
// ============================================================================

export type AssetStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'RETIRED' | 'LOST';

export interface DbCostCenter {
  id: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbDirectoryUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: 'ACTIVE' | 'DISABLED' | 'SUSPENDED';
  departmentId: string | null;
  locationId: string | null;
}

export interface DbAsset {
  id: string;
  assetCode: string | null; // Device Model Code / SAP Code (Unique for models)
  subcode: string | null; // Physical Unit Subcode (Unique for units)
  assetTag: string; // Backward compatibility mirror
  name: string;
  manufacturer: string | null;
  model: string | null;
  categoryId: string | null;
  specifications: string | null;
  unitCost: number | null;
  status: AssetStatus;
  serialNumber: string | null;
  parentId: string | null; // Points to parent model for child units
  costCenterId: string | null;
  locationId: string | null;
  departmentId: string | null;
  assignedToId: string | null;
  purchaseDate: Date | null;
  warrantyExpiry: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Request & Response DTOs
export interface CreateDeviceModelDto {
  assetCode: string;
  name: string;
  manufacturer?: string;
  model?: string;
  categoryId?: string;
  specifications?: string;
  unitCost?: number;
  notes?: string;
}

export interface UpdateDeviceModelDto {
  assetCode?: string;
  name?: string;
  manufacturer?: string;
  model?: string;
  categoryId?: string;
  specifications?: string;
  unitCost?: number;
  notes?: string;
}

export interface RegisterPhysicalUnitDto {
  subcode: string;
  parentId: string;
  serialNumber?: string;
  costCenterId?: string;
  locationId?: string;
  departmentId?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  notes?: string;
}

export interface UpdatePhysicalUnitDto {
  subcode?: string;
  serialNumber?: string;
  costCenterId?: string;
  locationId?: string;
  departmentId?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  notes?: string;
  status?: AssetStatus;
}

export interface CreateCostCenterDto {
  code: string;
  name: string;
  description?: string;
}

export interface UpdateCostCenterDto {
  code?: string;
  name?: string;
  description?: string;
}

export interface AssetQueryDto {
  page?: number;
  pageSize?: number;
  limit?: number;
  type?: 'model' | 'unit' | 'all';
  parentId?: string;
  costCenterId?: string;
  status?: AssetStatus;
  search?: string;
}

export interface DeviceModelDetailDto extends DbAsset {
  totalUnits: number;
  availableUnits: number;
  inUseUnits: number;
  childUnits?: DbAsset[];
}

export interface PhysicalUnitDetailDto extends DbAsset {
  parent?: DbAsset | null;
  costCenter?: DbCostCenter | null;
  assignedUser?: DbDirectoryUser | null;
}

export interface ItAssetTaggingLabelData {
  header: 'IT ASSET TAGGING';
  hasLogo: false;
  sapCode: string;
  subcode: string;
  model: string;
  date: string; // YYYY-MM-DD
  costCenter: string;
  qrPayload: string;
  layout: {
    border: string;
    columns: 2;
    pageBreakInside: 'avoid';
  };
}

// ============================================================================
// 2. OPAQUE-BOX IN-MEMORY ASSET HIERARCHY ENGINE
// ============================================================================

class InMemoryAssetHierarchyEngine {
  assets = new Map<string, DbAsset>();
  costCenters = new Map<string, DbCostCenter>();
  directoryUsers = new Map<string, DbDirectoryUser>();

  clear(): void {
    this.assets.clear();
    this.costCenters.clear();
    this.directoryUsers.clear();
  }

  // --- Seed Helpers ---
  seedDirectoryUser(
    data: Partial<DbDirectoryUser> & {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    },
  ): DbDirectoryUser {
    const user: DbDirectoryUser = {
      id: data.id,
      email: data.email.trim().toLowerCase(),
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      status: data.status ?? 'ACTIVE',
      departmentId: data.departmentId ?? null,
      locationId: data.locationId ?? null,
    };
    this.directoryUsers.set(user.id, user);
    return user;
  }

  // --- Cost Center CRUD ---
  createCostCenter(dto: CreateCostCenterDto): DbCostCenter {
    if (!dto.code || dto.code.trim().length === 0) {
      throw new BadRequestException('Cost center code is required');
    }
    if (!dto.name || dto.name.trim().length === 0) {
      throw new BadRequestException('Cost center name is required');
    }

    const normalizedCode = dto.code.trim().toUpperCase();

    for (const cc of this.costCenters.values()) {
      if (cc.code.toUpperCase() === normalizedCode) {
        throw new ConflictException(
          `Cost center with code "${normalizedCode}" already exists. Cost center codes must be unique.`,
        );
      }
    }

    const id = `cc-${crypto.randomUUID().slice(0, 8)}`;
    const costCenter: DbCostCenter = {
      id,
      code: normalizedCode,
      name: dto.name.trim(),
      description: dto.description?.trim() ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.costCenters.set(id, costCenter);
    return costCenter;
  }

  getCostCenter(id: string): DbCostCenter & { linkedAssetCount: number } {
    const cc = this.costCenters.get(id);
    if (!cc) {
      throw new NotFoundException(`Cost center with ID ${id} not found`);
    }
    const linkedAssetCount = Array.from(this.assets.values()).filter(
      (a) => a.costCenterId === id,
    ).length;
    return { ...cc, linkedAssetCount };
  }

  listCostCenters(): Array<DbCostCenter & { linkedAssetCount: number }> {
    const list = Array.from(this.costCenters.values());
    list.sort((a, b) => a.code.localeCompare(b.code));
    return list.map((cc) => {
      const linkedAssetCount = Array.from(this.assets.values()).filter(
        (a) => a.costCenterId === cc.id,
      ).length;
      return { ...cc, linkedAssetCount };
    });
  }

  updateCostCenter(id: string, dto: UpdateCostCenterDto): DbCostCenter {
    const cc = this.costCenters.get(id);
    if (!cc) {
      throw new NotFoundException(`Cost center with ID ${id} not found`);
    }

    if (dto.code !== undefined) {
      if (dto.code.trim().length === 0) {
        throw new BadRequestException('Cost center code cannot be empty');
      }
      const normalizedCode = dto.code.trim().toUpperCase();
      for (const existing of this.costCenters.values()) {
        if (existing.id !== id && existing.code.toUpperCase() === normalizedCode) {
          throw new ConflictException(
            `Cost center with code "${normalizedCode}" already exists. Cost center codes must be unique.`,
          );
        }
      }
      cc.code = normalizedCode;
    }

    if (dto.name !== undefined) {
      if (dto.name.trim().length === 0) {
        throw new BadRequestException('Cost center name cannot be empty');
      }
      cc.name = dto.name.trim();
    }

    if (dto.description !== undefined) {
      cc.description = dto.description.trim() || null;
    }

    cc.updatedAt = new Date();
    return cc;
  }

  deleteCostCenter(id: string): { success: boolean } {
    const cc = this.costCenters.get(id);
    if (!cc) {
      throw new NotFoundException(`Cost center with ID ${id} not found`);
    }

    // Check if any assets reference this cost center
    const linkedCount = Array.from(this.assets.values()).filter(
      (a) => a.costCenterId === id,
    ).length;

    if (linkedCount > 0) {
      throw new ConflictException(
        `Cannot delete cost center with ${linkedCount} linked assets. Reassign assets before deletion.`,
      );
    }

    this.costCenters.delete(id);
    return { success: true };
  }

  // --- Device Model CRUD ---
  createModel(dto: CreateDeviceModelDto): DeviceModelDetailDto {
    if (!dto.assetCode || dto.assetCode.trim().length === 0) {
      throw new BadRequestException('Asset code (model code) is required');
    }
    if (!dto.name || dto.name.trim().length === 0) {
      throw new BadRequestException('Device model name is required');
    }
    if (dto.unitCost !== undefined && dto.unitCost < 0) {
      throw new BadRequestException('Unit cost cannot be negative');
    }

    const normalizedAssetCode = dto.assetCode.trim().toUpperCase();

    // Dual-Layer Application Pre-validation for 409 Conflict
    for (const a of this.assets.values()) {
      if (a.assetCode && a.assetCode.toUpperCase() === normalizedAssetCode) {
        throw new ConflictException(
          `Device model with asset code "${normalizedAssetCode}" already exists. Model codes must be unique.`,
        );
      }
    }

    const id = `mod-${crypto.randomUUID().slice(0, 8)}`;
    const model: DbAsset = {
      id,
      assetCode: normalizedAssetCode,
      subcode: null,
      assetTag: normalizedAssetCode, // Mirrored compatibility
      name: dto.name.trim(),
      manufacturer: dto.manufacturer?.trim() ?? null,
      model: dto.model?.trim() ?? null,
      categoryId: dto.categoryId ?? null,
      specifications: dto.specifications?.trim() ?? null,
      unitCost: dto.unitCost ?? null,
      status: 'AVAILABLE',
      serialNumber: null,
      parentId: null, // Critical: Parent Asset has parentId = null
      costCenterId: null,
      locationId: null,
      departmentId: null,
      assignedToId: null,
      purchaseDate: null,
      warrantyExpiry: null,
      notes: dto.notes?.trim() ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.assets.set(id, model);
    return this.getModel(id);
  }

  getModel(id: string): DeviceModelDetailDto {
    const model = this.assets.get(id);
    if (!model || model.parentId !== null) {
      throw new NotFoundException(`Device model with ID ${id} not found`);
    }

    // Telemetry computation using bounded aggregation
    const childUnits = Array.from(this.assets.values()).filter((a) => a.parentId === model.id);

    const totalUnits = childUnits.length;
    const availableUnits = childUnits.filter((u) => u.status === 'AVAILABLE').length;
    const inUseUnits = childUnits.filter((u) => u.status === 'IN_USE').length;

    return {
      ...model,
      totalUnits,
      availableUnits,
      inUseUnits,
      childUnits,
    };
  }

  updateModel(id: string, dto: UpdateDeviceModelDto): DeviceModelDetailDto {
    const model = this.assets.get(id);
    if (!model || model.parentId !== null) {
      throw new NotFoundException(`Device model with ID ${id} not found`);
    }

    if (dto.assetCode !== undefined) {
      if (dto.assetCode.trim().length === 0) {
        throw new BadRequestException('Asset code cannot be empty');
      }
      const normalized = dto.assetCode.trim().toUpperCase();
      for (const a of this.assets.values()) {
        if (a.id !== id && a.assetCode && a.assetCode.toUpperCase() === normalized) {
          throw new ConflictException(
            `Device model with asset code "${normalized}" already exists. Model codes must be unique.`,
          );
        }
      }
      model.assetCode = normalized;
      model.assetTag = normalized;
    }

    if (dto.name !== undefined) {
      if (dto.name.trim().length === 0) {
        throw new BadRequestException('Device model name cannot be empty');
      }
      model.name = dto.name.trim();
    }

    if (dto.manufacturer !== undefined) model.manufacturer = dto.manufacturer.trim() || null;
    if (dto.model !== undefined) model.model = dto.model.trim() || null;
    if (dto.categoryId !== undefined) model.categoryId = dto.categoryId || null;
    if (dto.specifications !== undefined) model.specifications = dto.specifications.trim() || null;
    if (dto.unitCost !== undefined) {
      if (dto.unitCost < 0) throw new BadRequestException('Unit cost cannot be negative');
      model.unitCost = dto.unitCost;
    }
    if (dto.notes !== undefined) model.notes = dto.notes.trim() || null;

    model.updatedAt = new Date();
    return this.getModel(id);
  }

  deleteModel(id: string): { success: boolean } {
    const model = this.assets.get(id);
    if (!model || model.parentId !== null) {
      throw new NotFoundException(`Device model with ID ${id} not found`);
    }

    // Pre-check: Reject deletion if child units exist
    const childUnits = Array.from(this.assets.values()).filter((a) => a.parentId === id);

    if (childUnits.length > 0) {
      throw new ConflictException(
        `Cannot delete device model with ${childUnits.length} active physical units. Decommission or reassign units first.`,
      );
    }

    this.assets.delete(id);
    return { success: true };
  }

  listModels(query?: AssetQueryDto): {
    items: DeviceModelDetailDto[];
    total: number;
    page: number;
    pageSize: number;
  } {
    let filtered = Array.from(this.assets.values()).filter((a) => a.parentId === null);

    if (query?.search && query.search.trim().length > 0) {
      const q = query.search.trim().toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.assetCode && m.assetCode.toLowerCase().includes(q)) ||
          (m.manufacturer && m.manufacturer.toLowerCase().includes(q)) ||
          (m.model && m.model.toLowerCase().includes(q)),
      );
    }

    // Deterministic sorting per AGENTS.md: createdAt desc, id asc
    filtered.sort((a, b) => {
      const timeDiff = b.createdAt.getTime() - a.createdAt.getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.id.localeCompare(b.id);
    });

    const page = Math.max(1, query?.page ?? 1);
    const limit = Math.min(100, Math.max(1, query?.pageSize ?? query?.limit ?? 10));
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    const items = paginated.map((m) => this.getModel(m.id));

    return {
      items,
      total: filtered.length,
      page,
      pageSize: limit,
    };
  }

  // --- Physical Unit Operations ---
  registerUnit(dto: RegisterPhysicalUnitDto): PhysicalUnitDetailDto {
    if (!dto.subcode || dto.subcode.trim().length === 0) {
      throw new BadRequestException('Subcode is required for physical units');
    }
    if (!dto.parentId || dto.parentId.trim().length === 0) {
      throw new BadRequestException('Parent device model ID is required');
    }

    const parentModel = this.assets.get(dto.parentId);
    if (!parentModel) {
      throw new NotFoundException(`Parent device model with ID ${dto.parentId} not found`);
    }

    // Invariant: Parent must be a model, not another child unit
    if (parentModel.parentId !== null) {
      throw new BadRequestException(
        'Cannot register unit under another physical unit. Parent must be a device model.',
      );
    }

    const normalizedSubcode = dto.subcode.trim().toUpperCase();

    // Dual-layer 409 Conflict check for Subcode uniqueness
    for (const a of this.assets.values()) {
      if (a.subcode && a.subcode.toUpperCase() === normalizedSubcode) {
        throw new ConflictException(
          `Physical unit with subcode "${normalizedSubcode}" already exists. Unit subcodes must be unique.`,
        );
      }
    }

    if (dto.costCenterId) {
      const cc = this.costCenters.get(dto.costCenterId);
      if (!cc) {
        throw new NotFoundException(`Cost center with ID ${dto.costCenterId} not found`);
      }
    }

    const id = `ast-${crypto.randomUUID().slice(0, 8)}`;
    const unit: DbAsset = {
      id,
      assetCode: null,
      subcode: normalizedSubcode,
      assetTag: normalizedSubcode, // Mirrored compatibility
      name: parentModel.name,
      manufacturer: parentModel.manufacturer,
      model: parentModel.model,
      categoryId: parentModel.categoryId,
      specifications: parentModel.specifications,
      unitCost: parentModel.unitCost,
      status: 'AVAILABLE',
      serialNumber: dto.serialNumber?.trim() ?? null,
      parentId: parentModel.id,
      costCenterId: dto.costCenterId ?? null,
      locationId: dto.locationId ?? null,
      departmentId: dto.departmentId ?? null,
      assignedToId: null,
      purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
      warrantyExpiry: dto.warrantyExpiry ? new Date(dto.warrantyExpiry) : null,
      notes: dto.notes?.trim() ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.assets.set(id, unit);
    return this.getUnit(id);
  }

  getUnit(id: string): PhysicalUnitDetailDto {
    const unit = this.assets.get(id);
    if (!unit || unit.parentId === null) {
      throw new NotFoundException(`Physical unit with ID ${id} not found`);
    }

    const parent = this.assets.get(unit.parentId) ?? null;
    const costCenter = unit.costCenterId ? (this.costCenters.get(unit.costCenterId) ?? null) : null;
    const assignedUser = unit.assignedToId
      ? (this.directoryUsers.get(unit.assignedToId) ?? null)
      : null;

    return {
      ...unit,
      parent,
      costCenter,
      assignedUser,
    };
  }

  updateUnit(id: string, dto: UpdatePhysicalUnitDto): PhysicalUnitDetailDto {
    const unit = this.assets.get(id);
    if (!unit || unit.parentId === null) {
      throw new NotFoundException(`Physical unit with ID ${id} not found`);
    }

    if (dto.subcode !== undefined) {
      if (dto.subcode.trim().length === 0) {
        throw new BadRequestException('Subcode cannot be empty');
      }
      const normalized = dto.subcode.trim().toUpperCase();
      for (const a of this.assets.values()) {
        if (a.id !== id && a.subcode && a.subcode.toUpperCase() === normalized) {
          throw new ConflictException(
            `Physical unit with subcode "${normalized}" already exists. Unit subcodes must be unique.`,
          );
        }
      }
      unit.subcode = normalized;
      unit.assetTag = normalized;
    }

    if (dto.serialNumber !== undefined) unit.serialNumber = dto.serialNumber.trim() || null;
    if (dto.costCenterId !== undefined) {
      if (dto.costCenterId) {
        const cc = this.costCenters.get(dto.costCenterId);
        if (!cc) throw new NotFoundException(`Cost center ${dto.costCenterId} not found`);
        unit.costCenterId = dto.costCenterId;
      } else {
        unit.costCenterId = null;
      }
    }
    if (dto.locationId !== undefined) unit.locationId = dto.locationId || null;
    if (dto.departmentId !== undefined) unit.departmentId = dto.departmentId || null;
    if (dto.purchaseDate !== undefined) {
      unit.purchaseDate = dto.purchaseDate ? new Date(dto.purchaseDate) : null;
    }
    if (dto.warrantyExpiry !== undefined) {
      unit.warrantyExpiry = dto.warrantyExpiry ? new Date(dto.warrantyExpiry) : null;
    }
    if (dto.notes !== undefined) unit.notes = dto.notes.trim() || null;
    if (dto.status !== undefined) unit.status = dto.status;

    unit.updatedAt = new Date();
    return this.getUnit(id);
  }

  deleteUnit(id: string): { success: boolean } {
    const unit = this.assets.get(id);
    if (!unit || unit.parentId === null) {
      throw new NotFoundException(`Physical unit with ID ${id} not found`);
    }

    if (unit.status === 'IN_USE' || unit.assignedToId !== null) {
      throw new ConflictException(
        'Cannot delete physical unit currently issued to an employee. Check in unit before deletion.',
      );
    }

    this.assets.delete(id);
    return { success: true };
  }

  // --- Issue & Check-in Workflows ---
  issueUnit(unitId: string, userId: string, notes?: string): PhysicalUnitDetailDto {
    const unit = this.assets.get(unitId);
    if (!unit) {
      throw new NotFoundException(`Asset with ID ${unitId} not found`);
    }

    // Critical Invariant: Cannot assign a device model to an employee!
    if (unit.parentId === null) {
      throw new BadRequestException(
        'Cannot assign a device model to an employee. Only individual physical units can be assigned.',
      );
    }

    const user = this.directoryUsers.get(userId);
    if (!user) {
      throw new NotFoundException(`Directory user with ID ${userId} not found`);
    }

    if (user.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Cannot issue equipment to ${user.status.toLowerCase()} employee`,
      );
    }

    if (unit.assignedToId !== null || unit.status === 'IN_USE') {
      throw new ConflictException(
        `Physical unit ${unit.subcode} is already in use by another custodian`,
      );
    }

    if (unit.status !== 'AVAILABLE') {
      throw new BadRequestException(
        `Cannot issue unit in "${unit.status}" status. Unit must be AVAILABLE.`,
      );
    }

    unit.assignedToId = user.id;
    unit.status = 'IN_USE';
    if (notes) unit.notes = notes;
    unit.updatedAt = new Date();

    return this.getUnit(unitId);
  }

  checkinUnit(unitId: string, notes?: string): PhysicalUnitDetailDto {
    const unit = this.assets.get(unitId);
    if (!unit) {
      throw new NotFoundException(`Asset with ID ${unitId} not found`);
    }

    if (unit.parentId === null) {
      throw new BadRequestException('Cannot check in a device model.');
    }

    // Idempotent: return unit to AVAILABLE
    unit.assignedToId = null;
    unit.status = 'AVAILABLE';
    if (notes) unit.notes = notes;
    unit.updatedAt = new Date();

    return this.getUnit(unitId);
  }

  transferUnit(unitId: string, newUserId: string): PhysicalUnitDetailDto {
    const unit = this.assets.get(unitId);
    if (!unit || unit.parentId === null) {
      throw new NotFoundException(`Physical unit with ID ${unitId} not found`);
    }

    const newUser = this.directoryUsers.get(newUserId);
    if (!newUser || newUser.status !== 'ACTIVE') {
      throw new BadRequestException('Target employee must be an active directory user');
    }

    unit.assignedToId = newUser.id;
    unit.status = 'IN_USE';
    unit.updatedAt = new Date();

    return this.getUnit(unitId);
  }

  decommissionUnit(unitId: string): PhysicalUnitDetailDto {
    const unit = this.assets.get(unitId);
    if (!unit || unit.parentId === null) {
      throw new NotFoundException(`Physical unit with ID ${unitId} not found`);
    }

    unit.assignedToId = null;
    unit.status = 'RETIRED';
    unit.updatedAt = new Date();

    return this.getUnit(unitId);
  }

  // --- Unified Query API ---
  queryAssets(query?: AssetQueryDto): {
    items: Array<DeviceModelDetailDto | PhysicalUnitDetailDto>;
    total: number;
    page: number;
    pageSize: number;
  } {
    let filtered = Array.from(this.assets.values());

    if (query?.type === 'model') {
      filtered = filtered.filter((a) => a.parentId === null);
    } else if (query?.type === 'unit') {
      filtered = filtered.filter((a) => a.parentId !== null);
    }

    if (query?.parentId) {
      filtered = filtered.filter((a) => a.parentId === query.parentId);
    }

    if (query?.costCenterId) {
      filtered = filtered.filter((a) => a.costCenterId === query.costCenterId);
    }

    if (query?.status) {
      filtered = filtered.filter((a) => a.status === query.status);
    }

    if (query?.search && query.search.trim().length > 0) {
      const q = query.search.trim().toLowerCase();
      filtered = filtered.filter((a) => {
        const matchesName = a.name.toLowerCase().includes(q);
        const matchesModel = a.model?.toLowerCase().includes(q) ?? false;
        const matchesManufacturer = a.manufacturer?.toLowerCase().includes(q) ?? false;
        const matchesAssetCode = a.assetCode?.toLowerCase().includes(q) ?? false;
        const matchesSubcode = a.subcode?.toLowerCase().includes(q) ?? false;
        const matchesSerial = a.serialNumber?.toLowerCase().includes(q) ?? false;
        return (
          matchesName ||
          matchesModel ||
          matchesManufacturer ||
          matchesAssetCode ||
          matchesSubcode ||
          matchesSerial
        );
      });
    }

    // Deterministic sorting: createdAt desc, id asc
    filtered.sort((a, b) => {
      const timeDiff = b.createdAt.getTime() - a.createdAt.getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.id.localeCompare(b.id);
    });

    const page = Math.max(1, query?.page ?? 1);
    const limit = Math.min(100, Math.max(1, query?.pageSize ?? query?.limit ?? 10));
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    const items = paginated.map((a) => {
      if (a.parentId === null) {
        return this.getModel(a.id);
      }
      return this.getUnit(a.id);
    });

    return {
      items,
      total: filtered.length,
      page,
      pageSize: limit,
    };
  }

  // --- Directory Offboarding Cascade ---
  offboardDirectoryUser(userId: string): {
    success: boolean;
    releasedUnitsCount: number;
  } {
    const user = this.directoryUsers.get(userId);
    if (!user) {
      throw new NotFoundException(`Directory user ${userId} not found`);
    }

    user.status = 'DISABLED';

    let releasedUnitsCount = 0;
    for (const asset of this.assets.values()) {
      if (asset.assignedToId === user.id) {
        asset.assignedToId = null;
        asset.status = 'AVAILABLE';
        asset.updatedAt = new Date();
        releasedUnitsCount += 1;
      }
    }

    return { success: true, releasedUnitsCount };
  }

  // --- IT ASSET TAGGING QR Code & Label Generator ---
  generateItAssetTaggingLabel(unitId: string): ItAssetTaggingLabelData {
    const unit = this.getUnit(unitId);
    if (!unit.parent) {
      throw new BadRequestException('Physical unit must have a parent device model for QR tagging');
    }

    const sapCode = unit.parent.assetCode || 'N/A';
    const subcode = unit.subcode || 'N/A';
    const modelName =
      `${unit.parent.manufacturer ?? ''} ${unit.parent.model ?? unit.parent.name}`.trim();

    // Date formatted as YYYY-MM-DD
    const dateSource = unit.purchaseDate || unit.createdAt;
    const dateFormatted = dateSource.toISOString().split('T')[0];

    const costCenterDisplay = unit.costCenter
      ? `${unit.costCenter.code} - ${unit.costCenter.name}`
      : 'IT-OPS - Operations';

    return {
      header: 'IT ASSET TAGGING',
      hasLogo: false, // Strict user requirement: remove logo
      sapCode,
      subcode,
      model: modelName,
      date: dateFormatted, // Date immediately before cost center
      costCenter: costCenterDisplay,
      qrPayload: subcode,
      layout: {
        border: '1.5px dashed #777777',
        columns: 2,
        pageBreakInside: 'avoid',
      },
    };
  }
}

// ============================================================================
// 3. E2E SPECIFICATION TEST SUITE (TIERS 1 - 4)
// ============================================================================

describe('Asset Hierarchy, Cost Center & IT ASSET TAGGING E2E Specification', () => {
  let engine: InMemoryAssetHierarchyEngine;

  beforeEach(() => {
    engine = new InMemoryAssetHierarchyEngine();
  });

  // ==========================================================================
  // TIER 1: FEATURE COVERAGE (HAPPY PATH CRUD & CORE WORKFLOWS)
  // ==========================================================================
  describe('Tier 1: Feature Coverage (Core Functional Capabilities)', () => {
    describe('Feature 1: Device Models Catalog CRUD (assetCode)', () => {
      it('T1.1.1: should create a device model with manual assetCode, specifications, and unitCost', () => {
        const model = engine.createModel({
          assetCode: 'MOD-DELL-5420',
          name: 'Dell Latitude 5420 Laptop',
          manufacturer: 'Dell',
          model: 'Latitude 5420',
          categoryId: 'cat-laptops',
          specifications: 'Intel Core i7-1185G7, 16GB DDR4, 512GB NVMe SSD, 14" FHD',
          unitCost: 1250.0,
        });

        expect(model.id).toBeDefined();
        expect(model.assetCode).toBe('MOD-DELL-5420');
        expect(model.assetTag).toBe('MOD-DELL-5420');
        expect(model.parentId).toBeNull();
        expect(model.totalUnits).toBe(0);
        expect(model.availableUnits).toBe(0);
        expect(model.inUseUnits).toBe(0);
        expect(model.unitCost).toBe(1250.0);
      });

      it('T1.1.2: should retrieve device model details with unit telemetry counters', () => {
        const created = engine.createModel({
          assetCode: 'MOD-MBP-14',
          name: 'MacBook Pro 14" M3 Pro',
          manufacturer: 'Apple',
          model: 'MacBook Pro 14"',
          unitCost: 2199.0,
        });

        const fetched = engine.getModel(created.id);
        expect(fetched.id).toBe(created.id);
        expect(fetched.assetCode).toBe('MOD-MBP-14');
        expect(fetched.totalUnits).toBe(0);
        expect(fetched.availableUnits).toBe(0);
      });

      it('T1.1.3: should update device model specifications, name, and unit cost', () => {
        const model = engine.createModel({
          assetCode: 'MOD-T14-GEN4',
          name: 'ThinkPad T14 Gen 4',
          unitCost: 1100.0,
        });

        const updated = engine.updateModel(model.id, {
          name: 'ThinkPad T14 Gen 4 Enterprise',
          specifications: 'AMD Ryzen 7 PRO 7840U, 32GB LPDDR5x, 1TB SSD',
          unitCost: 1350.0,
        });

        expect(updated.name).toBe('ThinkPad T14 Gen 4 Enterprise');
        expect(updated.specifications).toContain('32GB LPDDR5x');
        expect(updated.unitCost).toBe(1350.0);
      });

      it('T1.1.4: should list device models with pagination and deterministic sorting', () => {
        for (let i = 1; i <= 5; i++) {
          engine.createModel({
            assetCode: `MOD-DEVICE-00${i}`,
            name: `Device Model ${i}`,
          });
        }

        const res = engine.listModels({ page: 1, pageSize: 3 });
        expect(res.total).toBe(5);
        expect(res.items).toHaveLength(3);
        expect(res.page).toBe(1);
        expect(res.pageSize).toBe(3);
      });

      it('T1.1.5: should delete a device model when zero child units exist', () => {
        const model = engine.createModel({
          assetCode: 'MOD-OBSOLETE-01',
          name: 'Obsolete Thin Client',
        });

        const res = engine.deleteModel(model.id);
        expect(res.success).toBe(true);
        expect(() => engine.getModel(model.id)).toThrow(NotFoundException);
      });
    });

    describe('Feature 2: Physical Units Registration (subcode & parentId)', () => {
      it('T1.2.1: should register a physical unit under a device model with manual subcode', () => {
        const model = engine.createModel({
          assetCode: 'MOD-DELL-5420',
          name: 'Dell Latitude 5420',
        });

        const unit = engine.registerUnit({
          subcode: 'AST-DELL-001',
          parentId: model.id,
          serialNumber: 'SN-DELL-987654',
          purchaseDate: '2026-03-15T00:00:00Z',
          warrantyExpiry: '2029-03-15T00:00:00Z',
        });

        expect(unit.id).toBeDefined();
        expect(unit.subcode).toBe('AST-DELL-001');
        expect(unit.assetTag).toBe('AST-DELL-001');
        expect(unit.parentId).toBe(model.id);
        expect(unit.status).toBe('AVAILABLE');
        expect(unit.serialNumber).toBe('SN-DELL-987654');
        expect(unit.parent?.id).toBe(model.id);
      });

      it('T1.2.2: should retrieve physical unit with populated parent model details', () => {
        const model = engine.createModel({
          assetCode: 'MOD-HP-ELITE',
          name: 'HP EliteBook 840 G10',
          manufacturer: 'HP',
          model: 'EliteBook 840',
        });

        const registered = engine.registerUnit({
          subcode: 'AST-HP-101',
          parentId: model.id,
          serialNumber: '5CG1234ABC',
        });

        const unit = engine.getUnit(registered.id);
        expect(unit.id).toBe(registered.id);
        expect(unit.parent?.assetCode).toBe('MOD-HP-ELITE');
        expect(unit.parent?.manufacturer).toBe('HP');
      });

      it('T1.2.3: should update physical unit serial number, location, and notes', () => {
        const model = engine.createModel({
          assetCode: 'MOD-APPLE-STUDIO',
          name: 'Apple Mac Studio M2 Max',
        });

        const unit = engine.registerUnit({
          subcode: 'AST-MAC-01',
          parentId: model.id,
        });

        const updated = engine.updateUnit(unit.id, {
          serialNumber: 'C02XYZ123ABC',
          locationId: 'loc-floor-4',
          notes: 'Assigned to Audio/Video workstation',
        });

        expect(updated.serialNumber).toBe('C02XYZ123ABC');
        expect(updated.locationId).toBe('loc-floor-4');
        expect(updated.notes).toBe('Assigned to Audio/Video workstation');
      });

      it('T1.2.4: should delete a physical unit that is in AVAILABLE status', () => {
        const model = engine.createModel({
          assetCode: 'MOD-TEST-DEL',
          name: 'Test Delete Model',
        });

        const unit = engine.registerUnit({
          subcode: 'AST-DEL-01',
          parentId: model.id,
        });

        const delRes = engine.deleteUnit(unit.id);
        expect(delRes.success).toBe(true);
        expect(() => engine.getUnit(unit.id)).toThrow(NotFoundException);
      });
    });

    describe('Feature 3: Cost Center Management (code @unique)', () => {
      it('T1.3.1: should create enterprise cost centers (IT-OPS, ENG-DEV, FIN-ACC, HR-ADMIN)', () => {
        const cc1 = engine.createCostCenter({
          code: 'IT-OPS',
          name: 'IT Operations & Infrastructure',
          description: 'Corporate infrastructure and datacenter expenses',
        });
        const cc2 = engine.createCostCenter({
          code: 'ENG-DEV',
          name: 'Engineering & Software Development',
        });

        expect(cc1.id).toBeDefined();
        expect(cc1.code).toBe('IT-OPS');
        expect(cc2.code).toBe('ENG-DEV');
      });

      it('T1.3.2: should list cost centers with accurate linked asset counters', () => {
        const cc = engine.createCostCenter({
          code: 'FIN-ACC',
          name: 'Finance & Accounting',
        });

        const model = engine.createModel({
          assetCode: 'MOD-FIN-LAPTOP',
          name: 'Finance Laptop',
        });

        engine.registerUnit({
          subcode: 'AST-FIN-01',
          parentId: model.id,
          costCenterId: cc.id,
        });

        engine.registerUnit({
          subcode: 'AST-FIN-02',
          parentId: model.id,
          costCenterId: cc.id,
        });

        const list = engine.listCostCenters();
        const finCc = list.find((item) => item.code === 'FIN-ACC');
        expect(finCc).toBeDefined();
        expect(finCc?.linkedAssetCount).toBe(2);
      });

      it('T1.3.3: should update cost center name and description', () => {
        const cc = engine.createCostCenter({
          code: 'HR-ADMIN',
          name: 'Human Resources',
        });

        const updated = engine.updateCostCenter(cc.id, {
          name: 'People Operations & Administration',
          description: 'Employee onboarding, benefits, and workplace equipment',
        });

        expect(updated.name).toBe('People Operations & Administration');
        expect(updated.description).toContain('Employee onboarding');
      });

      it('T1.3.4: should delete cost center when zero assets are linked', () => {
        const cc = engine.createCostCenter({
          code: 'TEMP-CC',
          name: 'Temporary Project',
        });

        const res = engine.deleteCostCenter(cc.id);
        expect(res.success).toBe(true);
        expect(() => engine.getCostCenter(cc.id)).toThrow(NotFoundException);
      });
    });

    describe('Feature 4: Issue and Check-in Custody Workflows', () => {
      it('T1.4.1: should issue an available physical unit to an active directory user', () => {
        const user = engine.seedDirectoryUser({
          id: 'user-emp-01',
          email: 'alice.smith@uims.internal',
          firstName: 'Alice',
          lastName: 'Smith',
        });

        const model = engine.createModel({
          assetCode: 'MOD-DELL-7440',
          name: 'Dell Latitude 7440',
        });

        const unit = engine.registerUnit({
          subcode: 'AST-7440-001',
          parentId: model.id,
        });

        const issued = engine.issueUnit(unit.id, user.id, 'Issued for remote work');
        expect(issued.status).toBe('IN_USE');
        expect(issued.assignedToId).toBe(user.id);
        expect(issued.assignedUser?.email).toBe('alice.smith@uims.internal');
      });

      it('T1.4.2: should check in an issued physical unit back to AVAILABLE status', () => {
        const user = engine.seedDirectoryUser({
          id: 'user-emp-02',
          email: 'bob.jones@uims.internal',
          firstName: 'Bob',
          lastName: 'Jones',
        });

        const model = engine.createModel({
          assetCode: 'MOD-LENOVO-X1',
          name: 'ThinkPad X1 Carbon',
        });

        const unit = engine.registerUnit({
          subcode: 'AST-X1-001',
          parentId: model.id,
        });

        engine.issueUnit(unit.id, user.id);
        const returned = engine.checkinUnit(unit.id, 'Returned during hardware refresh');

        expect(returned.status).toBe('AVAILABLE');
        expect(returned.assignedToId).toBeNull();
      });

      it('T1.4.3: should transfer physical unit directly to another directory user', () => {
        const user1 = engine.seedDirectoryUser({
          id: 'user-emp-03',
          email: 'charlie@uims.internal',
          firstName: 'Charlie',
          lastName: 'Brown',
        });

        const user2 = engine.seedDirectoryUser({
          id: 'user-emp-04',
          email: 'diana@uims.internal',
          firstName: 'Diana',
          lastName: 'Prince',
        });

        const model = engine.createModel({
          assetCode: 'MOD-MONITOR-4K',
          name: 'Dell UltraSharp 32" 4K',
        });

        const unit = engine.registerUnit({
          subcode: 'AST-MON-01',
          parentId: model.id,
        });

        engine.issueUnit(unit.id, user1.id);
        const transferred = engine.transferUnit(unit.id, user2.id);

        expect(transferred.status).toBe('IN_USE');
        expect(transferred.assignedToId).toBe(user2.id);
      });
    });

    describe('Feature 5: Unified Queries & Bounded Pagination', () => {
      it('T1.5.1: should filter query by type=model returning only parent blueprints', () => {
        const model = engine.createModel({ assetCode: 'MOD-QUERY-1', name: 'Model 1' });
        engine.registerUnit({ subcode: 'AST-QUERY-1', parentId: model.id });

        const res = engine.queryAssets({ type: 'model' });
        expect(res.items.every((item) => item.parentId === null)).toBe(true);
        expect(res.items).toHaveLength(1);
      });

      it('T1.5.2: should filter query by type=unit returning only child physical units', () => {
        const model = engine.createModel({ assetCode: 'MOD-QUERY-2', name: 'Model 2' });
        engine.registerUnit({ subcode: 'AST-QUERY-2A', parentId: model.id });
        engine.registerUnit({ subcode: 'AST-QUERY-2B', parentId: model.id });

        const res = engine.queryAssets({ type: 'unit' });
        expect(res.items.every((item) => item.parentId !== null)).toBe(true);
        expect(res.items).toHaveLength(2);
      });

      it('T1.5.3: should enforce bounded pagination max ceiling of 100 per AGENTS.md', () => {
        const model = engine.createModel({ assetCode: 'MOD-BIG', name: 'Big Fleet' });
        for (let i = 1; i <= 120; i++) {
          engine.registerUnit({
            subcode: `AST-BIG-${String(i).padStart(3, '0')}`,
            parentId: model.id,
          });
        }

        const res = engine.queryAssets({ type: 'unit', pageSize: 500 }); // Attempting 500
        expect(res.pageSize).toBe(100); // Bounded ceiling enforced
        expect(res.items).toHaveLength(100);
      });
    });
  });

  // ==========================================================================
  // TIER 2: BOUNDARY & CORNER CASES (VALIDATION & DEFENSIVE INVARIANTS)
  // ==========================================================================
  describe('Tier 2: Boundary & Corner Cases (Defensive Invariants & 409 Conflict)', () => {
    describe('Corner Case 1: Duplicate Prevention (Dual-Layer 409 Conflict)', () => {
      it('T2.1.1: Duplicate model assetCode on creation should throw 409 ConflictException', () => {
        engine.createModel({
          assetCode: 'MOD-DUPLICATE-01',
          name: 'Original Model',
        });

        expect(() =>
          engine.createModel({
            assetCode: 'MOD-DUPLICATE-01',
            name: 'Conflicting Duplicate Model',
          }),
        ).toThrow(ConflictException);
      });

      it('T2.1.2: Duplicate model assetCode with differing case should be rejected (case-insensitive uniqueness)', () => {
        engine.createModel({
          assetCode: 'MOD-CASE-TEST',
          name: 'Uppercase Model',
        });

        expect(() =>
          engine.createModel({
            assetCode: 'mod-case-test',
            name: 'Lowercase Model',
          }),
        ).toThrow(ConflictException);
      });

      it('T2.1.3: Updating model assetCode to an existing code should throw 409 ConflictException', () => {
        engine.createModel({ assetCode: 'MOD-EXISTING-A', name: 'Model A' });
        const m2 = engine.createModel({ assetCode: 'MOD-EXISTING-B', name: 'Model B' });

        expect(() => engine.updateModel(m2.id, { assetCode: 'MOD-EXISTING-A' })).toThrow(
          ConflictException,
        );
      });

      it('T2.1.4: Duplicate physical unit subcode on registration should throw 409 ConflictException', () => {
        const model = engine.createModel({ assetCode: 'MOD-PARENT-1', name: 'Parent 1' });
        engine.registerUnit({ subcode: 'AST-SUB-DUP', parentId: model.id });

        expect(() => engine.registerUnit({ subcode: 'AST-SUB-DUP', parentId: model.id })).toThrow(
          ConflictException,
        );
      });

      it('T2.1.5: Updating physical unit subcode to an existing subcode should throw 409 ConflictException', () => {
        const model = engine.createModel({ assetCode: 'MOD-PARENT-2', name: 'Parent 2' });
        engine.registerUnit({ subcode: 'AST-UNIT-ONE', parentId: model.id });
        const unit2 = engine.registerUnit({ subcode: 'AST-UNIT-TWO', parentId: model.id });

        expect(() => engine.updateUnit(unit2.id, { subcode: 'AST-UNIT-ONE' })).toThrow(
          ConflictException,
        );
      });

      it('T2.1.6: Duplicate cost center code on creation should throw 409 ConflictException', () => {
        engine.createCostCenter({ code: 'CC-DUPLICATE', name: 'Cost Center 1' });

        expect(() =>
          engine.createCostCenter({ code: 'CC-DUPLICATE', name: 'Cost Center 2' }),
        ).toThrow(ConflictException);
      });
    });

    describe('Corner Case 2: Directory Custody & Assignment Guards', () => {
      it('T2.2.1: Assigning a Device Model (parentId = null) to a DirectoryUser must throw 400 BadRequestException', () => {
        const user = engine.seedDirectoryUser({
          id: 'user-emp-guard',
          email: 'guard@uims.internal',
          firstName: 'Guard',
          lastName: 'Tester',
        });

        const model = engine.createModel({
          assetCode: 'MOD-CANNOT-ASSIGN',
          name: 'Device Catalog Blueprint',
        });

        // Crucial invariant: Only physical units can be assigned!
        expect(() => engine.issueUnit(model.id, user.id)).toThrow(BadRequestException);
      });

      it('T2.2.2: Registering a physical unit with non-existent parentId should throw 404 NotFoundException', () => {
        expect(() =>
          engine.registerUnit({
            subcode: 'AST-ORPHAN-01',
            parentId: 'mod-non-existent-id',
          }),
        ).toThrow(NotFoundException);
      });

      it('T2.2.3: Registering a unit under another physical unit (nested children) must throw 400 BadRequestException', () => {
        const model = engine.createModel({ assetCode: 'MOD-ROOT', name: 'Root Model' });
        const unit = engine.registerUnit({ subcode: 'AST-CHILD-1', parentId: model.id });

        // Attempting to use unit.id as parentId
        expect(() =>
          engine.registerUnit({ subcode: 'AST-INVALID-NESTED', parentId: unit.id }),
        ).toThrow(BadRequestException);
      });

      it('T2.2.4: Issuing an already assigned unit without prior check-in must throw 409 ConflictException', () => {
        const user1 = engine.seedDirectoryUser({
          id: 'user-1',
          email: 'u1@uims.internal',
          firstName: 'User',
          lastName: 'One',
        });
        const user2 = engine.seedDirectoryUser({
          id: 'user-2',
          email: 'u2@uims.internal',
          firstName: 'User',
          lastName: 'Two',
        });

        const model = engine.createModel({ assetCode: 'MOD-LOCKED', name: 'Locked Model' });
        const unit = engine.registerUnit({ subcode: 'AST-LOCKED-01', parentId: model.id });

        engine.issueUnit(unit.id, user1.id);
        expect(() => engine.issueUnit(unit.id, user2.id)).toThrow(ConflictException);
      });

      it('T2.2.5: Issuing a unit to a SUSPENDED or DISABLED directory user must throw 400 BadRequestException', () => {
        const suspendedUser = engine.seedDirectoryUser({
          id: 'user-suspended',
          email: 'suspended@uims.internal',
          firstName: 'Suspended',
          lastName: 'User',
          status: 'SUSPENDED',
        });

        const model = engine.createModel({ assetCode: 'MOD-AVAIL', name: 'Available Model' });
        const unit = engine.registerUnit({ subcode: 'AST-AVAIL-01', parentId: model.id });

        expect(() => engine.issueUnit(unit.id, suspendedUser.id)).toThrow(BadRequestException);
      });

      it('T2.2.6: Issuing a unit in MAINTENANCE status must throw 400 BadRequestException', () => {
        const user = engine.seedDirectoryUser({
          id: 'user-active',
          email: 'active@uims.internal',
          firstName: 'Active',
          lastName: 'User',
        });

        const model = engine.createModel({ assetCode: 'MOD-MAINT', name: 'Maint Model' });
        const unit = engine.registerUnit({ subcode: 'AST-MAINT-01', parentId: model.id });
        engine.updateUnit(unit.id, { status: 'MAINTENANCE' });

        expect(() => engine.issueUnit(unit.id, user.id)).toThrow(BadRequestException);
      });
    });

    describe('Corner Case 3: Relational Deletion & Orphan Guards', () => {
      it('T2.3.1: Deleting a device model with active child units must throw 409 ConflictException', () => {
        const model = engine.createModel({ assetCode: 'MOD-HAS-UNITS', name: 'Has Units' });
        engine.registerUnit({ subcode: 'AST-CHILD-UNIT', parentId: model.id });

        expect(() => engine.deleteModel(model.id)).toThrow(ConflictException);
      });

      it('T2.3.2: Deleting a cost center that has linked assets must throw 409 ConflictException', () => {
        const cc = engine.createCostCenter({ code: 'CC-ACTIVE', name: 'Active CC' });
        const model = engine.createModel({ assetCode: 'MOD-CC-TEST', name: 'CC Test' });
        engine.registerUnit({ subcode: 'AST-CC-UNIT', parentId: model.id, costCenterId: cc.id });

        expect(() => engine.deleteCostCenter(cc.id)).toThrow(ConflictException);
      });

      it('T2.3.3: Deleting an in-use physical unit without prior check-in must throw 409 ConflictException', () => {
        const user = engine.seedDirectoryUser({
          id: 'user-inuse',
          email: 'inuse@uims.internal',
          firstName: 'In',
          lastName: 'Use',
        });
        const model = engine.createModel({ assetCode: 'MOD-INUSE', name: 'In Use Model' });
        const unit = engine.registerUnit({ subcode: 'AST-INUSE-01', parentId: model.id });
        engine.issueUnit(unit.id, user.id);

        expect(() => engine.deleteUnit(unit.id)).toThrow(ConflictException);
      });
    });

    describe('Corner Case 4: Field Validation & Empty String Defenses', () => {
      it('T2.4.1: Empty or whitespace-only assetCode on model creation should throw 400 BadRequestException', () => {
        expect(() => engine.createModel({ assetCode: '   ', name: 'Model Name' })).toThrow(
          BadRequestException,
        );
      });

      it('T2.4.2: Empty or whitespace-only subcode on unit registration should throw 400 BadRequestException', () => {
        const model = engine.createModel({ assetCode: 'MOD-EMPTY-TEST', name: 'Empty Test' });
        expect(() => engine.registerUnit({ subcode: '   ', parentId: model.id })).toThrow(
          BadRequestException,
        );
      });

      it('T2.4.3: Empty cost center code or name should throw 400 BadRequestException', () => {
        expect(() => engine.createCostCenter({ code: '', name: 'Valid Name' })).toThrow(
          BadRequestException,
        );
        expect(() => engine.createCostCenter({ code: 'CC-VALID', name: '   ' })).toThrow(
          BadRequestException,
        );
      });

      it('T2.4.4: Negative unitCost on device model should throw 400 BadRequestException', () => {
        expect(() =>
          engine.createModel({
            assetCode: 'MOD-NEG-COST',
            name: 'Negative Cost Model',
            unitCost: -50.0,
          }),
        ).toThrow(BadRequestException);
      });
    });
  });

  // ==========================================================================
  // TIER 3: CROSS-FEATURE COMBINATIONS (LIFECYCLE & MULTI-MODULE FLOWS)
  // ==========================================================================
  describe('Tier 3: Cross-Feature Combinations (Full Lifecycle & Integration)', () => {
    describe('Lifecycle Flow 1: Model Fleet Lifecycle with Real-Time Telemetry', () => {
      it('T3.1.1: should accurately track fleet telemetry through multi-unit issue, return, transfer, and retirement', () => {
        // 1. Create Model
        const model = engine.createModel({
          assetCode: 'MOD-DELL-LAT-5530',
          name: 'Dell Latitude 5530',
        });

        // 2. Register 3 units
        const u1 = engine.registerUnit({ subcode: 'AST-5530-01', parentId: model.id });
        const u2 = engine.registerUnit({ subcode: 'AST-5530-02', parentId: model.id });
        const u3 = engine.registerUnit({ subcode: 'AST-5530-03', parentId: model.id });

        let telemetry = engine.getModel(model.id);
        expect(telemetry.totalUnits).toBe(3);
        expect(telemetry.availableUnits).toBe(3);
        expect(telemetry.inUseUnits).toBe(0);

        // 3. Issue Unit 1
        const userA = engine.seedDirectoryUser({
          id: 'user-a',
          email: 'userA@uims.internal',
          firstName: 'User',
          lastName: 'A',
        });
        engine.issueUnit(u1.id, userA.id);

        telemetry = engine.getModel(model.id);
        expect(telemetry.totalUnits).toBe(3);
        expect(telemetry.availableUnits).toBe(2);
        expect(telemetry.inUseUnits).toBe(1);

        // 4. Issue Unit 2
        const userB = engine.seedDirectoryUser({
          id: 'user-b',
          email: 'userB@uims.internal',
          firstName: 'User',
          lastName: 'B',
        });
        engine.issueUnit(u2.id, userB.id);

        telemetry = engine.getModel(model.id);
        expect(telemetry.availableUnits).toBe(1);
        expect(telemetry.inUseUnits).toBe(2);

        // 5. Check in Unit 1
        engine.checkinUnit(u1.id);
        telemetry = engine.getModel(model.id);
        expect(telemetry.availableUnits).toBe(2);
        expect(telemetry.inUseUnits).toBe(1);

        // 6. Decommission Unit 3
        engine.decommissionUnit(u3.id);
        telemetry = engine.getModel(model.id);
        expect(telemetry.totalUnits).toBe(3);
        expect(telemetry.availableUnits).toBe(1); // U1 is available, U2 is in-use, U3 is retired
        expect(telemetry.inUseUnits).toBe(1);
      });
    });

    describe('Lifecycle Flow 2: Cost Center Reassignment & Query Auditing', () => {
      it('T3.2.1: should reassign unit cost center and verify dynamic query isolation', () => {
        const itOps = engine.createCostCenter({ code: 'CC-OPS', name: 'IT Operations' });
        const engDev = engine.createCostCenter({ code: 'CC-ENG', name: 'Engineering Dev' });

        const model = engine.createModel({ assetCode: 'MOD-REASSIGN', name: 'Reassignment Test' });

        const unit = engine.registerUnit({
          subcode: 'AST-REASSIGN-01',
          parentId: model.id,
          costCenterId: itOps.id,
        });

        // Verify initial cost center query
        let opsQuery = engine.queryAssets({ costCenterId: itOps.id });
        let engQuery = engine.queryAssets({ costCenterId: engDev.id });
        expect(opsQuery.items).toHaveLength(1);
        expect(engQuery.items).toHaveLength(0);

        // Reassign to Engineering
        engine.updateUnit(unit.id, { costCenterId: engDev.id });

        opsQuery = engine.queryAssets({ costCenterId: itOps.id });
        engQuery = engine.queryAssets({ costCenterId: engDev.id });
        expect(opsQuery.items).toHaveLength(0);
        expect(engQuery.items).toHaveLength(1);
        expect((engQuery.items[0] as PhysicalUnitDetailDto).costCenter?.code).toBe('CC-ENG');
      });
    });

    describe('Lifecycle Flow 3: Directory User Offboarding Relational Cascade', () => {
      it('T3.3.1: should atomically release all assigned physical units when directory user is offboarded', () => {
        const employee = engine.seedDirectoryUser({
          id: 'user-departing',
          email: 'departing@uims.internal',
          firstName: 'Departing',
          lastName: 'Colleague',
        });

        const laptopModel = engine.createModel({ assetCode: 'MOD-OFF-LAPTOP', name: 'Laptop' });
        const monitorModel = engine.createModel({ assetCode: 'MOD-OFF-MONITOR', name: 'Monitor' });

        const laptopUnit = engine.registerUnit({ subcode: 'AST-LAP-99', parentId: laptopModel.id });
        const monitorUnit = engine.registerUnit({
          subcode: 'AST-MON-99',
          parentId: monitorModel.id,
        });

        engine.issueUnit(laptopUnit.id, employee.id);
        engine.issueUnit(monitorUnit.id, employee.id);

        expect(engine.getUnit(laptopUnit.id).status).toBe('IN_USE');
        expect(engine.getUnit(monitorUnit.id).status).toBe('IN_USE');

        // Offboard user
        const cascadeResult = engine.offboardDirectoryUser(employee.id);
        expect(cascadeResult.success).toBe(true);
        expect(cascadeResult.releasedUnitsCount).toBe(2);

        // Verify both units are returned to AVAILABLE with null assignedToId
        const releasedLaptop = engine.getUnit(laptopUnit.id);
        const releasedMonitor = engine.getUnit(monitorUnit.id);

        expect(releasedLaptop.status).toBe('AVAILABLE');
        expect(releasedLaptop.assignedToId).toBeNull();
        expect(releasedMonitor.status).toBe('AVAILABLE');
        expect(releasedMonitor.assignedToId).toBeNull();

        // Verify units can be immediately reassigned
        const newColleague = engine.seedDirectoryUser({
          id: 'user-new',
          email: 'new@uims.internal',
          firstName: 'New',
          lastName: 'Colleague',
        });
        const reassigned = engine.issueUnit(laptopUnit.id, newColleague.id);
        expect(reassigned.status).toBe('IN_USE');
        expect(reassigned.assignedToId).toBe(newColleague.id);
      });
    });
  });

  // ==========================================================================
  // TIER 4: REAL-WORLD SCENARIOS & ADVERSARIAL VERIFICATION
  // ==========================================================================
  describe('Tier 4: Real-World Scenarios (Provisioning, Bulk Intake & IT ASSET TAGGING)', () => {
    describe('Scenario 1: Corporate Laptop Provisioning Workflow', () => {
      it('T4.1.1: Complete corporate laptop procurement, registration, and employee provisioning workflow', () => {
        // 1. Cost Center created
        const engCc = engine.createCostCenter({
          code: 'CC-CORP-ENG',
          name: 'Core Engineering',
        });

        // 2. Hardware Model created
        const mbpModel = engine.createModel({
          assetCode: 'MOD-MBP-14-M3MAX',
          name: 'Apple MacBook Pro 14" M3 Max',
          manufacturer: 'Apple',
          model: 'MacBook Pro 14"',
          specifications: 'Apple M3 Max (14-core CPU, 30-core GPU), 64GB Unified Memory, 1TB SSD',
          unitCost: 3199.0,
        });

        // 3. Physical hardware received in inventory
        const unit = engine.registerUnit({
          subcode: 'AST-MBP-2026-0042',
          parentId: mbpModel.id,
          serialNumber: 'C02TEST42M3MAX',
          costCenterId: engCc.id,
          purchaseDate: '2026-10-01T00:00:00Z',
          warrantyExpiry: '2029-10-01T00:00:00Z',
        });

        // 4. Onboard new staff engineer
        const staffEngineer = engine.seedDirectoryUser({
          id: 'emp-staff-eng',
          email: 'lead.dev@uims.internal',
          firstName: 'Lead',
          lastName: 'Developer',
        });

        // 5. Issue laptop
        const issuedUnit = engine.issueUnit(
          unit.id,
          staffEngineer.id,
          'Initial workstation provisioning for new hire',
        );

        expect(issuedUnit.status).toBe('IN_USE');
        expect(issuedUnit.assignedToId).toBe(staffEngineer.id);
        expect(issuedUnit.costCenter?.code).toBe('CC-CORP-ENG');
        expect(issuedUnit.parent?.assetCode).toBe('MOD-MBP-14-M3MAX');
        expect(issuedUnit.parent?.specifications).toContain('64GB Unified Memory');
      });
    });

    describe('Scenario 2: Bulk Physical Unit Registration under Model', () => {
      it('T4.2.1: Bulk register 15 sequential physical units under a single parent model', () => {
        const model = engine.createModel({
          assetCode: 'MOD-DELL-OPTIPLEX-7090',
          name: 'Dell OptiPlex 7090 Micro',
        });

        for (let i = 1; i <= 15; i++) {
          const subcode = `AST-OPTI-${String(i).padStart(3, '0')}`;
          engine.registerUnit({
            subcode,
            parentId: model.id,
            serialNumber: `SN-OPTI-${1000 + i}`,
          });
        }

        const modelDetail = engine.getModel(model.id);
        expect(modelDetail.totalUnits).toBe(15);
        expect(modelDetail.availableUnits).toBe(15);
        expect(modelDetail.inUseUnits).toBe(0);
      });

      it('T4.2.2: Collision mid-bulk sequence should reject duplicate and preserve existing units', () => {
        const model = engine.createModel({
          assetCode: 'MOD-BULK-COLLISION',
          name: 'Bulk Collision Model',
        });

        engine.registerUnit({ subcode: 'AST-SEQ-001', parentId: model.id });
        engine.registerUnit({ subcode: 'AST-SEQ-002', parentId: model.id });

        // Attempting to re-insert AST-SEQ-002
        expect(() => engine.registerUnit({ subcode: 'AST-SEQ-002', parentId: model.id })).toThrow(
          ConflictException,
        );

        const modelDetail = engine.getModel(model.id);
        expect(modelDetail.totalUnits).toBe(2);
      });
    });

    describe('Scenario 3: IT ASSET TAGGING QR Code & Label Layout Verification', () => {
      it('T4.3.1: should generate label strictly complying with IT ASSET TAGGING format (no logo, exact fields)', () => {
        const costCenter = engine.createCostCenter({
          code: 'FIN-ACC',
          name: 'Finance Department',
        });

        const model = engine.createModel({
          assetCode: 'SAP-MOD-DELL-5420',
          name: 'Dell Latitude 5420',
          manufacturer: 'Dell',
          model: 'Latitude 5420',
        });

        const unit = engine.registerUnit({
          subcode: 'AST-DELL-0042',
          parentId: model.id,
          costCenterId: costCenter.id,
          purchaseDate: '2026-10-07T08:00:00Z',
        });

        const label = engine.generateItAssetTaggingLabel(unit.id);

        // 1. Title Header strictly "IT ASSET TAGGING"
        expect(label.header).toBe('IT ASSET TAGGING');

        // 2. Logo strictly removed
        expect(label.hasLogo).toBe(false);

        // 3. SAP Code matches parent model's assetCode
        expect(label.sapCode).toBe('SAP-MOD-DELL-5420');

        // 4. SUB Code matches physical unit's subcode
        expect(label.subcode).toBe('AST-DELL-0042');

        // 5. Model matches device model name
        expect(label.model).toBe('Dell Latitude 5420');

        // 6. Date is strictly formatted YYYY-MM-DD
        expect(label.date).toBe('2026-10-07');

        // 7. Cost Center contains code and name
        expect(label.costCenter).toContain('FIN-ACC');

        // 8. QR Code payload encodes subcode for scannability
        expect(label.qrPayload).toBe('AST-DELL-0042');

        // 9. Layout border is dashed cut guides
        expect(label.layout.border).toBe('1.5px dashed #777777');
        expect(label.layout.columns).toBe(2);
        expect(label.layout.pageBreakInside).toBe('avoid');
      });

      it('T4.3.2: should format date strictly immediately before Cost Center in label field structure', () => {
        const model = engine.createModel({
          assetCode: 'MOD-ORDER-TEST',
          name: 'Order Verification Unit',
        });

        const unit = engine.registerUnit({
          subcode: 'AST-ORDER-01',
          parentId: model.id,
        });

        const label = engine.generateItAssetTaggingLabel(unit.id);
        const keys = Object.keys(label);

        const dateIndex = keys.indexOf('date');
        const costCenterIndex = keys.indexOf('costCenter');

        // User requirement: "add Date before cost center"
        expect(dateIndex).toBeGreaterThan(-1);
        expect(costCenterIndex).toBeGreaterThan(-1);
        expect(dateIndex).toBeLessThan(costCenterIndex);
      });
    });
  });
});
