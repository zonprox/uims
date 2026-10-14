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
        items: [{ id: 'm-1', modelCode: 'MOD-DELL' }],
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
      const dto: CreateDeviceModelDto = {
        modelCode: 'MOD-MBP-14',
        name: 'MacBook Pro 14"',
        categoryId: 'cat-1',
        manufacturer: 'Apple',
      };
      const created = { id: 'm-2', ...dto };
      mockAssetsService.createModel.mockResolvedValue(created);

      const res = await controller.createModel(dto);
      expect(mockAssetsService.createModel).toHaveBeenCalledWith(dto);
      expect(res).toBe(created);
    });

    it('getModel: fetches model details by ID', async () => {
      const model = { id: 'm-1', modelCode: 'MOD-DELL', totalUnits: 5 };
      mockAssetsService.getModel.mockResolvedValue(model);

      const res = await controller.getModel('m-1');
      expect(mockAssetsService.getModel).toHaveBeenCalledWith('m-1');
      expect(res).toBe(model);
    });

    it('updateModel: forwards UpdateDeviceModelDto to service', async () => {
      const dto: UpdateDeviceModelDto = { name: 'Dell Latitude 5430' };
      const updated = { id: 'm-1', modelCode: 'MOD-DELL', name: 'Dell Latitude 5430' };
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

    it('getModelUnits: delegates to getModelUnits with model ID', async () => {
      const mockUnits = { items: [{ id: 'u-1', subcode: 'AST-01' }], total: 1 };
      mockAssetsService.getModelUnits.mockResolvedValue(mockUnits);

      const res = await controller.getModelUnits('m-1', { page: 1 });
      expect(mockAssetsService.getModelUnits).toHaveBeenCalledWith('m-1', { page: 1 });
      expect(res).toBe(mockUnits);
    });

    it('registerUnit: delegates to registerUnit', async () => {
      const dto: RegisterPhysicalUnitDto = {
        deviceModelId: 'm-1',
        subcode: 'AST-DELL-01',
      };
      const created = { id: 'u-1', ...dto };
      mockAssetsService.registerUnit.mockResolvedValue(created);

      const res = await controller.registerUnit(dto);
      expect(mockAssetsService.registerUnit).toHaveBeenCalledWith(dto);
      expect(res).toBe(created);
    });

    it('getUnit: fetches physical unit details', async () => {
      const unit = { id: 'u-1', subcode: 'AST-01' };
      mockAssetsService.getUnit.mockResolvedValue(unit);

      const res = await controller.getUnit('u-1');
      expect(mockAssetsService.getUnit).toHaveBeenCalledWith('u-1');
      expect(res).toBe(unit);
    });

    it('issueUnit: delegates unit issuance with user data', async () => {
      const dto: IssueAssetUnitDto = { assignedToId: 'usr-1', notes: 'Setup' };
      const issued = { id: 'u-1', status: 'IN_USE', assignedToId: 'usr-1' };
      mockAssetsService.issueUnit.mockResolvedValue(issued);

      const res = await controller.issueUnit('u-1', dto);
      expect(mockAssetsService.issueUnit).toHaveBeenCalledWith('u-1', dto);
      expect(res).toBe(issued);
    });

    it('checkinUnit: delegates unit checkin with notes', async () => {
      const checkedIn = { id: 'u-1', status: 'AVAILABLE', assignedToId: null };
      mockAssetsService.checkinUnit.mockResolvedValue(checkedIn);

      const res = await controller.checkinUnit('u-1', { notes: 'Returned' });
      expect(mockAssetsService.checkinUnit).toHaveBeenCalledWith('u-1', 'Returned');
      expect(res).toBe(checkedIn);
    });

    it('Cost Center endpoints: delegates to service', async () => {
      const ccDto: CreateCostCenterDto = { code: 'IT-OPS', name: 'IT Operations' };
      mockAssetsService.createCostCenter.mockResolvedValue({ id: 'cc-1', ...ccDto });
      mockAssetsService.listCostCenters.mockResolvedValue([{ id: 'cc-1', ...ccDto }]);
      mockAssetsService.getCostCenter.mockResolvedValue({ id: 'cc-1', ...ccDto });
      mockAssetsService.updateCostCenter.mockResolvedValue({ id: 'cc-1', name: 'IT Ops Updated' });
      mockAssetsService.deleteCostCenter.mockResolvedValue({ success: true, id: 'cc-1' });

      expect(await controller.createCostCenter(ccDto)).toEqual({ id: 'cc-1', ...ccDto });
      expect(await controller.getCostCenters()).toEqual([{ id: 'cc-1', ...ccDto }]);
      expect(await controller.getCostCenter('cc-1')).toEqual({ id: 'cc-1', ...ccDto });
      expect(await controller.updateCostCenter('cc-1', { name: 'IT Ops Updated' })).toEqual({
        id: 'cc-1',
        name: 'IT Ops Updated',
      });
      expect(await controller.deleteCostCenter('cc-1')).toEqual({ success: true, id: 'cc-1' });
    });
  });

  describe('AssetsService Hierarchy Logic', () => {
    let service: AssetsService;
    let mockPrisma: {
      $transaction: ReturnType<typeof vi.fn>;
      deviceModel: {
        create: ReturnType<typeof vi.fn>;
        findMany: ReturnType<typeof vi.fn>;
        findUnique: ReturnType<typeof vi.fn>;
        findFirst: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
        count: ReturnType<typeof vi.fn>;
      };
      asset: {
        create: ReturnType<typeof vi.fn>;
        createMany: ReturnType<typeof vi.fn>;
        findMany: ReturnType<typeof vi.fn>;
        findUnique: ReturnType<typeof vi.fn>;
        findFirst: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        updateMany: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
        deleteMany: ReturnType<typeof vi.fn>;
        count: ReturnType<typeof vi.fn>;
        groupBy: ReturnType<typeof vi.fn>;
      };
      assetHandoverRecord: {
        create: ReturnType<typeof vi.fn>;
        createMany: ReturnType<typeof vi.fn>;
        findFirst: ReturnType<typeof vi.fn>;
        findUnique: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
      };
      costCenter: {
        create: ReturnType<typeof vi.fn>;
        findMany: ReturnType<typeof vi.fn>;
        findUnique: ReturnType<typeof vi.fn>;
        findFirst: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
      };
      assetCategory: {
        findFirst: ReturnType<typeof vi.fn>;
        findUnique: ReturnType<typeof vi.fn>;
      };
      directoryUser: {
        findUnique: ReturnType<typeof vi.fn>;
        findFirst: ReturnType<typeof vi.fn>;
      };
      vendor: {
        findUnique: ReturnType<typeof vi.fn>;
      };
    };

    beforeEach(() => {
      mockPrisma = {
        $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(mockPrisma)),
        deviceModel: {
          create: vi.fn(),
          findMany: vi.fn(),
          findUnique: vi.fn(),
          findFirst: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          count: vi.fn(),
        },
        asset: {
          create: vi.fn(),
          createMany: vi.fn(),
          findMany: vi.fn().mockResolvedValue([]),
          findUnique: vi.fn(),
          findFirst: vi.fn(),
          update: vi.fn(),
          updateMany: vi.fn(),
          delete: vi.fn(),
          deleteMany: vi.fn(),
          count: vi.fn().mockResolvedValue(0),
          groupBy: vi.fn().mockResolvedValue([]),
        },
        assetHandoverRecord: {
          create: vi.fn(),
          createMany: vi.fn(),
          findFirst: vi.fn(),
          findUnique: vi.fn(),
          update: vi.fn(),
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
          findUnique: vi.fn().mockResolvedValue({ id: 'cat-1', name: 'Laptops' }),
        },
        directoryUser: {
          findUnique: vi.fn(),
          findFirst: vi.fn(),
        },
        vendor: {
          findUnique: vi.fn(),
        },
      };

      service = new AssetsService(
        mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
      );
    });

    describe('createModel', () => {
      it('rejects empty or whitespace modelCode with BadRequestException', async () => {
        await expect(
          service.createModel({
            modelCode: '   ',
            name: 'Model A',
            categoryId: 'cat-1',
            manufacturer: 'Dell',
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('rejects empty name with BadRequestException', async () => {
        await expect(
          service.createModel({
            modelCode: 'MOD-1',
            name: '  ',
            categoryId: 'cat-1',
            manufacturer: 'Dell',
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('rejects negative unitCost with BadRequestException', async () => {
        await expect(
          service.createModel({
            modelCode: 'MOD-1',
            name: 'Model A',
            categoryId: 'cat-1',
            manufacturer: 'Dell',
            unitCost: -50,
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('rejects duplicate modelCode proactively with 409 ConflictException', async () => {
        mockPrisma.deviceModel.findUnique.mockResolvedValue({
          id: 'existing-mod',
          modelCode: 'MOD-DELL',
        });

        await expect(
          service.createModel({
            modelCode: 'MOD-DELL',
            name: 'Dell Model',
            categoryId: 'cat-1',
            manufacturer: 'Dell',
          }),
        ).rejects.toThrow(ConflictException);
      });

      it('creates device model in DeviceModel table with relations', async () => {
        mockPrisma.deviceModel.findUnique.mockResolvedValueOnce(null); // uniqueness check
        mockPrisma.deviceModel.create.mockResolvedValue({
          id: 'mod-1',
          modelCode: 'MOD-DELL-5420',
          name: 'Dell Latitude 5420',
          categoryId: 'cat-1',
          manufacturer: 'Dell',
          unitCost: 1200,
          minThreshold: 5,
          binNumber: 'BIN-1',
          specifications: {},
          deletedAt: null,
          category: { id: 'cat-1', name: 'Laptops' },
          vendor: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // getModel mock
        mockPrisma.deviceModel.findUnique.mockResolvedValueOnce({
          id: 'mod-1',
          modelCode: 'MOD-DELL-5420',
          name: 'Dell Latitude 5420',
          categoryId: 'cat-1',
          manufacturer: 'Dell',
          unitCost: 1200,
          minThreshold: 5,
          binNumber: 'BIN-1',
          specifications: {},
          deletedAt: null,
          category: { id: 'cat-1', name: 'Laptops' },
          vendor: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        mockPrisma.asset.groupBy.mockResolvedValue([]);

        const result = await service.createModel({
          modelCode: 'MOD-DELL-5420',
          name: 'Dell Latitude 5420',
          categoryId: 'cat-1',
          manufacturer: 'Dell',
          unitCost: 1200,
        });

        expect(result.id).toBe('mod-1');
        expect(result.modelCode).toBe('MOD-DELL-5420');
        expect(result.name).toBe('Dell Latitude 5420');
        expect(mockPrisma.deviceModel.create).toHaveBeenCalled();
      });
    });

    describe('deleteModel', () => {
      it('blocks deletion when child physical units exist with 409 ConflictException', async () => {
        mockPrisma.deviceModel.findUnique.mockResolvedValue({
          id: 'mod-1',
          name: 'Model with units',
          deletedAt: null,
        });
        mockPrisma.asset.count.mockResolvedValue(3);

        await expect(service.deleteModel('mod-1')).rejects.toThrow(ConflictException);
      });

      it('deletes model when zero child units exist', async () => {
        mockPrisma.deviceModel.findUnique.mockResolvedValue({
          id: 'mod-1',
          name: 'Model without units',
          deletedAt: null,
        });
        mockPrisma.asset.count.mockResolvedValue(0);
        mockPrisma.deviceModel.delete.mockResolvedValue({ id: 'mod-1' });

        const result = await service.deleteModel('mod-1');
        expect(result.id).toBe('mod-1');
        expect(result.success).toBe(true);
      });
    });

    describe('registerUnit', () => {
      it('rejects missing deviceModelId with BadRequestException', async () => {
        await expect(
          service.registerUnit({ subcode: 'AST-01', deviceModelId: '' }),
        ).rejects.toThrow(BadRequestException);
      });

      it('rejects non-existent parent model with NotFoundException', async () => {
        mockPrisma.deviceModel.findUnique.mockResolvedValue(null);

        await expect(
          service.registerUnit({ subcode: 'AST-01', deviceModelId: 'non-existent' }),
        ).rejects.toThrow(NotFoundException);
      });

      it('rejects duplicate subcode proactively with 409 ConflictException', async () => {
        mockPrisma.deviceModel.findUnique.mockResolvedValue({ id: 'mod-1', deletedAt: null });
        mockPrisma.asset.findFirst.mockResolvedValue({
          id: 'existing-unit',
          subcode: 'AST-DELL-01',
        });

        await expect(
          service.registerUnit({ subcode: 'AST-DELL-01', deviceModelId: 'mod-1' }),
        ).rejects.toThrow(ConflictException);
      });

      it('registers physical unit linked to parent device model', async () => {
        mockPrisma.deviceModel.findUnique.mockResolvedValue({ id: 'mod-1', deletedAt: null });
        mockPrisma.asset.findFirst.mockResolvedValue(null);
        mockPrisma.asset.create.mockResolvedValue({ id: 'unit-1' });

        // getUnit mock
        mockPrisma.asset.findUnique.mockResolvedValue({
          id: 'unit-1',
          deviceModelId: 'mod-1',
          subcode: 'AST-DELL-01',
          assetTag: 'AST-DELL-01',
          serialNumber: 'SN-12345',
          status: AssetStatus.AVAILABLE,
          assignedToId: null,
          departmentId: null,
          costCenterId: null,
          deviceModel: {
            id: 'mod-1',
            name: 'Dell Latitude 5420',
            modelCode: 'MOD-DELL-5420',
            manufacturer: 'Dell',
            categoryId: 'cat-1',
            unitCost: 1200,
            minThreshold: 5,
            binNumber: 'BIN-1',
            category: { id: 'cat-1', name: 'Laptops' },
          },
          handoverRecords: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const unit = await service.registerUnit({ subcode: 'AST-DELL-01', deviceModelId: 'mod-1' });
        expect(unit.id).toBe('unit-1');
        expect(unit.subcode).toBe('AST-DELL-01');
        expect(unit.deviceModelId).toBe('mod-1');
      });
    });

    describe('issueUnit & checkinUnit', () => {
      it('rejects issuing to a non-active directory user with 400 BadRequestException', async () => {
        mockPrisma.directoryUser.findFirst.mockResolvedValue({ id: 'usr-1', status: 'SUSPENDED' });

        await expect(service.issueUnit('unit-1', { assignedToId: 'usr-1' })).rejects.toThrow(
          BadRequestException,
        );
      });

      it('rejects issuing unit that is not AVAILABLE with 409 ConflictException', async () => {
        mockPrisma.directoryUser.findFirst.mockResolvedValue({
          id: 'usr-1',
          status: 'ACTIVE',
          departmentId: 'dept-1',
        });
        mockPrisma.directoryUser.findUnique.mockResolvedValue({
          id: 'usr-1',
          departmentId: 'dept-1',
        });
        mockPrisma.asset.findMany.mockResolvedValue([
          {
            id: 'unit-1',
            status: AssetStatus.IN_USE,
            assignedToId: 'usr-other',
            subcode: 'AST-01',
          },
        ]);

        await expect(service.issueUnit('unit-1', { assignedToId: 'usr-1' })).rejects.toThrow(
          ConflictException,
        );
      });

      it('issues available physical unit to active directory user transitioning status to IN_USE', async () => {
        mockPrisma.directoryUser.findFirst.mockResolvedValue({
          id: 'usr-1',
          status: 'ACTIVE',
          departmentId: 'dept-1',
        });
        mockPrisma.directoryUser.findUnique.mockResolvedValue({
          id: 'usr-1',
          departmentId: 'dept-1',
        });
        mockPrisma.asset.findMany.mockResolvedValue([
          {
            id: 'unit-1',
            status: AssetStatus.AVAILABLE,
            assignedToId: null,
            subcode: 'AST-01',
          },
        ]);
        mockPrisma.asset.updateMany.mockResolvedValue({ count: 1 });
        mockPrisma.assetHandoverRecord.createMany.mockResolvedValue({ count: 1 });

        // getUnit mock
        mockPrisma.asset.findUnique.mockResolvedValue({
          id: 'unit-1',
          deviceModelId: 'mod-1',
          subcode: 'AST-01',
          assetTag: 'AST-01',
          status: AssetStatus.IN_USE,
          assignedToId: 'usr-1',
          assignedTo: { id: 'usr-1', firstName: 'John', lastName: 'Doe' },
          deviceModel: { id: 'mod-1', name: 'Dell Laptop' },
          handoverRecords: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const issued = await service.issueUnit('unit-1', { assignedToId: 'usr-1' });
        expect(issued.status).toBe('Active');
        expect(issued.assignedToId).toBe('usr-1');
      });

      it('checks in unit returning assignedToId to null and status to AVAILABLE', async () => {
        mockPrisma.asset.findUnique.mockResolvedValueOnce({
          id: 'unit-1',
          deviceModelId: 'mod-1',
          status: AssetStatus.IN_USE,
          assignedToId: 'usr-1',
        });
        mockPrisma.asset.findMany.mockResolvedValue([
          {
            id: 'unit-1',
            status: AssetStatus.IN_USE,
            assignedToId: 'usr-1',
            notes: null,
          },
        ]);
        mockPrisma.asset.updateMany.mockResolvedValue({ count: 1 });
        mockPrisma.assetHandoverRecord.create.mockResolvedValue({ id: 'rec-1' });

        // getUnit mock
        mockPrisma.asset.findUnique.mockResolvedValueOnce({
          id: 'unit-1',
          deviceModelId: 'mod-1',
          subcode: 'AST-01',
          assetTag: 'AST-01',
          status: AssetStatus.AVAILABLE,
          assignedToId: null,
          deviceModel: { id: 'mod-1', name: 'Dell Laptop' },
          handoverRecords: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const checkedIn = await service.checkinUnit('unit-1', 'Returned in good condition');
        expect(checkedIn.status).toBe('In Storage');
        expect(checkedIn.assignedToId).toBeNull();
      });
    });

    describe('CostCenter CRUD', () => {
      it('createCostCenter: rejects duplicate code with 409 ConflictException', async () => {
        mockPrisma.costCenter.findFirst.mockResolvedValue({ id: 'cc-1', code: 'IT-OPS' });

        await expect(
          service.createCostCenter({ code: 'IT-OPS', name: 'IT Operations' }),
        ).rejects.toThrow(ConflictException);
      });

      it('deleteCostCenter: rejects deletion when linked assets exist with 409 ConflictException', async () => {
        mockPrisma.costCenter.findUnique.mockResolvedValue({ id: 'cc-1', code: 'IT-OPS' });
        mockPrisma.asset.count.mockResolvedValue(3);

        await expect(service.deleteCostCenter('cc-1')).rejects.toThrow(ConflictException);
      });

      it('deleteCostCenter: deletes cost center when zero linked assets exist', async () => {
        mockPrisma.costCenter.findUnique.mockResolvedValue({ id: 'cc-1', code: 'IT-OPS' });
        mockPrisma.asset.count.mockResolvedValue(0);
        mockPrisma.costCenter.delete.mockResolvedValue({ id: 'cc-1' });

        const res = await service.deleteCostCenter('cc-1');
        expect(res).toEqual({ success: true, id: 'cc-1' });
      });
    });
  });
});
