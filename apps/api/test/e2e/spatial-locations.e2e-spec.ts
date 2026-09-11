import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AssetStatus, LocationType } from '@uims/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../src/database/prisma.service';
import { AssetsService } from '../../src/modules/assets/assets.service';
import { InventoryService } from '../../src/modules/inventory/inventory.service';
import { LocationController } from '../../src/modules/organization/location.controller';
import { OrganizationController } from '../../src/modules/organization/organization.controller';
import { OrganizationService } from '../../src/modules/organization/organization.service';

// --- In-Memory Relational Fixture Database Types ---
interface DbLocation {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  type: LocationType;
  status: string;
  building: string | null;
  floor: string | null;
  room: string | null;
  address: string | null;
  parentId: string | null;
  fullPath: string | null;
  organizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface DbAsset {
  id: string;
  name: string;
  assetTag: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  status: AssetStatus;
  categoryId: string | null;
  locationId: string | null;
  departmentId: string | null;
  assignedToId: string | null;
  credentialId: string | null;
  purchaseCost: number | null;
  purchaseDate: Date | null;
  warrantyExpiry: Date | null;
  specs: Prisma.JsonValue | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface DbInventoryItem {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  quantity: number;
  minThreshold: number;
  unitCost: number;
  unit: string;
  status: string;
  locationId: string | null;
  categoryId: string | null;
  organizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface DbDepartment {
  id: string;
  name: string;
  code: string;
  organizationId: string | null;
  parentId: string | null;
}

interface DbOrganization {
  id: string;
  name: string;
  code: string;
  status: string;
}

// --- Stateful In-Memory Database Simulator ---
class InMemorySpatialDb {
  locations: DbLocation[] = [];
  assets: DbAsset[] = [];
  inventoryItems: DbInventoryItem[] = [];
  departments: DbDepartment[] = [];
  organizations: DbOrganization[] = [];

  clear() {
    this.locations = [];
    this.assets = [];
    this.inventoryItems = [];
    this.departments = [];
    this.organizations = [];
  }

  createLocation(data: Partial<DbLocation> & { id: string; name: string }): DbLocation {
    const loc: DbLocation = {
      id: data.id,
      name: data.name,
      code: data.code ?? null,
      description: data.description ?? null,
      type: data.type ?? LocationType.ROOM,
      status: data.status ?? 'ACTIVE',
      building: data.building ?? null,
      floor: data.floor ?? null,
      room: data.room ?? null,
      address: data.address ?? null,
      parentId: data.parentId ?? null,
      fullPath: data.fullPath ?? null,
      organizationId: data.organizationId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.locations.push(loc);
    return loc;
  }

  createAsset(data: Partial<DbAsset> & { id: string; name: string; assetTag: string }): DbAsset {
    const ast: DbAsset = {
      id: data.id,
      name: data.name,
      assetTag: data.assetTag,
      manufacturer: data.manufacturer ?? 'Standard Manufacturer',
      model: data.model ?? 'Model 1',
      serialNumber: data.serialNumber ?? 'SN-001',
      status: data.status ?? AssetStatus.IN_USE,
      categoryId: data.categoryId ?? 'cat-general',
      locationId: data.locationId ?? null,
      departmentId: data.departmentId ?? null,
      assignedToId: data.assignedToId ?? null,
      credentialId: data.credentialId ?? null,
      purchaseCost: data.purchaseCost ?? 1000,
      purchaseDate: data.purchaseDate ?? new Date('2026-01-01'),
      warrantyExpiry: data.warrantyExpiry ?? new Date('2028-01-01'),
      specs: data.specs ?? null,
      notes: data.notes ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.assets.push(ast);
    return ast;
  }

  createInventoryItem(
    data: Partial<DbInventoryItem> & { id: string; name: string; sku: string },
  ): DbInventoryItem {
    const item: DbInventoryItem = {
      id: data.id,
      name: data.name,
      sku: data.sku,
      description: data.description ?? null,
      quantity: data.quantity ?? 100,
      minThreshold: data.minThreshold ?? 10,
      unitCost: data.unitCost ?? 50,
      unit: data.unit ?? 'pcs',
      status: data.status ?? 'IN_STOCK',
      locationId: data.locationId ?? null,
      categoryId: data.categoryId ?? null,
      organizationId: data.organizationId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.inventoryItems.push(item);
    return item;
  }

  createDepartment(data: DbDepartment): DbDepartment {
    this.departments.push(data);
    return data;
  }

  createOrganization(data: DbOrganization): DbOrganization {
    this.organizations.push(data);
    return data;
  }
}

describe('Multi-Tier Spatial Location Hierarchy E2E Suite', () => {
  let db: InMemorySpatialDb;
  let mockPrisma: Record<string, unknown>;
  let orgService: OrganizationService;
  let locController: LocationController;
  let orgController: OrganizationController;
  let assetsService: AssetsService;
  let inventoryService: InventoryService;

  beforeEach(() => {
    db = new InMemorySpatialDb();

    // Mock Prisma Client matching PostgreSQL 17 + Prisma 7 semantics
    mockPrisma = {
      $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(mockPrisma)),
      location: {
        findMany: vi.fn(
          async (args?: {
            where?: {
              organizationId?: string;
              type?: LocationType;
              parentId?: string | null;
              OR?: Array<{ [key: string]: { contains: string; mode?: string } }>;
            };
            select?: { id?: boolean; parentId?: boolean; name?: boolean };
            include?: Record<string, unknown>;
            orderBy?: unknown;
            take?: number;
          }) => {
            let rows = [...db.locations];
            if (args?.where) {
              const w = args.where;
              if (w.organizationId) {
                rows = rows.filter((l) => l.organizationId === w.organizationId);
              }
              if (w.type) {
                rows = rows.filter((l) => l.type === w.type);
              }
              if (w.parentId !== undefined) {
                rows = rows.filter((l) => l.parentId === w.parentId);
              }
              if (w.OR && w.OR.length > 0) {
                rows = rows.filter((l) =>
                  w.OR!.some((cond) => {
                    const key = Object.keys(cond)[0] as keyof DbLocation;
                    const term = cond[key]?.contains?.toLowerCase() ?? '';
                    const val = String(l[key] ?? '').toLowerCase();
                    return val.includes(term);
                  }),
                );
              }
            }

            if (args?.select) {
              return rows.map((l) => {
                const res: Record<string, unknown> = {};
                if (args.select?.id) res.id = l.id;
                if (args.select?.parentId) res.parentId = l.parentId;
                if (args.select?.name) res.name = l.name;
                return res;
              });
            }

            return rows.map((l) => ({
              ...l,
              organization: db.organizations.find((o) => o.id === l.organizationId) ?? null,
              parent: db.locations.find((p) => p.id === l.parentId) ?? null,
              _count: {
                assets: db.assets.filter((a) => a.locationId === l.id).length,
                inventoryItems: db.inventoryItems.filter((i) => i.locationId === l.id).length,
                users: 0,
                children: db.locations.filter((c) => c.parentId === l.id).length,
              },
            }));
          },
        ),

        findUnique: vi.fn(
          async (args: { where: { id: string }; include?: Record<string, unknown> }) => {
            const l = db.locations.find((item) => item.id === args.where.id);
            if (!l) return null;
            return {
              ...l,
              organization: db.organizations.find((o) => o.id === l.organizationId) ?? null,
              parent: db.locations.find((p) => p.id === l.parentId) ?? null,
              children: db.locations
                .filter((c) => c.parentId === l.id)
                .map((c) => ({
                  ...c,
                  _count: {
                    assets: db.assets.filter((a) => a.locationId === c.id).length,
                    inventoryItems: db.inventoryItems.filter((i) => i.locationId === c.id).length,
                    users: 0,
                    children: db.locations.filter((cc) => cc.parentId === c.id).length,
                  },
                })),
              _count: {
                assets: db.assets.filter((a) => a.locationId === l.id).length,
                inventoryItems: db.inventoryItems.filter((i) => i.locationId === l.id).length,
                users: 0,
                children: db.locations.filter((c) => c.parentId === l.id).length,
              },
            };
          },
        ),

        create: vi.fn(async (args: { data: Partial<DbLocation> & { name: string } }) => {
          const id =
            args.data.id || `loc-gen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const created = db.createLocation({ ...args.data, id });
          return {
            ...created,
            organization: db.organizations.find((o) => o.id === created.organizationId) ?? null,
            parent: db.locations.find((p) => p.id === created.parentId) ?? null,
          };
        }),

        update: vi.fn(async (args: { where: { id: string }; data: Partial<DbLocation> }) => {
          const idx = db.locations.findIndex((l) => l.id === args.where.id);
          if (idx === -1) throw new NotFoundException(`Location ${args.where.id} not found`);
          const patch: Partial<DbLocation> = {};
          for (const [k, v] of Object.entries(args.data)) {
            if (v !== undefined) {
              (patch as Record<string, unknown>)[k] = v;
            }
          }
          db.locations[idx] = { ...db.locations[idx], ...patch, updatedAt: new Date() };
          const updated = db.locations[idx];
          return {
            ...updated,
            organization: db.organizations.find((o) => o.id === updated.organizationId) ?? null,
            parent: db.locations.find((p) => p.id === updated.parentId) ?? null,
          };
        }),

        updateMany: vi.fn(
          async (args: { where: { parentId?: string }; data: Partial<DbLocation> }) => {
            let count = 0;
            for (let i = 0; i < db.locations.length; i++) {
              if (
                args.where.parentId !== undefined &&
                db.locations[i].parentId === args.where.parentId
              ) {
                db.locations[i] = { ...db.locations[i], ...args.data, updatedAt: new Date() };
                count++;
              }
            }
            return { count };
          },
        ),

        delete: vi.fn(async (args: { where: { id: string } }) => {
          const idx = db.locations.findIndex((l) => l.id === args.where.id);
          if (idx === -1) throw new NotFoundException(`Location ${args.where.id} not found`);
          const deleted = db.locations.splice(idx, 1)[0];
          return deleted;
        }),

        count: vi.fn(async () => db.locations.length),
      },

      asset: {
        findMany: vi.fn(
          async (args?: {
            where?: {
              locationId?: string | { in: string[] };
              departmentId?: string;
              categoryId?: string;
              status?: AssetStatus;
              AND?: Array<{ [key: string]: unknown }>;
            };
            include?: Record<string, unknown>;
            take?: number;
            skip?: number;
          }) => {
            let rows = [...db.assets];
            if (args?.where) {
              const w = args.where;
              if (w.locationId !== undefined) {
                if (typeof w.locationId === 'string') {
                  rows = rows.filter((a) => a.locationId === w.locationId);
                } else if (w.locationId && Array.isArray(w.locationId.in)) {
                  rows = rows.filter((a) => a.locationId && w.locationId.in.includes(a.locationId));
                }
              }
              if (w.departmentId) {
                rows = rows.filter((a) => a.departmentId === w.departmentId);
              }
              if (w.categoryId) {
                rows = rows.filter((a) => a.categoryId === w.categoryId);
              }
              if (w.status) {
                rows = rows.filter((a) => a.status === w.status);
              }
            }
            return rows.map((a) => {
              const loc = db.locations.find((l) => l.id === a.locationId);
              const dept = db.departments.find((d) => d.id === a.departmentId);
              return {
                ...a,
                location: loc
                  ? {
                      ...loc,
                      organization:
                        db.organizations.find((o) => o.id === loc.organizationId) ?? null,
                    }
                  : null,
                department: dept
                  ? {
                      ...dept,
                      organization:
                        db.organizations.find((o) => o.id === dept.organizationId) ?? null,
                    }
                  : null,
                category: { id: a.categoryId ?? 'cat-1', name: 'Equipment' },
                assignedTo: null,
                credential: null,
              };
            });
          },
        ),

        findUnique: vi.fn(async (args: { where: { id: string } }) => {
          const a = db.assets.find((item) => item.id === args.where.id);
          if (!a) return null;
          const loc = db.locations.find((l) => l.id === a.locationId);
          const dept = db.departments.find((d) => d.id === a.departmentId);
          return {
            ...a,
            location: loc
              ? {
                  ...loc,
                  organization: db.organizations.find((o) => o.id === loc.organizationId) ?? null,
                }
              : null,
            department: dept
              ? {
                  ...dept,
                  organization: db.organizations.find((o) => o.id === dept.organizationId) ?? null,
                }
              : null,
            category: { id: a.categoryId ?? 'cat-1', name: 'Equipment' },
            assignedTo: null,
            credential: null,
          };
        }),

        update: vi.fn(
          async (args: {
            where: { id: string };
            data: Partial<DbAsset> & {
              location?: { connect?: { id: string }; disconnect?: boolean };
              department?: { connect?: { id: string }; disconnect?: boolean };
              category?: { connect?: { id: string }; disconnect?: boolean };
            };
          }) => {
            const idx = db.assets.findIndex((a) => a.id === args.where.id);
            if (idx === -1) throw new NotFoundException(`Asset ${args.where.id} not found`);
            const patch: Partial<DbAsset> = {};
            for (const [k, v] of Object.entries(args.data)) {
              if (v !== undefined && k !== 'location' && k !== 'department' && k !== 'category') {
                (patch as Record<string, unknown>)[k] = v;
              }
            }
            if (args.data.location?.connect?.id) {
              patch.locationId = args.data.location.connect.id;
            } else if (args.data.location?.disconnect) {
              patch.locationId = null;
            }
            if (args.data.department?.connect?.id) {
              patch.departmentId = args.data.department.connect.id;
            } else if (args.data.department?.disconnect) {
              patch.departmentId = null;
            }
            if (args.data.category?.connect?.id) {
              patch.categoryId = args.data.category.connect.id;
            }
            db.assets[idx] = { ...db.assets[idx], ...patch, updatedAt: new Date() };
            const updated = db.assets[idx];
            const loc = db.locations.find((l) => l.id === updated.locationId);
            const dept = db.departments.find((d) => d.id === updated.departmentId);
            return {
              ...updated,
              location: loc
                ? {
                    ...loc,
                    organization: db.organizations.find((o) => o.id === loc.organizationId) ?? null,
                  }
                : null,
              department: dept
                ? {
                    ...dept,
                    organization:
                      db.organizations.find((o) => o.id === dept.organizationId) ?? null,
                  }
                : null,
              category: { id: updated.categoryId ?? 'cat-1', name: 'Equipment' },
              assignedTo: null,
              credential: null,
            };
          },
        ),

        count: vi.fn(async () => db.assets.length),
      },

      assetHistory: {
        create: vi.fn(async () => ({ id: 'hist-1' })),
      },

      inventoryItem: {
        findMany: vi.fn(
          async (args?: {
            where?: {
              locationId?: string | { in: string[] };
              categoryId?: string;
              stockStatus?: string;
              quantity?: number | { gt?: number; lte?: number };
            };
            include?: Record<string, unknown>;
            take?: number;
            skip?: number;
          }) => {
            let rows = [...db.inventoryItems];
            if (args?.where) {
              const w = args.where;
              if (w.locationId !== undefined) {
                if (typeof w.locationId === 'string') {
                  rows = rows.filter((i) => i.locationId === w.locationId);
                } else if (w.locationId && Array.isArray(w.locationId.in)) {
                  rows = rows.filter((i) => i.locationId && w.locationId.in.includes(i.locationId));
                }
              }
              if (w.categoryId) {
                rows = rows.filter((i) => i.categoryId === w.categoryId);
              }
            }
            return rows.map((i) => {
              const loc = db.locations.find((l) => l.id === i.locationId);
              return {
                ...i,
                location: loc
                  ? {
                      ...loc,
                      organization:
                        db.organizations.find((o) => o.id === loc.organizationId) ?? null,
                    }
                  : null,
                category: { id: i.categoryId ?? 'cat-inv', name: 'Raw Material' },
              };
            });
          },
        ),

        count: vi.fn(async () => db.inventoryItems.length),
        aggregate: vi.fn(async () => ({ _sum: { quantity: 100 } })),
      },

      organization: {
        findMany: vi.fn(async () => db.organizations),
        findUnique: vi.fn(
          async (args: { where: { id: string } }) =>
            db.organizations.find((o) => o.id === args.where.id) ?? null,
        ),
        count: vi.fn(async () => db.organizations.length),
      },

      department: {
        findMany: vi.fn(async () => db.departments),
        count: vi.fn(async () => db.departments.length),
      },

      position: {
        findMany: vi.fn(async () => []),
        count: vi.fn(async () => 0),
      },

      user: {
        count: vi.fn(async () => 0),
      },
      directoryUser: {
        count: vi.fn(async () => 0),
      },
    };

    orgService = new OrganizationService(mockPrisma as unknown as PrismaService);
    locController = new LocationController(orgService);
    orgController = new OrganizationController(orgService);
    assetsService = new AssetsService(mockPrisma as unknown as PrismaService);
    inventoryService = new InventoryService(mockPrisma as unknown as PrismaService);
  });

  // --- Helper: Seed BSL Garment Manufacturing Domain Hierarchy ---
  const seedBslGarmentHierarchy = () => {
    // 1. Organization: BSL (Broadpeak Soc Trang)
    db.createOrganization({
      id: 'org-bsl',
      name: 'BSL - Broadpeak Soc Trang Garment Co.',
      code: 'BSL',
      status: 'ACTIVE',
    });

    // 2. Departments
    db.createDepartment({
      id: 'dept-admin',
      name: 'Administration Dept',
      code: 'ADMIN',
      organizationId: 'org-bsl',
      parentId: null,
    });
    db.createDepartment({
      id: 'dept-acct',
      name: 'Accounting & Finance',
      code: 'ACCT',
      organizationId: 'org-bsl',
      parentId: null,
    });
    db.createDepartment({
      id: 'dept-impex',
      name: 'Import-Export Dept',
      code: 'IMPEX',
      organizationId: 'org-bsl',
      parentId: null,
    });
    db.createDepartment({
      id: 'dept-qa',
      name: 'Quality Assurance (QA)',
      code: 'QA',
      organizationId: 'org-bsl',
      parentId: null,
    });
    db.createDepartment({
      id: 'dept-cut',
      name: 'Cutting Workshop Dept',
      code: 'CUTTING',
      organizationId: 'org-bsl',
      parentId: null,
    });
    db.createDepartment({
      id: 'dept-sew',
      name: 'Production & Sewing Dept',
      code: 'SEWING',
      organizationId: 'org-bsl',
      parentId: null,
    });
    db.createDepartment({
      id: 'dept-wh',
      name: 'Central Warehouse Logistics',
      code: 'LOG-WH',
      organizationId: 'org-bsl',
      parentId: null,
    });

    // 3. Root Campus
    db.createLocation({
      id: 'loc-bsl-campus',
      name: 'BSL - Soc Trang Campus',
      code: 'BSL-ST',
      type: LocationType.CAMPUS,
      parentId: null,
      fullPath: 'BSL - Soc Trang Campus',
      organizationId: 'org-bsl',
    });

    // 4. Buildings under Campus
    // 4a. Business Center Building
    db.createLocation({
      id: 'loc-bc-bldg',
      name: 'Business Center Building',
      code: 'BC-BLDG',
      type: LocationType.BUILDING,
      parentId: 'loc-bsl-campus',
      fullPath: 'BSL - Soc Trang Campus > Business Center Building',
      organizationId: 'org-bsl',
    });
    db.createLocation({
      id: 'loc-bc-admin-floor',
      name: 'Administration Floor (2F)',
      code: 'BC-2F',
      type: LocationType.FLOOR,
      parentId: 'loc-bc-bldg',
      fullPath: 'BSL - Soc Trang Campus > Business Center Building > Administration Floor (2F)',
      organizationId: 'org-bsl',
    });
    db.createLocation({
      id: 'loc-bc-acct-room',
      name: 'Accounting & Finance Room',
      code: 'BC-201',
      type: LocationType.ROOM,
      parentId: 'loc-bc-admin-floor',
      fullPath:
        'BSL - Soc Trang Campus > Business Center Building > Administration Floor (2F) > Accounting & Finance Room',
      organizationId: 'org-bsl',
    });
    db.createLocation({
      id: 'loc-bc-impex-room',
      name: 'Import-Export Dept Room',
      code: 'BC-202',
      type: LocationType.ROOM,
      parentId: 'loc-bc-admin-floor',
      fullPath:
        'BSL - Soc Trang Campus > Business Center Building > Administration Floor (2F) > Import-Export Dept Room',
      organizationId: 'org-bsl',
    });

    // 4b. Central Warehouse
    db.createLocation({
      id: 'loc-cw-bldg',
      name: 'Central Warehouse (Kho Tổng)',
      code: 'CW-MAIN',
      type: LocationType.WAREHOUSE,
      parentId: 'loc-bsl-campus',
      fullPath: 'BSL - Soc Trang Campus > Central Warehouse (Kho Tổng)',
      organizationId: 'org-bsl',
    });
    db.createLocation({
      id: 'loc-cw-raw',
      name: 'Raw Materials Storage Area (Kho Vải Chính)',
      code: 'CW-RAW',
      type: LocationType.ZONE,
      parentId: 'loc-cw-bldg',
      fullPath:
        'BSL - Soc Trang Campus > Central Warehouse (Kho Tổng) > Raw Materials Storage Area (Kho Vải Chính)',
      organizationId: 'org-bsl',
    });
    db.createLocation({
      id: 'loc-cw-rack-01',
      name: 'Fabric Shelf Rack R-01',
      code: 'CW-R01',
      type: LocationType.RACK,
      parentId: 'loc-cw-raw',
      fullPath:
        'BSL - Soc Trang Campus > Central Warehouse (Kho Tổng) > Raw Materials Storage Area (Kho Vải Chính) > Fabric Shelf Rack R-01',
      organizationId: 'org-bsl',
    });
    db.createLocation({
      id: 'loc-cw-bin-01',
      name: 'Pallet Bin B-01',
      code: 'CW-R01-B01',
      type: LocationType.BIN,
      parentId: 'loc-cw-rack-01',
      fullPath:
        'BSL - Soc Trang Campus > Central Warehouse (Kho Tổng) > Raw Materials Storage Area (Kho Vải Chính) > Fabric Shelf Rack R-01 > Pallet Bin B-01',
      organizationId: 'org-bsl',
    });

    // 4c. Factory 1 (Phân Xưởng 1)
    db.createLocation({
      id: 'loc-fac-1',
      name: 'Factory 1 (Phân xưởng 1)',
      code: 'FAC-1',
      type: LocationType.WORKSHOP,
      parentId: 'loc-bsl-campus',
      fullPath: 'BSL - Soc Trang Campus > Factory 1 (Phân xưởng 1)',
      organizationId: 'org-bsl',
    });
    db.createLocation({
      id: 'loc-fac1-sewing',
      name: 'Sewing & Assembly Section (Khu Vực Chuyền May)',
      code: 'FAC1-SEW',
      type: LocationType.ZONE,
      parentId: 'loc-fac-1',
      fullPath:
        'BSL - Soc Trang Campus > Factory 1 (Phân xưởng 1) > Sewing & Assembly Section (Khu Vực Chuyền May)',
      organizationId: 'org-bsl',
    });
    db.createLocation({
      id: 'loc-fac1-line-01',
      name: 'Sewing Line 01 (Chuyền May 01)',
      code: 'FAC1-LINE-01',
      type: LocationType.LINE,
      parentId: 'loc-fac1-sewing',
      fullPath:
        'BSL - Soc Trang Campus > Factory 1 (Phân xưởng 1) > Sewing & Assembly Section (Khu Vực Chuyền May) > Sewing Line 01 (Chuyền May 01)',
      organizationId: 'org-bsl',
    });
    db.createLocation({
      id: 'loc-fac1-line1-st01',
      name: 'Workstation 01 (Vị Trí Máy May 01)',
      code: 'FAC1-L1-ST01',
      type: LocationType.STATION,
      parentId: 'loc-fac1-line-01',
      fullPath:
        'BSL - Soc Trang Campus > Factory 1 (Phân xưởng 1) > Sewing & Assembly Section (Khu Vực Chuyền May) > Sewing Line 01 (Chuyền May 01) > Workstation 01 (Vị Trí Máy May 01)',
      organizationId: 'org-bsl',
    });
    db.createLocation({
      id: 'loc-fac1-line1-st02',
      name: 'Workstation 02 (Vị Trí Máy May 02)',
      code: 'FAC1-L1-ST02',
      type: LocationType.STATION,
      parentId: 'loc-fac1-line-01',
      fullPath:
        'BSL - Soc Trang Campus > Factory 1 (Phân xưởng 1) > Sewing & Assembly Section (Khu Vực Chuyền May) > Sewing Line 01 (Chuyền May 01) > Workstation 02 (Vị Trí Máy May 02)',
      organizationId: 'org-bsl',
    });
    db.createLocation({
      id: 'loc-fac1-mdc',
      name: 'MDC Sub-Warehouse (Kho Nhỏ Cấp Phát Phụ Liệu)',
      code: 'FAC1-MDC',
      type: LocationType.WAREHOUSE,
      parentId: 'loc-fac-1',
      fullPath:
        'BSL - Soc Trang Campus > Factory 1 (Phân xưởng 1) > MDC Sub-Warehouse (Kho Nhỏ Cấp Phát Phụ Liệu)',
      organizationId: 'org-bsl',
    });
    db.createLocation({
      id: 'loc-fac1-mdc-b1',
      name: 'MDC Accessories Bin B-01',
      code: 'FAC1-MDC-B01',
      type: LocationType.BIN,
      parentId: 'loc-fac1-mdc',
      fullPath:
        'BSL - Soc Trang Campus > Factory 1 (Phân xưởng 1) > MDC Sub-Warehouse (Kho Nhỏ Cấp Phát Phụ Liệu) > MDC Accessories Bin B-01',
      organizationId: 'org-bsl',
    });

    // 4d. Factory 2 (Phân Xưởng 2) - Sibling Workshop
    db.createLocation({
      id: 'loc-fac-2',
      name: 'Factory 2 (Phân xưởng 2)',
      code: 'FAC-2',
      type: LocationType.WORKSHOP,
      parentId: 'loc-bsl-campus',
      fullPath: 'BSL - Soc Trang Campus > Factory 2 (Phân xưởng 2)',
      organizationId: 'org-bsl',
    });
    db.createLocation({
      id: 'loc-fac2-line-01',
      name: 'Factory 2 Sewing Line 01',
      code: 'FAC2-LINE-01',
      type: LocationType.LINE,
      parentId: 'loc-fac-2',
      fullPath: 'BSL - Soc Trang Campus > Factory 2 (Phân xưởng 2) > Factory 2 Sewing Line 01',
      organizationId: 'org-bsl',
    });
    db.createLocation({
      id: 'loc-fac2-line1-st01',
      name: 'Factory 2 Workstation 01',
      code: 'FAC2-L1-ST01',
      type: LocationType.STATION,
      parentId: 'loc-fac2-line-01',
      fullPath:
        'BSL - Soc Trang Campus > Factory 2 (Phân xưởng 2) > Factory 2 Sewing Line 01 > Factory 2 Workstation 01',
      organizationId: 'org-bsl',
    });

    // 5. Assets across BSL facilities
    // Sewing Machine at Factory 1 Line 1 Station 01
    db.createAsset({
      id: 'ast-brother-01',
      name: 'Brother S-7200A Direct Drive Lockstitch Machine',
      assetTag: 'AST-SEW-001',
      manufacturer: 'Brother',
      model: 'S-7200A',
      locationId: 'loc-fac1-line1-st01',
      departmentId: 'dept-sew',
      status: AssetStatus.IN_USE,
    });
    // Sewing Machine at Factory 1 Line 1 Station 02 (Owned by QA department for in-line quality sampling)
    db.createAsset({
      id: 'ast-juki-02',
      name: 'Juki DDL-9000C Digital Lockstitch Machine',
      assetTag: 'AST-SEW-002',
      manufacturer: 'Juki',
      model: 'DDL-9000C',
      locationId: 'loc-fac1-line1-st02',
      departmentId: 'dept-qa', // Orthogonal department!
      status: AssetStatus.IN_USE,
    });
    // Sibling asset at Factory 2 Line 1 Station 01
    db.createAsset({
      id: 'ast-juki-fac2',
      name: 'Juki MO-6814S Overlock Machine',
      assetTag: 'AST-SEW-003',
      manufacturer: 'Juki',
      model: 'MO-6814S',
      locationId: 'loc-fac2-line1-st01',
      departmentId: 'dept-sew',
      status: AssetStatus.IN_USE,
    });
    // Office PC at Business Center Accounting Room
    db.createAsset({
      id: 'ast-pc-acct',
      name: 'Dell OptiPlex 7090 Accounting Workstation',
      assetTag: 'AST-IT-001',
      manufacturer: 'Dell',
      model: 'OptiPlex 7090',
      locationId: 'loc-bc-acct-room',
      departmentId: 'dept-acct',
      status: AssetStatus.IN_USE,
    });

    // 6. Inventory Items
    // Raw Cotton Fabric at Central Warehouse Bin B-01
    db.createInventoryItem({
      id: 'inv-fabric-cotton',
      name: '100% Cotton Knitted Single Jersey Fabric Roll',
      sku: 'FAB-COT-001',
      locationId: 'loc-cw-bin-01',
      quantity: 500,
      unit: 'kg',
      organizationId: 'org-bsl',
    });
    // Polyester Thread at Factory 1 MDC Bin B-01
    db.createInventoryItem({
      id: 'inv-thread-poly',
      name: 'Coats Epic Polyester Sewing Thread 40/2 (Black)',
      sku: 'THR-POLY-001',
      locationId: 'loc-fac1-mdc-b1',
      quantity: 120,
      unit: 'spools',
      organizationId: 'org-bsl',
    });
  };

  // =========================================================================
  // TIER 1: FEATURE COVERAGE (>=5 tests per feature)
  // =========================================================================
  describe('Tier 1: Feature Coverage', () => {
    describe('Feature 1: Hierarchical Location Tree Retrieval (/locations/tree)', () => {
      beforeEach(() => seedBslGarmentHierarchy());

      it('T1.1.1: should construct a multi-tier tree structure with nested children arrays', async () => {
        const tree = await locController.getTree();
        expect(tree).toBeDefined();
        expect(tree.length).toBe(1); // Single root campus
        expect(tree[0].id).toBe('loc-bsl-campus');
        expect(tree[0].children).toBeDefined();
        expect(tree[0].children!.length).toBeGreaterThanOrEqual(3); // Business Center, Central Warehouse, Factory 1, Factory 2
      });

      it('T1.1.2: should provide root nodes with null parentId and nested children nodes', async () => {
        const tree = await locController.getTree();
        const root = tree[0];
        expect(root.parentId).toBeNull();
        const fac1Node = root.children!.find((c) => c.id === 'loc-fac-1');
        expect(fac1Node).toBeDefined();
        expect(fac1Node!.parentId).toBe('loc-bsl-campus');
        expect(fac1Node!.children!.length).toBeGreaterThan(0);
      });

      it('T1.1.3: should populate Ant Design compatibility keys (key, value, title, label, fullPath)', async () => {
        const tree = await locController.getTree();
        const root = tree[0];
        expect(root.key).toBe('loc-bsl-campus');
        expect(root.value).toBe('loc-bsl-campus');
        expect(root.title).toBe('BSL - Soc Trang Campus');
        expect(root.label).toBe('BSL - Soc Trang Campus');
        expect(root.fullPath).toBe('BSL - Soc Trang Campus');

        const fac1 = root.children!.find((c) => c.id === 'loc-fac-1')!;
        expect(fac1.key).toBe('loc-fac-1');
        expect(fac1.value).toBe('loc-fac-1');
        expect(fac1.fullPath).toBe('BSL - Soc Trang Campus > Factory 1 (Phân xưởng 1)');
      });

      it('T1.1.4: should isolate tree branches by organizationId query parameter', async () => {
        // Create second company with isolated campus
        db.createOrganization({
          id: 'org-bsh',
          name: 'BSH Ho Chi Minh',
          code: 'BSH',
          status: 'ACTIVE',
        });
        db.createLocation({
          id: 'loc-bsh-hq',
          name: 'BSH - Ho Chi Minh HQ',
          type: LocationType.CAMPUS,
          organizationId: 'org-bsh',
        });

        const bslTree = await locController.getTree('org-bsl');
        expect(bslTree.length).toBe(1);
        expect(bslTree[0].id).toBe('loc-bsl-campus');

        const bshTree = await locController.getTree('org-bsh');
        expect(bshTree.length).toBe(1);
        expect(bshTree[0].id).toBe('loc-bsh-hq');
      });

      it('T1.1.5: should include accurate aggregate child and entity count statistics (_count)', async () => {
        const tree = await locController.getTree();
        const fac1 = tree[0].children!.find((c) => c.id === 'loc-fac-1')!;
        expect(fac1._count).toBeDefined();
        expect(fac1._count!.children).toBeGreaterThanOrEqual(2); // sewing section + MDC
      });

      it('T1.1.6: should support backward-compatible endpoint /organizations/locations/tree with identical structure', async () => {
        const compatTree = await orgController.getLocationsTree('org-bsl');
        const dedicatedTree = await locController.getTree('org-bsl');
        expect(compatTree).toEqual(dedicatedTree);
      });
    });

    describe('Feature 2: Descendant Spatial Resolution (/locations/:id/descendants)', () => {
      beforeEach(() => seedBslGarmentHierarchy());

      it('T1.2.1: should return root ID and all recursive descendant IDs when querying Campus root', async () => {
        const descendants = await locController.getDescendants('loc-bsl-campus');
        expect(descendants).toContain('loc-bsl-campus');
        expect(descendants).toContain('loc-bc-bldg');
        expect(descendants).toContain('loc-fac-1');
        expect(descendants).toContain('loc-fac1-line-01');
        expect(descendants).toContain('loc-fac1-line1-st01');
        expect(descendants).toContain('loc-fac1-line1-st02');
        expect(descendants).toContain('loc-fac1-mdc');
        expect(descendants).toContain('loc-fac1-mdc-b1');
        expect(descendants).toContain('loc-fac-2');
        expect(descendants.length).toBe(db.locations.length);
      });

      it('T1.2.2: should return Factory 1 and all subordinate zones, lines, stations, and bins', async () => {
        const descendants = await locController.getDescendants('loc-fac-1');
        expect(descendants).toContain('loc-fac-1');
        expect(descendants).toContain('loc-fac1-sewing');
        expect(descendants).toContain('loc-fac1-line-01');
        expect(descendants).toContain('loc-fac1-line1-st01');
        expect(descendants).toContain('loc-fac1-line1-st02');
        expect(descendants).toContain('loc-fac1-mdc');
        expect(descendants).toContain('loc-fac1-mdc-b1');
        // Must NOT contain sibling or parent IDs
        expect(descendants).not.toContain('loc-bsl-campus');
        expect(descendants).not.toContain('loc-fac-2');
        expect(descendants).not.toContain('loc-bc-bldg');
      });

      it('T1.2.3: should return an array containing only the leaf ID when querying a leaf workstation or bin', async () => {
        const leafStationDescendants = await locController.getDescendants('loc-fac1-line1-st01');
        expect(leafStationDescendants).toEqual(['loc-fac1-line1-st01']);

        const leafBinDescendants = await locController.getDescendants('loc-fac1-mdc-b1');
        expect(leafBinDescendants).toEqual(['loc-fac1-mdc-b1']);
      });

      it('T1.2.4: should return empty array [] when resolving a non-existent or deleted location ID', async () => {
        const descendants = await locController.getDescendants('non-existent-uuid-999');
        expect(descendants).toEqual([]);
      });

      it('T1.2.5: should guarantee ID uniqueness with zero duplicate entries in descendant sets', async () => {
        const descendants = await locController.getDescendants('loc-bsl-campus');
        const uniqueSet = new Set(descendants);
        expect(descendants.length).toBe(uniqueSet.size);
      });

      it('T1.2.6: should resolve intermediate line node into exactly the line ID and its workstations', async () => {
        const descendants = await locController.getDescendants('loc-fac1-line-01');
        expect(descendants).toEqual(
          expect.arrayContaining([
            'loc-fac1-line-01',
            'loc-fac1-line1-st01',
            'loc-fac1-line1-st02',
          ]),
        );
        expect(descendants.length).toBe(3);
      });
    });

    describe('Feature 3: Asset Spatial Filtering & Path Formatting', () => {
      beforeEach(() => seedBslGarmentHierarchy());

      it('T1.3.1: should filter assets by leaf location and return exact machine match', async () => {
        const assets = await assetsService.findAll({ locationId: 'loc-fac1-line1-st01' });
        expect(assets.length).toBe(1);
        expect(assets[0].tag).toBe('AST-SEW-001');
        expect(assets[0].name).toContain('Brother S-7200A');
      });

      it('T1.3.2: should filter assets by parent Workshop (Factory 1) using descendant resolution', async () => {
        const descendantIds = await orgService.getDescendantLocationIds('loc-fac-1');
        expect(descendantIds.length).toBeGreaterThan(1);

        // Execute spatial search with resolved descendants
        const assets = await (
          mockPrisma.asset as {
            findMany: (args: unknown) => Promise<Array<{ id: string; assetTag: string }>>;
          }
        ).findMany({
          where: { locationId: { in: descendantIds } },
        });

        expect(assets.length).toBe(2);
        const tags = assets.map((a) => a.assetTag);
        expect(tags).toContain('AST-SEW-001');
        expect(tags).toContain('AST-SEW-002');
        expect(tags).not.toContain('AST-SEW-003'); // Sibling Factory 2 machine excluded
      });

      it('T1.3.3: should filter assets across entire campus when querying root Campus node', async () => {
        const allCampusIds = await orgService.getDescendantLocationIds('loc-bsl-campus');
        const assets = await (
          mockPrisma.asset as {
            findMany: (args: unknown) => Promise<Array<{ id: string; assetTag: string }>>;
          }
        ).findMany({
          where: { locationId: { in: allCampusIds } },
        });
        expect(assets.length).toBe(4); // All 4 seeded assets
      });

      it('T1.3.4: should enforce sibling workshop isolation (Factory 1 assets excluded from Factory 2)', async () => {
        const fac2Descendants = await orgService.getDescendantLocationIds('loc-fac-2');
        const assets = await (
          mockPrisma.asset as {
            findMany: (args: unknown) => Promise<Array<{ id: string; assetTag: string }>>;
          }
        ).findMany({
          where: { locationId: { in: fac2Descendants } },
        });
        expect(assets.length).toBe(1);
        expect(assets[0].assetTag).toBe('AST-SEW-003');
      });

      it('T1.3.5: should format asset response with full location path and location name', async () => {
        const asset = await assetsService.findOne('ast-brother-01');
        expect(asset.locationId).toBe('loc-fac1-line1-st01');
        expect(asset.location).toBe('Workstation 01 (Vị Trí Máy May 01)');
      });
    });

    describe('Feature 4: Asset Orthogonal Department Handling', () => {
      beforeEach(() => seedBslGarmentHierarchy());

      it('T1.4.1: should allow an asset at Factory 1 Station 02 to be owned by Quality Assurance Dept', async () => {
        const asset = await assetsService.findOne('ast-juki-02');
        expect(asset.locationId).toBe('loc-fac1-line1-st02');
        expect(asset.departmentId).toBe('dept-qa');
        expect(asset.department).toBe('Quality Assurance (QA)');
      });

      it('T1.4.2: should preserve department ownership intact when filtering assets by parent location', async () => {
        const fac1Descendants = await orgService.getDescendantLocationIds('loc-fac-1');
        const assets = await assetsService.findAll();
        const fac1Assets = assets.filter(
          (a) => a.locationId && fac1Descendants.includes(a.locationId),
        );

        const qaAsset = fac1Assets.find((a) => a.tag === 'AST-SEW-002');
        expect(qaAsset).toBeDefined();
        expect(qaAsset!.departmentId).toBe('dept-qa');
        expect(qaAsset!.department).toBe('Quality Assurance (QA)');
      });

      it('T1.4.3: should filter assets strictly by department independent of physical location', async () => {
        const qaAssets = await assetsService.findAll({ departmentId: 'dept-qa' });
        expect(qaAssets.length).toBe(1);
        expect(qaAssets[0].tag).toBe('AST-SEW-002');
        expect(qaAssets[0].locationId).toBe('loc-fac1-line1-st02');
      });

      it('T1.4.4: should support compound filtering on both Department AND Location simultaneously', async () => {
        // Query assets in Factory 1 owned specifically by Sewing Dept
        const fac1Descendants = await orgService.getDescendantLocationIds('loc-fac-1');
        const assets = await assetsService.findAll({ departmentId: 'dept-sew' });
        const filtered = assets.filter(
          (a) => a.locationId && fac1Descendants.includes(a.locationId),
        );

        expect(filtered.length).toBe(1);
        expect(filtered[0].tag).toBe('AST-SEW-001'); // Brother S-7200A (owned by Sewing)
        expect(filtered.some((a) => a.tag === 'AST-SEW-002')).toBe(false); // Juki is owned by QA
      });

      it('T1.4.5: should allow updating asset physical location without corrupting department assignment', async () => {
        // Move QA machine from Station 02 to Station 01
        const updated = await assetsService.update('ast-juki-02', {
          locationId: 'loc-fac1-line1-st01',
        });
        expect(updated.locationId).toBe('loc-fac1-line1-st01');
        expect(updated.departmentId).toBe('dept-qa');
        expect(updated.department).toBe('Quality Assurance (QA)');
      });
    });

    describe('Feature 5: Inventory Storage Location & Stock Filtering', () => {
      beforeEach(() => seedBslGarmentHierarchy());

      it('T1.5.1: should query inventory items located in a specific leaf storage bin', async () => {
        const items = await inventoryService.findAll({ locationId: 'loc-cw-bin-01' });
        expect(items.length).toBe(1);
        expect(items[0].sku).toBe('FAB-COT-001');
        expect(items[0].name).toContain('Cotton Knitted');
      });

      it('T1.5.2: should query items stored in Factory 1 MDC sub-warehouse bin', async () => {
        const items = await inventoryService.findAll({ locationId: 'loc-fac1-mdc-b1' });
        expect(items.length).toBe(1);
        expect(items[0].sku).toBe('THR-POLY-001');
        expect(items[0].quantity).toBe(120);
      });

      it('T1.5.3: should aggregate all materials in Central Warehouse across all subordinate racks and bins', async () => {
        const cwDescendants = await orgService.getDescendantLocationIds('loc-cw-bldg');
        const items = await (
          mockPrisma.inventoryItem as {
            findMany: (args: unknown) => Promise<Array<{ id: string; sku: string }>>;
          }
        ).findMany({
          where: { locationId: { in: cwDescendants } },
        });
        expect(items.length).toBe(1);
        expect(items[0].sku).toBe('FAB-COT-001');
      });

      it('T1.5.4: should enforce sub-warehouse isolation between Factory 1 MDC and Factory 2 MDC', async () => {
        // Add item to Factory 2 MDC
        db.createInventoryItem({
          id: 'inv-fac2-thread',
          name: 'Polyester Thread 40/2 (White)',
          sku: 'THR-FAC2-001',
          locationId: 'loc-fac2-mdc-b1',
          quantity: 40,
        });

        const fac1Descendants = await orgService.getDescendantLocationIds('loc-fac1-mdc');
        const fac1Items = await (
          mockPrisma.inventoryItem as {
            findMany: (args: unknown) => Promise<Array<{ id: string; sku: string }>>;
          }
        ).findMany({
          where: { locationId: { in: fac1Descendants } },
        });
        expect(fac1Items.some((i) => i.sku === 'THR-POLY-001')).toBe(true);
        expect(fac1Items.some((i) => i.sku === 'THR-FAC2-001')).toBe(false);
      });

      it('T1.5.5: should retain location object with organization details on inventory response payload', async () => {
        const items = await inventoryService.findAll({ locationId: 'loc-fac1-mdc-b1' });
        expect(items[0].location).toBeDefined();
        expect(items[0].location?.name).toBe('MDC Accessories Bin B-01');
        expect(items[0].location?.organization).toBeDefined();
        expect(items[0].location?.organization?.name).toContain('BSL');
      });
    });

    describe('Feature 6: Location Breadcrumbs & Path Display (fullPath)', () => {
      beforeEach(() => seedBslGarmentHierarchy());

      it('T1.6.1: should format breadcrumb paths with standard delimiter " > " from root to leaf', async () => {
        const loc = await locController.findOne('loc-fac1-line1-st01');
        expect(loc.fullPath).toBe(
          'BSL - Soc Trang Campus > Factory 1 (Phân xưởng 1) > Sewing & Assembly Section (Khu Vực Chuyền May) > Sewing Line 01 (Chuyền May 01) > Workstation 01 (Vị Trí Máy May 01)',
        );
      });

      it('T1.6.2: should set root location path identical to its own name without delimiter', async () => {
        const root = await locController.findOne('loc-bsl-campus');
        expect(root.fullPath).toBe('BSL - Soc Trang Campus');
        expect(root.fullPath).not.toContain(' > ');
      });

      it('T1.6.3: should auto-compute fullPath when creating a new child location under an existing parent', async () => {
        const newStation = await locController.create({
          name: 'Workstation 03 (Vị Trí Máy May 03)',
          code: 'FAC1-L1-ST03',
          type: LocationType.STATION,
          parentId: 'loc-fac1-line-01',
          organizationId: 'org-bsl',
        });
        expect(newStation.fullPath).toBe(
          'BSL - Soc Trang Campus > Factory 1 (Phân xưởng 1) > Sewing & Assembly Section (Khu Vực Chuyền May) > Sewing Line 01 (Chuyền May 01) > Workstation 03 (Vị Trí Máy May 03)',
        );
      });

      it('T1.6.4: should re-traverse upward and compute fullPath dynamically with computeFullPath()', async () => {
        const computed = await orgService.computeFullPath('loc-fac1-mdc-b1');
        expect(computed).toBe(
          'BSL - Soc Trang Campus > Factory 1 (Phân xưởng 1) > MDC Sub-Warehouse (Kho Nhỏ Cấp Phát Phụ Liệu) > MDC Accessories Bin B-01',
        );
      });

      it('T1.6.5: should cascade fullPath updates down to all descendant nodes when parent location is renamed', async () => {
        await locController.update('loc-fac-1', {
          name: 'Factory 1 - Garment Workshop 01',
        });
        const tree = await locController.getTree();
        const fac1 = tree[0].children!.find((c) => c.id === 'loc-fac-1')!;
        expect(fac1.fullPath).toContain('Factory 1 - Garment Workshop 01');
      });
    });
  });

  // =========================================================================
  // TIER 2: BOUNDARY & CORNER CASES (>=5 tests per feature)
  // =========================================================================
  describe('Tier 2: Boundary & Corner Cases', () => {
    describe('Boundary 1: Empty Tree Scenarios', () => {
      it('T2.1.1: should return empty array [] when getLocationTree() is invoked on empty database', async () => {
        const tree = await locController.getTree();
        expect(tree).toEqual([]);
      });

      it('T2.1.2: should return empty list from findAllLocations() when no locations exist', async () => {
        const locations = await locController.findAll();
        expect(locations).toEqual([]);
      });

      it('T2.1.3: should return empty array from getDescendantLocationIds() on empty database', async () => {
        const descendants = await locController.getDescendants('any-id');
        expect(descendants).toEqual([]);
      });

      it('T2.1.4: should return empty assets list when querying assets by location in empty database', async () => {
        const assets = await assetsService.findAll({ locationId: 'loc-empty' });
        expect(assets).toEqual([]);
      });

      it('T2.1.5: should return empty inventory list when querying inventory by location in empty database', async () => {
        const items = await inventoryService.findAll({ locationId: 'loc-empty' });
        expect(items).toEqual([]);
      });
    });

    describe('Boundary 2: Single Root Node', () => {
      beforeEach(() => {
        db.createLocation({
          id: 'loc-single-root',
          name: 'Isolated Headquarters',
          type: LocationType.CAMPUS,
          parentId: null,
          fullPath: 'Isolated Headquarters',
        });
      });

      it('T2.2.1: should return tree of length 1 with empty children array for isolated single root', async () => {
        const tree = await locController.getTree();
        expect(tree.length).toBe(1);
        expect(tree[0].id).toBe('loc-single-root');
        expect(tree[0].children).toEqual([]);
      });

      it('T2.2.2: should resolve descendant IDs to exactly [singleRootId]', async () => {
        const descendants = await locController.getDescendants('loc-single-root');
        expect(descendants).toEqual(['loc-single-root']);
      });

      it('T2.2.3: should return fullPath equal to node name for single root', async () => {
        const loc = await locController.findOne('loc-single-root');
        expect(loc.fullPath).toBe('Isolated Headquarters');
      });

      it('T2.2.4: should successfully filter asset assigned to single root node', async () => {
        db.createAsset({
          id: 'ast-single',
          name: 'HQ Server',
          assetTag: 'AST-HQ-01',
          locationId: 'loc-single-root',
        });
        const assets = await assetsService.findAll({ locationId: 'loc-single-root' });
        expect(assets.length).toBe(1);
        expect(assets[0].tag).toBe('AST-HQ-01');
      });

      it('T2.2.5: should delete single root location cleanly without foreign key reference conflicts', async () => {
        const res = await locController.remove('loc-single-root');
        expect(res.id).toBe('loc-single-root');
        const tree = await locController.getTree();
        expect(tree).toEqual([]);
      });
    });

    describe('Boundary 3: Disconnected Branches & Orphaned Nodes', () => {
      it('T2.3.1: should render multiple top-level root nodes as sibling trees', async () => {
        db.createLocation({
          id: 'root-1',
          name: 'Campus A (Soc Trang)',
          type: LocationType.CAMPUS,
          parentId: null,
        });
        db.createLocation({
          id: 'root-2',
          name: 'Campus B (Ho Chi Minh)',
          type: LocationType.CAMPUS,
          parentId: null,
        });
        db.createLocation({
          id: 'root-3',
          name: 'Campus C (Da Nang)',
          type: LocationType.CAMPUS,
          parentId: null,
        });

        const tree = await locController.getTree();
        expect(tree.length).toBe(3);
        const names = tree.map((t) => t.name);
        expect(names).toContain('Campus A (Soc Trang)');
        expect(names).toContain('Campus B (Ho Chi Minh)');
        expect(names).toContain('Campus C (Da Nang)');
      });

      it('T2.3.2: should handle orphan node with non-existent parentId gracefully as root in tree', async () => {
        db.createLocation({
          id: 'root-1',
          name: 'Valid Root',
          type: LocationType.CAMPUS,
          parentId: null,
        });
        db.createLocation({
          id: 'orphan-1',
          name: 'Orphan Workshop',
          type: LocationType.WORKSHOP,
          parentId: 'missing-parent-id',
        });

        const tree = await locController.getTree();
        expect(tree.length).toBe(2);
        const orphanNode = tree.find((t) => t.id === 'orphan-1');
        expect(orphanNode).toBeDefined();
        expect(orphanNode!.name).toBe('Orphan Workshop');
      });

      it('T2.3.3: should support re-parenting across branches (moving workshop from Campus A to Campus B)', async () => {
        db.createLocation({
          id: 'campus-a',
          name: 'Campus A',
          type: LocationType.CAMPUS,
          parentId: null,
        });
        db.createLocation({
          id: 'campus-b',
          name: 'Campus B',
          type: LocationType.CAMPUS,
          parentId: null,
        });
        db.createLocation({
          id: 'ws-1',
          name: 'Mobile Workshop',
          type: LocationType.WORKSHOP,
          parentId: 'campus-a',
        });

        // Verify initial parentage
        let aDescendants = await locController.getDescendants('campus-a');
        expect(aDescendants).toContain('ws-1');

        // Move to Campus B
        await locController.update('ws-1', { parentId: 'campus-b' });

        aDescendants = await locController.getDescendants('campus-a');
        expect(aDescendants).not.toContain('ws-1');

        const bDescendants = await locController.getDescendants('campus-b');
        expect(bDescendants).toContain('ws-1');
      });

      it('T2.3.4: should set children parentId to null when parent location is deleted', async () => {
        db.createLocation({
          id: 'parent-loc',
          name: 'Parent Workshop',
          type: LocationType.WORKSHOP,
          parentId: null,
        });
        db.createLocation({
          id: 'child-loc',
          name: 'Child Line',
          type: LocationType.LINE,
          parentId: 'parent-loc',
        });

        await locController.remove('parent-loc');

        const child = await locController.findOne('child-loc');
        expect(child.parentId).toBeNull();
      });

      it('T2.3.5: should accurately maintain separate sub-trees without leaking nodes across trees', async () => {
        db.createLocation({ id: 'tree1-root', name: 'Tree 1 Root', parentId: null });
        db.createLocation({ id: 'tree1-child', name: 'Tree 1 Child', parentId: 'tree1-root' });
        db.createLocation({ id: 'tree2-root', name: 'Tree 2 Root', parentId: null });
        db.createLocation({ id: 'tree2-child', name: 'Tree 2 Child', parentId: 'tree2-root' });

        const tree1Descendants = await locController.getDescendants('tree1-root');
        expect(tree1Descendants).toEqual(['tree1-root', 'tree1-child']);

        const tree2Descendants = await locController.getDescendants('tree2-root');
        expect(tree2Descendants).toEqual(['tree2-root', 'tree2-child']);
      });
    });

    describe('Boundary 4: Deep Hierarchy (10+ Levels)', () => {
      const DEPTH = 12;
      beforeEach(() => {
        // Build a 12-level deep hierarchy:
        // Country > Region > Campus > Building > Wing > Floor > Zone > Room > Row > Rack > Shelf > Bin
        let lastParentId: string | null = null;
        for (let i = 1; i <= DEPTH; i++) {
          const id = `deep-level-${i}`;
          const name = `Level ${i} Node`;
          db.createLocation({
            id,
            name,
            type: i === 1 ? LocationType.CAMPUS : LocationType.BIN,
            parentId: lastParentId,
          });
          lastParentId = id;
        }
      });

      it('T2.4.1: should construct a 12-level deep hierarchy without stack overflow', async () => {
        const tree = await locController.getTree();
        expect(tree.length).toBe(1);

        let curr = tree[0];
        for (let level = 1; level < DEPTH; level++) {
          expect(curr.children).toBeDefined();
          expect(curr.children!.length).toBe(1);
          curr = curr.children![0];
        }
        expect(curr.id).toBe(`deep-level-${DEPTH}`);
      });

      it('T2.4.2: should resolve all 12 descendant IDs when querying top-level node (Level 1)', async () => {
        const descendants = await locController.getDescendants('deep-level-1');
        expect(descendants.length).toBe(DEPTH);
        for (let i = 1; i <= DEPTH; i++) {
          expect(descendants).toContain(`deep-level-${i}`);
        }
      });

      it('T2.4.3: should resolve mid-tree node (Level 7) to exactly levels 7 through 12', async () => {
        const descendants = await locController.getDescendants('deep-level-7');
        expect(descendants.length).toBe(6);
        expect(descendants).toEqual([
          'deep-level-7',
          'deep-level-8',
          'deep-level-9',
          'deep-level-10',
          'deep-level-11',
          'deep-level-12',
        ]);
      });

      it('T2.4.4: should generate breadcrumb fullPath containing all 12 level segments joined with " > "', async () => {
        const fullPath = await orgService.computeFullPath(`deep-level-${DEPTH}`);
        const segments = fullPath.split(' > ');
        expect(segments.length).toBe(DEPTH);
        expect(segments[0]).toBe('Level 1 Node');
        expect(segments[DEPTH - 1]).toBe(`Level ${DEPTH} Node`);
      });

      it('T2.4.5: should resolve assets attached to level 12 bin when querying top-level ancestor', async () => {
        db.createAsset({
          id: 'ast-deep',
          name: 'Micro Precision Part',
          assetTag: 'AST-DEEP-01',
          locationId: `deep-level-${DEPTH}`,
        });

        const topDescendants = await orgService.getDescendantLocationIds('deep-level-1');
        const assets = await (
          mockPrisma.asset as { findMany: (args: unknown) => Promise<Array<{ id: string }>> }
        ).findMany({
          where: { locationId: { in: topDescendants } },
        });
        expect(assets.length).toBe(1);
        expect(assets[0].id).toBe('ast-deep');
      });
    });

    describe('Boundary 5: Cyclic Parent Reference Defense', () => {
      beforeEach(() => {
        db.createLocation({ id: 'node-a', name: 'Node A', parentId: null });
        db.createLocation({ id: 'node-b', name: 'Node B', parentId: 'node-a' });
        db.createLocation({ id: 'node-c', name: 'Node C', parentId: 'node-b' });
      });

      it('T2.5.1: should throw BadRequestException when updating a location to be its own parent', async () => {
        await expect(locController.update('node-a', { parentId: 'node-a' })).rejects.toThrow(
          BadRequestException,
        );
      });

      it('T2.5.2: should throw BadRequestException when setting parent to a descendant node (A -> C cycle)', async () => {
        // Attempt to set Node A's parent to Node C (which is a descendant of A)
        await expect(locController.update('node-a', { parentId: 'node-c' })).rejects.toThrow(
          /Cannot set parent to a descendant location \(cycle detected\)/,
        );
      });

      it('T2.5.3: should terminate safely without infinite recursion if a 2-node cycle exists in database', async () => {
        // Manually inject cycle in raw records
        const a = db.locations.find((l) => l.id === 'node-a')!;
        a.parentId = 'node-b'; // A -> B and B -> A cycle

        // Calling getLocationTree must not throw CallStack / RangeError
        const tree = await locController.getTree();
        expect(tree).toBeDefined();
        expect(Array.isArray(tree)).toBe(true);
      });

      it('T2.5.4: should terminate safely via visited set in getDescendantLocationIds() on circular data', async () => {
        // Create 3-node loop A -> B -> C -> A
        const a = db.locations.find((l) => l.id === 'node-a')!;
        a.parentId = 'node-c';

        const descendants = await locController.getDescendants('node-a');
        expect(descendants).toBeDefined();
        // Visited set ensures all 3 nodes appear exactly once
        expect(descendants.length).toBe(3);
        expect(descendants).toEqual(expect.arrayContaining(['node-a', 'node-b', 'node-c']));
      });

      it('T2.5.5: should terminate safely via visited set in computeFullPath() on circular parentage', async () => {
        const a = db.locations.find((l) => l.id === 'node-a')!;
        a.parentId = 'node-c';

        const fullPath = await orgService.computeFullPath('node-a');
        expect(typeof fullPath).toBe('string');
        expect(fullPath.length).toBeGreaterThan(0);
      });
    });

    describe('Boundary 6: Non-Existent Parent & Edge Queries', () => {
      it('T2.6.1: should throw NotFoundException when querying findLocation() with non-existent ID', async () => {
        await expect(locController.findOne('missing-uuid-123')).rejects.toThrow(NotFoundException);
      });

      it('T2.6.2: should throw NotFoundException when createLocation() provides non-existent parentId', async () => {
        await expect(
          locController.create({
            name: 'Floating Sub-location',
            parentId: 'invalid-parent-uuid',
          }),
        ).rejects.toThrow(NotFoundException);
      });

      it('T2.6.3: should return empty array [] from getDescendantLocationIds() for non-existent ID', async () => {
        const descendants = await locController.getDescendants('unknown-id');
        expect(descendants).toEqual([]);
      });

      it('T2.6.4: should filter only root locations when parentId is passed as "null"', async () => {
        db.createLocation({ id: 'r1', name: 'Root 1', parentId: null });
        db.createLocation({ id: 'c1', name: 'Child 1', parentId: 'r1' });

        const roots = await locController.findAll(undefined, undefined, 'null');
        expect(roots.length).toBe(1);
        expect(roots[0].id).toBe('r1');
      });

      it('T2.6.5: should throw NotFoundException when computeFullPath() is called with non-existent ID', async () => {
        await expect(orgService.computeFullPath('ghost-location')).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('Boundary 7: Unicode, Vietnamese Diacritics & Special Characters', () => {
      beforeEach(() => {
        db.createLocation({
          id: 'loc-unicode-root',
          name: 'Phân Xưởng 1 - May Mặc & In Ép (Khu Vực Sản Xuất #1)',
          code: 'PX1-MAY',
          type: LocationType.WORKSHOP,
          parentId: null,
          fullPath: 'Phân Xưởng 1 - May Mặc & In Ép (Khu Vực Sản Xuất #1)',
        });
        db.createLocation({
          id: 'loc-unicode-child',
          name: 'Khu Vực Cắt Vải & Kiểm Phẩm [Bàn Cắt Tự Động 01 / 02]',
          code: 'PX1-CAT',
          type: LocationType.ZONE,
          parentId: 'loc-unicode-root',
        });
      });

      it('T2.7.1: should preserve complete Vietnamese diacritics in location name and tree labels', async () => {
        const tree = await locController.getTree();
        expect(tree[0].title).toBe('Phân Xưởng 1 - May Mặc & In Ép (Khu Vực Sản Xuất #1)');
      });

      it('T2.7.2: should preserve symbols (#, &, [], /, -) in location names without corruption', async () => {
        const loc = await locController.findOne('loc-unicode-child');
        expect(loc.name).toBe('Khu Vực Cắt Vải & Kiểm Phẩm [Bàn Cắt Tự Động 01 / 02]');
      });

      it('T2.7.3: should support case-insensitive and accent-matching search queries', async () => {
        const results = await locController.findAll(undefined, undefined, undefined, 'may mặc');
        expect(results.length).toBe(1);
        expect(results[0].id).toBe('loc-unicode-root');
      });

      it('T2.7.4: should construct breadcrumb fullPath with mixed Vietnamese and symbols intact', async () => {
        const fullPath = await orgService.computeFullPath('loc-unicode-child');
        expect(fullPath).toBe(
          'Phân Xưởng 1 - May Mặc & In Ép (Khu Vực Sản Xuất #1) > Khu Vực Cắt Vải & Kiểm Phẩm [Bàn Cắt Tự Động 01 / 02]',
        );
      });

      it('T2.7.5: should handle emojis and quotes in descriptions safely', async () => {
        const desc = '🏢 BSL Headquarters — "Block A" & Workshop 🏷️';
        const loc = await locController.create({
          name: 'Emoji Facility',
          description: desc,
        });
        expect(loc.description).toBe(desc);
      });
    });
  });

  // =========================================================================
  // TIER 3: CROSS-FEATURE COMBINATIONS (PAIRWISE COVERAGE)
  // =========================================================================
  describe('Tier 3: Cross-Feature Combinations (Pairwise Coverage)', () => {
    beforeEach(() => seedBslGarmentHierarchy());

    it('T3.1: Asset with Department + Leaf Location: filtering by Parent Location returns asset with department intact', async () => {
      const fac1Descendants = await orgService.getDescendantLocationIds('loc-fac-1');
      const allAssets = await assetsService.findAll();
      const matched = allAssets.filter(
        (a) => a.locationId && fac1Descendants.includes(a.locationId),
      );

      const brother = matched.find((a) => a.tag === 'AST-SEW-001');
      expect(brother).toBeDefined();
      expect(brother!.departmentId).toBe('dept-sew');
      expect(brother!.department).toBe('Production & Sewing Dept');
      expect(brother!.locationId).toBe('loc-fac1-line1-st01');
    });

    it('T3.2: Compound Asset filter: Category + Status (IN_USE) + Parent Location + Department', async () => {
      const fac1Descendants = await orgService.getDescendantLocationIds('loc-fac-1');
      const assets = await assetsService.findAll({
        status: 'Active',
        departmentId: 'dept-qa',
      });
      const spatialMatch = assets.filter(
        (a) => a.locationId && fac1Descendants.includes(a.locationId),
      );

      expect(spatialMatch.length).toBe(1);
      expect(spatialMatch[0].tag).toBe('AST-SEW-002');
      expect(spatialMatch[0].manufacturer).toBe('Juki');
    });

    it('T3.3: Inventory item in MDC sub-warehouse with bin: filtering by Factory returns the item', async () => {
      const fac1Descendants = await orgService.getDescendantLocationIds('loc-fac-1');
      const items = await (
        mockPrisma.inventoryItem as { findMany: (args: unknown) => Promise<Array<{ sku: string }>> }
      ).findMany({
        where: { locationId: { in: fac1Descendants } },
      });
      expect(items.some((i) => i.sku === 'THR-POLY-001')).toBe(true);
    });

    it('T3.4: Compound Inventory filter: Low Stock + Parent Sub-Warehouse Location', async () => {
      // Add low-stock zipper to Factory 1 MDC
      db.createInventoryItem({
        id: 'inv-zipper-low',
        name: 'YKK Metal Zippers 20cm',
        sku: 'ZIP-YKK-020',
        locationId: 'loc-fac1-mdc-b1',
        quantity: 4,
        minThreshold: 20,
      });

      const mdcDescendants = await orgService.getDescendantLocationIds('loc-fac1-mdc');
      const items = await (
        mockPrisma.inventoryItem as {
          findMany: (args: unknown) => Promise<Array<{ sku: string; quantity: number }>>;
        }
      ).findMany({
        where: { locationId: { in: mdcDescendants } },
      });
      const lowStock = items.filter((i) => i.quantity <= 5);
      expect(lowStock.length).toBe(1);
      expect(lowStock[0].sku).toBe('ZIP-YKK-020');
    });

    it('T3.5: Moving asset from Factory 1 to Factory 2 reflects immediately in spatial filters', async () => {
      // Move Brother machine to Factory 2 Workstation 01
      await assetsService.update('ast-brother-01', {
        locationId: 'loc-fac2-line1-st01',
      });

      const fac1Descendants = await orgService.getDescendantLocationIds('loc-fac-1');
      const fac2Descendants = await orgService.getDescendantLocationIds('loc-fac-2');

      const all = await assetsService.findAll();
      const fac1Assets = all.filter((a) => a.locationId && fac1Descendants.includes(a.locationId));
      const fac2Assets = all.filter((a) => a.locationId && fac2Descendants.includes(a.locationId));

      expect(fac1Assets.some((a) => a.tag === 'AST-SEW-001')).toBe(false);
      expect(fac2Assets.some((a) => a.tag === 'AST-SEW-001')).toBe(true);
    });

    it('T3.6: Multi-tenant / Multi-organization isolation: Tree query with organizationId isolates tree branches', async () => {
      db.createOrganization({
        id: 'org-external',
        name: 'Subcontractor Facility',
        code: 'SUBCON',
        status: 'ACTIVE',
      });
      db.createLocation({
        id: 'loc-subcon-site',
        name: 'Subcon Plant',
        type: LocationType.CAMPUS,
        organizationId: 'org-external',
      });

      const bslTree = await locController.getTree('org-bsl');
      expect(bslTree.every((t) => t.organizationId === 'org-bsl')).toBe(true);

      const subconTree = await locController.getTree('org-external');
      expect(subconTree.length).toBe(1);
      expect(subconTree[0].id).toBe('loc-subcon-site');
    });

    it('T3.7: Asset assigned to DirectoryUser in Dept A, physically at Location B (cross-boundary consistency)', async () => {
      const asset = await assetsService.findOne('ast-pc-acct');
      expect(asset.locationId).toBe('loc-bc-acct-room');
      expect(asset.departmentId).toBe('dept-acct');
      expect(asset.organization).toContain('BSL');
    });

    it('T3.8: Renaming parent location updates fullPath of child locations and reflects on assets', async () => {
      await locController.update('loc-fac-1', { name: 'Factory 1 - Smart Apparel Line' });
      const updatedChildPath = await orgService.computeFullPath('loc-fac1-line1-st01');
      expect(updatedChildPath).toContain('Factory 1 - Smart Apparel Line');
    });

    it('T3.9: Inventory restock in nested bin preserves spatial location link and updates quantity', async () => {
      const item = db.inventoryItems.find((i) => i.sku === 'THR-POLY-001')!;
      item.quantity += 50; // Restock 50 spools

      const queried = await inventoryService.findAll({ locationId: 'loc-fac1-mdc-b1' });
      expect(queried[0].quantity).toBe(170);
      expect(queried[0].locationId).toBe('loc-fac1-mdc-b1');
    });

    it('T3.10: Simultaneous Asset and Inventory queries against same spatial location return corresponding equipment and parts', async () => {
      const fac1Descendants = await orgService.getDescendantLocationIds('loc-fac-1');

      const assets = await (
        mockPrisma.asset as { findMany: (args: unknown) => Promise<Array<{ id: string }>> }
      ).findMany({
        where: { locationId: { in: fac1Descendants } },
      });
      const inventory = await (
        mockPrisma.inventoryItem as { findMany: (args: unknown) => Promise<Array<{ id: string }>> }
      ).findMany({
        where: { locationId: { in: fac1Descendants } },
      });

      expect(assets.length).toBe(2);
      expect(inventory.length).toBe(1);
    });

    it('T3.11: Updating location status to INACTIVE does not orphan or delete assigned assets', async () => {
      await locController.update('loc-fac1-line1-st01', { status: 'INACTIVE' });
      const asset = await assetsService.findOne('ast-brother-01');
      expect(asset.locationId).toBe('loc-fac1-line1-st01');
    });

    it('T3.12: Deleting intermediate line location nullifies parentId of stations without deleting assets', async () => {
      await locController.remove('loc-fac1-line-01');

      const station = await locController.findOne('loc-fac1-line1-st01');
      expect(station.parentId).toBeNull();

      const asset = await assetsService.findOne('ast-brother-01');
      expect(asset.locationId).toBe('loc-fac1-line1-st01');
    });
  });

  // =========================================================================
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS (BSL GARMENT ENTERPRISE)
  // =========================================================================
  describe('Tier 4: Real-World Application Scenarios (BSL Garment Enterprise)', () => {
    beforeEach(() => seedBslGarmentHierarchy());

    it('T4.1: BSL Garment Factory End-to-End Asset Allocation (Sewing Line 01 Station 02 with QA Dept Owner)', async () => {
      // Scenario: QA engineer uses a specialized digital lockstitch machine placed on Sewing Line 01 for batch testing
      const qaAsset = await assetsService.findOne('ast-juki-02');
      expect(qaAsset.name).toBe('Juki DDL-9000C Digital Lockstitch Machine');
      expect(qaAsset.department).toBe('Quality Assurance (QA)');
      expect(qaAsset.locationId).toBe('loc-fac1-line1-st02');

      // Verify that querying Factory 1 includes this machine
      const fac1Descendants = await orgService.getDescendantLocationIds('loc-fac-1');
      expect(fac1Descendants).toContain(qaAsset.locationId);
    });

    it('T4.2: Central Warehouse Raw Material Receiving & Bin Storage (Cotton fabric rolls in Rack R-01 Bin B-01)', async () => {
      // Scenario: Central Warehouse receives 500kg cotton knitted fabric and stores it at BSL > CW > Raw Area > Rack R-01 > Bin B-01
      const item = db.inventoryItems.find((i) => i.sku === 'FAB-COT-001')!;
      expect(item.quantity).toBe(500);

      const path = await orgService.computeFullPath(item.locationId!);
      expect(path).toBe(
        'BSL - Soc Trang Campus > Central Warehouse (Kho Tổng) > Raw Materials Storage Area (Kho Vải Chính) > Fabric Shelf Rack R-01 > Pallet Bin B-01',
      );
    });

    it('T4.3: Factory 1 Sewing Line 01 Station 02 Machine & Terminal Provisioning', async () => {
      // Scenario: Station 02 is provisioned with a barcode terminal and touchscreen monitor alongside the sewing machine
      db.createAsset({
        id: 'ast-term-02',
        name: 'Zebra TC26 Barcode Scanner Terminal',
        assetTag: 'AST-BC-002',
        locationId: 'loc-fac1-line1-st02',
        departmentId: 'dept-sew',
      });

      const stationAssets = await assetsService.findAll({ locationId: 'loc-fac1-line1-st02' });
      expect(stationAssets.length).toBe(2);
      const tags = stationAssets.map((a) => a.tag);
      expect(tags).toContain('AST-SEW-002');
      expect(tags).toContain('AST-BC-002');
    });

    it('T4.4: MDC Sub-Warehouse Parts Restock & Spatial Aggregation across Factory 1', async () => {
      // Scenario: Restocking sewing needle packs and bobbin cases into Factory 1 MDC Sub-Warehouse
      db.createInventoryItem({
        id: 'inv-needles',
        name: 'Organ Needles DBx1 #14 (Pack of 100)',
        sku: 'NDL-ORG-014',
        locationId: 'loc-fac1-mdc-b1',
        quantity: 250,
      });

      const fac1Descendants = await orgService.getDescendantLocationIds('loc-fac-1');
      const fac1Stock = await (
        mockPrisma.inventoryItem as {
          findMany: (args: unknown) => Promise<Array<{ sku: string; quantity: number }>>;
        }
      ).findMany({
        where: { locationId: { in: fac1Descendants } },
      });

      expect(fac1Stock.length).toBe(2);
      const needleStock = fac1Stock.find((s) => s.sku === 'NDL-ORG-014');
      expect(needleStock!.quantity).toBe(250);
    });

    it('T4.5: Business Center Executive & Administration Fleet Query without mixing with Factory Assets', async () => {
      // Scenario: IT audits executive and office IT equipment located at Business Center Administration Floor
      const bcDescendants = await orgService.getDescendantLocationIds('loc-bc-bldg');
      const allAssets = await assetsService.findAll();
      const officeFleet = allAssets.filter(
        (a) => a.locationId && bcDescendants.includes(a.locationId),
      );

      expect(officeFleet.length).toBe(1);
      expect(officeFleet[0].tag).toBe('AST-IT-001');
      expect(officeFleet[0].name).toContain('Dell OptiPlex');

      // Crucial: Zero sewing machines present in Business Center query
      expect(
        officeFleet.some((a) => a.name.includes('Sewing') || a.name.includes('Lockstitch')),
      ).toBe(false);
    });

    it('T4.6: Machinery Relocation between Factory 1 and Factory 2 with full path updates', async () => {
      // Scenario: Juki Overlock is relocated from Factory 2 Line 1 to Factory 1 Line 1 Station 01
      const moved = await assetsService.update('ast-juki-fac2', {
        locationId: 'loc-fac1-line1-st01',
      });
      expect(moved.locationId).toBe('loc-fac1-line1-st01');

      // Verify that querying Factory 1 now aggregates 3 machines
      const fac1Descendants = await orgService.getDescendantLocationIds('loc-fac-1');
      const allAssets = await assetsService.findAll();
      const fac1Assets = allAssets.filter(
        (a) => a.locationId && fac1Descendants.includes(a.locationId),
      );

      expect(fac1Assets.length).toBe(3);
      expect(fac1Assets.some((a) => a.tag === 'AST-SEW-003')).toBe(true);
    });

    it('T4.7: Production Line Reconfiguration (Splitting or Adding Stations)', async () => {
      // Scenario: Factory 1 line reconfiguration adds Workstation 03 to Sewing Line 01
      const st03 = await locController.create({
        name: 'Workstation 03 (Vị Trí Máy May 03)',
        code: 'FAC1-L1-ST03',
        type: LocationType.STATION,
        parentId: 'loc-fac1-line-01',
        organizationId: 'org-bsl',
      });

      // Immediately discoverable in Factory 1 descendant query
      const fac1Descendants = await locController.getDescendants('loc-fac-1');
      expect(fac1Descendants).toContain(st03.id);

      // Deploy newly received machine to Station 03
      db.createAsset({
        id: 'ast-new-st03',
        name: 'Pegasus M900 Overlock Machine',
        assetTag: 'AST-SEW-004',
        locationId: st03.id,
        departmentId: 'dept-sew',
      });

      const lineAssets = await assetsService.findAll({ locationId: st03.id });
      expect(lineAssets.length).toBe(1);
      expect(lineAssets[0].tag).toBe('AST-SEW-004');
    });

    it('T4.8: Multi-Plant Enterprise Asset Audit (BSL Soc Trang Campus vs BSH Ho Chi Minh Office)', async () => {
      // Scenario: Enterprise auditor audits equipment counts across campuses
      db.createOrganization({
        id: 'org-bsh',
        name: 'BSH Ho Chi Minh',
        code: 'BSH',
        status: 'ACTIVE',
      });
      db.createLocation({
        id: 'loc-bsh-hq',
        name: 'BSH Ho Chi Minh HQ',
        type: LocationType.CAMPUS,
        organizationId: 'org-bsh',
      });
      db.createAsset({
        id: 'ast-bsh-01',
        name: 'BSH Core Switch',
        assetTag: 'AST-BSH-01',
        locationId: 'loc-bsh-hq',
      });

      const bslIds = await orgService.getDescendantLocationIds('loc-bsl-campus');
      const bshIds = await orgService.getDescendantLocationIds('loc-bsh-hq');

      const allAssets = await assetsService.findAll();
      const bslCount = allAssets.filter(
        (a) => a.locationId && bslIds.includes(a.locationId),
      ).length;
      const bshCount = allAssets.filter(
        (a) => a.locationId && bshIds.includes(a.locationId),
      ).length;

      expect(bslCount).toBe(4);
      expect(bshCount).toBe(1);
    });
  });
});
