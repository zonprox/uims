import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssetStatus } from '@uims/shared-types';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import type { CreateCostCenterDto } from './dto/create-cost-center.dto';
import type { CreateDeviceModelDto } from './dto/create-device-model.dto';
import type { IssueAssetUnitDto } from './dto/issue-asset-unit.dto';
import type { RegisterPhysicalUnitDto } from './dto/register-physical-unit.dto';
import type { UpdateDeviceModelDto } from './dto/update-device-model.dto';

describe('AssetsHierarchy & CostCenters Unit Specification', () => {
  describe('AssetsController Hierarchy Endpoints', () => {
    let controller: AssetsController;
    let mockAssetsService: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
      mockAssetsService = {
        listModels: vi.fn(),
        createModel: vi.fn(),
        getModel: vi.fn(),
        updateModel: vi.fn(),
        deleteModel: vi.fn(),
        getModelUnits: vi.fn(),
        registerUnit: vi.fn(),
        getUnit: vi.fn(),
        updateUnit: vi.fn(),
        deleteUnit: vi.fn(),
        issueUnit: vi.fn(),
        checkinUnit: vi.fn(),
        listCostCenters: vi.fn(),
        createCostCenter: vi.fn(),
        getCostCenter: vi.fn(),
        updateCostCenter: vi.fn(),
        deleteCostCenter: vi.fn(),
        findAll: vi.fn(),
        findOne: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
        exportXlsx: vi.fn(),
        batchAssign: vi.fn(),
        batchDelete: vi.fn(),
        getStats: vi.fn(),
        getCategories: vi.fn(),
      };

      controller = new AssetsController(mockAssetsService as unknown as AssetsService);
    });

    it('getModels: delegates to listModels with query', async () => {
      const mockResult = {
        items: [{ id: 'm-1', assetCode: 'MOD-DELL' }],
        total: 1,
        page: 1,
        pageSize: 10,
      };
      mockAssetsService.listModels.mockResolvedValue(mockResult);

      const res = await controller.getModels({ search: 'DELL' });
      expect(mockAssetsService.listModels).toHaveBeenCalledWith({ search: 'DELL' });
      expect(res).toBe(mockResult);
    });

    it('createModel: forwards CreateDeviceModelDto to service', async () => {
      const dto: CreateDeviceModelDto = { assetCode: 'MOD-MBP-14', name: 'MacBook Pro 14"' };
      const created = { id: 'm-2', ...dto, parentId: null };
      mockAssetsService.createModel.mockResolvedValue(created);

      const res = await controller.createModel(dto);
      expect(mockAssetsService.createModel).toHaveBeenCalledWith(dto);
      expect(res).toBe(created);
    });

    it('getModel: fetches model details by ID', async () => {
      const model = { id: 'm-1', assetCode: 'MOD-DELL', totalUnits: 5 };
      mockAssetsService.getModel.mockResolvedValue(model);

      const res = await controller.getModel('m-1');
      expect(mockAssetsService.getModel).toHaveBeenCalledWith('m-1');
      expect(res).toBe(model);
    });

    it('updateModel: forwards UpdateDeviceModelDto to service', async () => {
      const dto: UpdateDeviceModelDto = { name: 'Dell Latitude 5430' };
      const updated = { id: 'm-1', assetCode: 'MOD-DELL', name: 'Dell Latitude 5430' };
      mockAssetsService.updateModel.mockResolvedValue(updated);

      const res = await controller.updateModel('m-1', dto);
      expect(mockAssetsService.updateModel).toHaveBeenCalledWith('m-1', dto);
      expect(res).toBe(updated);
    });

    it('deleteModel: calls deleteModel on service', async () => {
      mockAssetsService.deleteModel.mockResolvedValue({ success: true, id: 'm-1' });

      const res = await controller.deleteModel('m-1');
      expect(mockAssetsService.deleteModel).toHaveBeenCalledWith('m-1');
      expect(res).toEqual({ success: true, id: 'm-1' });
    });

    it('registerUnit: forwards RegisterPhysicalUnitDto to service', async () => {
      const dto: RegisterPhysicalUnitDto = { subcode: 'AST-DELL-01', parentId: 'm-1' };
      const unit = { id: 'u-1', subcode: 'AST-DELL-01', parentId: 'm-1' };
      mockAssetsService.registerUnit.mockResolvedValue(unit);

      const res = await controller.registerUnit(dto);
      expect(mockAssetsService.registerUnit).toHaveBeenCalledWith(dto);
      expect(res).toBe(unit);
    });

    it('issueUnit: forwards IssueAssetUnitDto to service', async () => {
      const dto: IssueAssetUnitDto = { assignedToId: 'user-1' };
      const issued = { id: 'u-1', status: 'IN_USE', assignedToId: 'user-1' };
      mockAssetsService.issueUnit.mockResolvedValue(issued);

      const res = await controller.issueUnit('u-1', dto);
      expect(mockAssetsService.issueUnit).toHaveBeenCalledWith('u-1', dto);
      expect(res).toBe(issued);
    });

    it('checkinUnit: calls checkinUnit on service with optional notes', async () => {
      const checkedIn = { id: 'u-1', status: 'AVAILABLE', assignedToId: null };
      mockAssetsService.checkinUnit.mockResolvedValue(checkedIn);

      const res = await controller.checkinUnit('u-1', { notes: 'Returned cleanly' });
      expect(mockAssetsService.checkinUnit).toHaveBeenCalledWith('u-1', 'Returned cleanly');
      expect(res).toBe(checkedIn);
    });

    it('getCostCenters: calls listCostCenters on service', async () => {
      const list = [{ id: 'cc-1', code: 'IT-OPS', linkedAssetCount: 2 }];
      mockAssetsService.listCostCenters.mockResolvedValue(list);

      const res = await controller.getCostCenters();
      expect(mockAssetsService.listCostCenters).toHaveBeenCalled();
      expect(res).toBe(list);
    });

    it('createCostCenter: forwards CreateCostCenterDto to service', async () => {
      const dto: CreateCostCenterDto = { code: 'ENG-DEV', name: 'Engineering' };
      const created = { id: 'cc-2', ...dto, linkedAssetCount: 0 };
      mockAssetsService.createCostCenter.mockResolvedValue(created);

      const res = await controller.createCostCenter(dto);
      expect(mockAssetsService.createCostCenter).toHaveBeenCalledWith(dto);
      expect(res).toBe(created);
    });

    it('Route Precedence: verifies models, units, and cost-centers methods precede parameterized :id routes', () => {
      const propertyNames = Object.getOwnPropertyNames(AssetsController.prototype);

      const getModelsIndex = propertyNames.indexOf('getModels');
      const registerUnitIndex = propertyNames.indexOf('registerUnit');
      const getCostCentersIndex = propertyNames.indexOf('getCostCenters');
      const findOneIndex = propertyNames.indexOf('findOne');
      const removeIndex = propertyNames.indexOf('remove');

      expect(getModelsIndex).toBeLessThan(findOneIndex);
      expect(registerUnitIndex).toBeLessThan(findOneIndex);
      expect(getCostCentersIndex).toBeLessThan(findOneIndex);
      expect(getModelsIndex).toBeLessThan(removeIndex);
    });
  });

  describe('AssetsService Hierarchy Logic', () => {
    let service: AssetsService;
    let mockPrisma: Record<string, unknown>;

    beforeEach(() => {
      mockPrisma = {
        $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(mockPrisma)),
        asset: {
          create: vi.fn(),
          findMany: vi.fn(),
          findUnique: vi.fn(),
          findFirst: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          deleteMany: vi.fn(),
          count: vi.fn(),
          groupBy: vi.fn(),
        },
        costCenter: {
          create: vi.fn(),
          findMany: vi.fn(),
          findUnique: vi.fn(),
          findFirst: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        },
        assetCategory: {
          findFirst: vi.fn(),
          findUnique: vi.fn(),
        },
        directoryUser: {
          findUnique: vi.fn(),
          findFirst: vi.fn(),
        },
      };

      service = new AssetsService(
        mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
      );
    });

    describe('createModel', () => {
      it('rejects empty or whitespace assetCode with BadRequestException', async () => {
        await expect(service.createModel({ assetCode: '   ', name: 'Model A' })).rejects.toThrow(
          BadRequestException,
        );
      });

      it('rejects empty name with BadRequestException', async () => {
        await expect(service.createModel({ assetCode: 'MOD-1', name: '  ' })).rejects.toThrow(
          BadRequestException,
        );
      });

      it('rejects negative unitCost with BadRequestException', async () => {
        await expect(
          service.createModel({ assetCode: 'MOD-1', name: 'Model A', unitCost: -50 }),
        ).rejects.toThrow(BadRequestException);
      });

      it('rejects duplicate assetCode proactively with 409 ConflictException', async () => {
        const mockAssetFindFirst = mockPrisma.asset as { findFirst: ReturnType<typeof vi.fn> };
        mockAssetFindFirst.findFirst.mockResolvedValue({
          id: 'existing-mod',
          assetCode: 'MOD-DELL',
        });

        await expect(
          service.createModel({ assetCode: 'MOD-DELL', name: 'Dell Model' }),
        ).rejects.toThrow(ConflictException);
      });

      it('creates device model with parentId = null and mirrored assetTag', async () => {
        const mockAsset = mockPrisma.asset as {
          findFirst: ReturnType<typeof vi.fn>;
          create: ReturnType<typeof vi.fn>;
          findUnique: ReturnType<typeof vi.fn>;
          count: ReturnType<typeof vi.fn>;
        };
        mockAsset.findFirst.mockResolvedValue(null);
        mockAsset.create.mockResolvedValue({
          id: 'mod-1',
          assetCode: 'MOD-DELL-5420',
          assetTag: 'MOD-DELL-5420',
          subcode: null,
          parentId: null,
          name: 'Dell Latitude 5420',
          status: AssetStatus.AVAILABLE,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        mockAsset.findUnique.mockResolvedValue({
          id: 'mod-1',
          assetCode: 'MOD-DELL-5420',
          assetTag: 'MOD-DELL-5420',
          subcode: null,
          parentId: null,
          name: 'Dell Latitude 5420',
          status: AssetStatus.AVAILABLE,
          createdAt: new Date(),
          updatedAt: new Date(),
          children: [],
        });
        mockAsset.count.mockResolvedValue(0);

        const result = await service.createModel({
          assetCode: 'MOD-DELL-5420',
          name: 'Dell Latitude 5420',
        });

        expect(result.id).toBe('mod-1');
        expect(result.assetCode).toBe('MOD-DELL-5420');
        expect(result.parentId).toBeNull();
        expect(result.totalUnits).toBe(0);
      });
    });

    describe('registerUnit', () => {
      it('rejects missing parentId with BadRequestException', async () => {
        await expect(service.registerUnit({ subcode: 'AST-01', parentId: '' })).rejects.toThrow(
          BadRequestException,
        );
      });

      it('rejects non-existent parent model with NotFoundException', async () => {
        const mockAsset = mockPrisma.asset as { findUnique: ReturnType<typeof vi.fn> };
        mockAsset.findUnique.mockResolvedValue(null);

        await expect(
          service.registerUnit({ subcode: 'AST-01', parentId: 'non-existent' }),
        ).rejects.toThrow(NotFoundException);
      });

      it('rejects parent that is itself a physical unit (parentId !== null) with BadRequestException', async () => {
        const mockAsset = mockPrisma.asset as { findUnique: ReturnType<typeof vi.fn> };
        mockAsset.findUnique.mockResolvedValue({ id: 'unit-parent', parentId: 'grandparent-mod' });

        await expect(
          service.registerUnit({ subcode: 'AST-01', parentId: 'unit-parent' }),
        ).rejects.toThrow(BadRequestException);
      });

      it('rejects duplicate subcode proactively with 409 ConflictException', async () => {
        const mockAsset = mockPrisma.asset as {
          findUnique: ReturnType<typeof vi.fn>;
          findFirst: ReturnType<typeof vi.fn>;
        };
        mockAsset.findUnique.mockResolvedValue({ id: 'mod-1', parentId: null });
        mockAsset.findFirst.mockResolvedValue({ id: 'existing-unit', subcode: 'AST-DELL-01' });

        await expect(
          service.registerUnit({ subcode: 'AST-DELL-01', parentId: 'mod-1' }),
        ).rejects.toThrow(ConflictException);
      });

      it('registers physical unit linked to parent device model', async () => {
        const mockAsset = mockPrisma.asset as {
          findUnique: ReturnType<typeof vi.fn>;
          findFirst: ReturnType<typeof vi.fn>;
          create: ReturnType<typeof vi.fn>;
        };
        mockAsset.findUnique
          .mockResolvedValueOnce({ id: 'mod-1', parentId: null, name: 'Dell Model' })
          .mockResolvedValueOnce({
            id: 'unit-1',
            subcode: 'AST-DELL-01',
            assetTag: 'AST-DELL-01',
            parentId: 'mod-1',
            name: 'Dell Model',
            status: AssetStatus.AVAILABLE,
            parent: { id: 'mod-1', assetCode: 'MOD-DELL', name: 'Dell Model' },
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        mockAsset.findFirst.mockResolvedValue(null);
        mockAsset.create.mockResolvedValue({ id: 'unit-1' });

        const unit = await service.registerUnit({ subcode: 'AST-DELL-01', parentId: 'mod-1' });
        expect(unit.id).toBe('unit-1');
        expect(unit.subcode).toBe('AST-DELL-01');
        expect(unit.parentId).toBe('mod-1');
      });
    });

    describe('issueUnit & checkinUnit', () => {
      it('rejects issuing a device model (parentId = null) with 400 BadRequestException', async () => {
        const mockAsset = mockPrisma.asset as { findUnique: ReturnType<typeof vi.fn> };
        mockAsset.findUnique.mockResolvedValue({ id: 'mod-1', parentId: null });

        await expect(service.issueUnit('mod-1', { assignedToId: 'usr-1' })).rejects.toThrow(
          BadRequestException,
        );
      });

      it('rejects issuing to a non-active directory user with 400 BadRequestException', async () => {
        const mockAsset = mockPrisma.asset as { findUnique: ReturnType<typeof vi.fn> };
        const mockDirUser = mockPrisma.directoryUser as { findFirst: ReturnType<typeof vi.fn> };
        mockAsset.findUnique.mockResolvedValue({ id: 'unit-1', parentId: 'mod-1' });
        mockDirUser.findFirst.mockResolvedValue({ id: 'usr-1', status: 'SUSPENDED' });

        await expect(service.issueUnit('unit-1', { assignedToId: 'usr-1' })).rejects.toThrow(
          BadRequestException,
        );
      });

      it('rejects issuing unit that is already IN_USE with 409 ConflictException', async () => {
        const mockAsset = mockPrisma.asset as { findUnique: ReturnType<typeof vi.fn> };
        const mockDirUser = mockPrisma.directoryUser as { findFirst: ReturnType<typeof vi.fn> };
        mockAsset.findUnique.mockResolvedValue({
          id: 'unit-1',
          parentId: 'mod-1',
          assignedToId: 'usr-other',
          status: AssetStatus.IN_USE,
        });
        mockDirUser.findFirst.mockResolvedValue({ id: 'usr-1', status: 'ACTIVE' });

        await expect(service.issueUnit('unit-1', { assignedToId: 'usr-1' })).rejects.toThrow(
          ConflictException,
        );
      });

      it('issues available physical unit to active directory user transitioning status to IN_USE', async () => {
        const mockAsset = mockPrisma.asset as {
          findUnique: ReturnType<typeof vi.fn>;
          update: ReturnType<typeof vi.fn>;
        };
        const mockDirUser = mockPrisma.directoryUser as { findFirst: ReturnType<typeof vi.fn> };
        mockAsset.findUnique
          .mockResolvedValueOnce({
            id: 'unit-1',
            parentId: 'mod-1',
            assignedToId: null,
            status: AssetStatus.AVAILABLE,
          })
          .mockResolvedValueOnce({
            id: 'unit-1',
            parentId: 'mod-1',
            assignedToId: 'usr-1',
            status: AssetStatus.IN_USE,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        mockDirUser.findFirst.mockResolvedValue({ id: 'usr-1', status: 'ACTIVE' });
        mockAsset.update.mockResolvedValue({ id: 'unit-1' });

        const issued = await service.issueUnit('unit-1', { assignedToId: 'usr-1' });
        expect(issued.status).toBe('Active');
        expect(mockAsset.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'unit-1' },
            data: expect.objectContaining({ assignedToId: 'usr-1', status: AssetStatus.IN_USE }),
          }),
        );
      });

      it('checks in unit returning assignedToId to null and status to AVAILABLE', async () => {
        const mockAsset = mockPrisma.asset as {
          findUnique: ReturnType<typeof vi.fn>;
          update: ReturnType<typeof vi.fn>;
        };
        mockAsset.findUnique
          .mockResolvedValueOnce({
            id: 'unit-1',
            parentId: 'mod-1',
            assignedToId: 'usr-1',
            status: AssetStatus.IN_USE,
          })
          .mockResolvedValueOnce({
            id: 'unit-1',
            parentId: 'mod-1',
            assignedToId: null,
            status: AssetStatus.AVAILABLE,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        mockAsset.update.mockResolvedValue({ id: 'unit-1' });

        const checkedIn = await service.checkinUnit('unit-1', 'Returned in good condition');
        expect(checkedIn.status).toBe('In Storage');
        expect(mockAsset.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'unit-1' },
            data: expect.objectContaining({ assignedToId: null, status: AssetStatus.AVAILABLE }),
          }),
        );
      });
    });

    describe('CostCenter CRUD', () => {
      it('createCostCenter: rejects duplicate code with 409 ConflictException', async () => {
        const mockCC = mockPrisma.costCenter as { findFirst: ReturnType<typeof vi.fn> };
        mockCC.findFirst.mockResolvedValue({ id: 'cc-1', code: 'IT-OPS' });

        await expect(
          service.createCostCenter({ code: 'IT-OPS', name: 'IT Operations' }),
        ).rejects.toThrow(ConflictException);
      });

      it('deleteCostCenter: rejects deletion when linked assets exist with 409 ConflictException', async () => {
        const mockCC = mockPrisma.costCenter as { findUnique: ReturnType<typeof vi.fn> };
        const mockAsset = mockPrisma.asset as { count: ReturnType<typeof vi.fn> };
        mockCC.findUnique.mockResolvedValue({ id: 'cc-1', code: 'IT-OPS' });
        mockAsset.count.mockResolvedValue(3);

        await expect(service.deleteCostCenter('cc-1')).rejects.toThrow(ConflictException);
      });

      it('deleteCostCenter: deletes cost center when zero linked assets exist', async () => {
        const mockCC = mockPrisma.costCenter as {
          findUnique: ReturnType<typeof vi.fn>;
          delete: ReturnType<typeof vi.fn>;
        };
        const mockAsset = mockPrisma.asset as { count: ReturnType<typeof vi.fn> };
        mockCC.findUnique.mockResolvedValue({ id: 'cc-1', code: 'IT-OPS' });
        mockAsset.count.mockResolvedValue(0);
        mockCC.delete.mockResolvedValue({ id: 'cc-1' });

        const res = await service.deleteCostCenter('cc-1');
        expect(res).toEqual({ success: true, id: 'cc-1' });
      });
    });
  });
});
