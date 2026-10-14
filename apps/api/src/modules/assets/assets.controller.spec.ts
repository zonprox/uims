import { BadRequestException } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import type { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AssetsController } from './assets.controller';
import type { AssetsService } from './assets.service';
import type { AllocateAssetDto } from './dto/allocate-asset.dto';
import type { BatchStockIntakeDto } from './dto/batch-stock-intake.dto';
import type { CreateDeviceModelDto } from './dto/create-device-model.dto';
import type { RegisterPhysicalUnitDto } from './dto/register-physical-unit.dto';
import type { ReturnAssetDto } from './dto/return-asset.dto';
import type { TransferAssetDto } from './dto/transfer-asset.dto';
import type { UpdateAssetDto } from './dto/update-asset.dto';

describe('AssetsController', () => {
  let controller: AssetsController;
  let mockAssetsService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockAssetsService = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      getStats: vi.fn(),
      exportCsv: vi.fn(),
      exportXlsx: vi.fn(),
      createModel: vi.fn(),
      registerUnit: vi.fn(),
      batchIntake: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      batchDelete: vi.fn(),
      getCategories: vi.fn(),
      getHandoverTemplateHtml: vi.fn(),
      getHandoverTemplateDocx: vi.fn(),
      generateHandoverDocx: vi.fn(),
      returnAsset: vi.fn(),
      generateHandoverDocument: vi.fn(),
      saveHandoverDocumentFile: vi.fn(),
      streamHandoverDocumentFile: vi.fn(),
      attachHandoverDocument: vi.fn(),
      allocate: vi.fn(),
      returnUnits: vi.fn(),
      transfer: vi.fn(),
    };

    controller = new AssetsController(mockAssetsService as unknown as AssetsService);
  });

  it('should call findAll with query filters', async () => {
    const mockAssets = [{ id: 'a1', tag: 'AST-1001', name: 'MacBook Pro' }];
    mockAssetsService.findAll.mockResolvedValue(mockAssets);

    const result = await controller.findAll({ search: 'MacBook', status: 'ACTIVE' });

    expect(mockAssetsService.findAll).toHaveBeenCalledWith({ search: 'MacBook', status: 'ACTIVE' });
    expect(result).toBe(mockAssets);
  });

  it('should call findOne by id', async () => {
    const mockAsset = { id: 'a1', tag: 'AST-1001' };
    mockAssetsService.findOne.mockResolvedValue(mockAsset);

    const result = await controller.findOne('a1');

    expect(mockAssetsService.findOne).toHaveBeenCalledWith('a1');
    expect(result).toBe(mockAsset);
  });

  it('should call createModel with CreateDeviceModelDto', async () => {
    const dto: CreateDeviceModelDto = {
      modelCode: 'MOD-DELL-5420',
      name: 'Dell Latitude 5420',
      categoryId: 'cat-1',
      manufacturer: 'Dell',
      unitCost: 1200,
    };
    const created = { id: 'm1', ...dto };
    mockAssetsService.createModel.mockResolvedValue(created);

    const result = await controller.createModel(dto);

    expect(mockAssetsService.createModel).toHaveBeenCalledWith(dto);
    expect(result).toBe(created);
  });

  it('should call registerUnit with RegisterPhysicalUnitDto', async () => {
    const dto: RegisterPhysicalUnitDto = {
      deviceModelId: 'm1',
      subcode: '001',
      serialNumber: 'SN99281',
      status: 'AVAILABLE',
    };
    const created = { id: 'a2', ...dto };
    mockAssetsService.registerUnit.mockResolvedValue(created);

    const result = await controller.registerUnit(dto);

    expect(mockAssetsService.registerUnit).toHaveBeenCalledWith(dto);
    expect(result).toBe(created);
  });

  it('should call batchIntake with model id and BatchStockIntakeDto when intakeModel is invoked', async () => {
    const modelId = 'mod-123';
    const dto: BatchStockIntakeDto = {
      deviceModelId: modelId,
      count: 3,
      tagPrefix: 'DELL-5420-',
      startSequence: 10,
    };
    const mockResult = {
      success: true,
      count: 3,
      modelId,
      modelCode: 'DELL-5420',
      units: [
        { id: 'u1', subcode: 'DELL-5420-010', assetTag: 'DELL-5420-010', status: 'AVAILABLE' },
      ],
    };
    mockAssetsService.batchIntake.mockResolvedValue(mockResult);

    const result = await controller.intakeModel(modelId, dto);

    expect(mockAssetsService.batchIntake).toHaveBeenCalledWith(modelId, dto);
    expect(result).toBe(mockResult);
  });

  it('should call update with id and UpdateAssetDto', async () => {
    const dto: UpdateAssetDto = {
      status: 'In Repair',
    };
    const updated = { id: 'a1', tag: 'AST-1001', status: 'In Repair' };
    mockAssetsService.update.mockResolvedValue(updated);

    const result = await controller.update('a1', dto);

    expect(mockAssetsService.update).toHaveBeenCalledWith('a1', dto);
    expect(result).toBe(updated);
  });

  it('should call remove by id', async () => {
    mockAssetsService.remove.mockResolvedValue({ success: true, id: 'a1' });

    const result = await controller.remove('a1');

    expect(mockAssetsService.remove).toHaveBeenCalledWith('a1');
    expect(result).toEqual({ success: true, id: 'a1' });
  });

  it('should return asset stats', async () => {
    const stats = { total: 10, active: 8, inRepair: 1, inStorage: 1, retired: 0 };
    mockAssetsService.getStats.mockResolvedValue(stats);

    const result = await controller.getStats();

    expect(mockAssetsService.getStats).toHaveBeenCalled();
    expect(result).toBe(stats);
  });

  it('should call getCategories and return categories list', async () => {
    const mockCats = [{ id: 'cat-1', name: 'Laptops', code: 'LAPTOPS', parentId: null }];
    mockAssetsService.getCategories.mockResolvedValue(mockCats);

    const result = await controller.getCategories();

    expect(mockAssetsService.getCategories).toHaveBeenCalled();
    expect(result).toBe(mockCats);
  });

  describe('exportXlsx', () => {
    it('should forward export query and express response to service', async () => {
      const mockRes = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        end: vi.fn(),
      } as unknown as Response;

      mockAssetsService.exportXlsx.mockResolvedValue(undefined);

      await controller.exportXlsx({ status: 'ACTIVE' }, mockRes);

      expect(mockAssetsService.exportXlsx).toHaveBeenCalledWith({ status: 'ACTIVE' }, mockRes);
    });
  });

  describe('batchDelete', () => {
    it('should call service batchDelete with array of IDs via POST batch-delete', async () => {
      const mockResult = { count: 2, deletedIds: ['a1', 'a2'] };
      mockAssetsService.batchDelete.mockResolvedValue(mockResult);

      const result = await controller.batchDelete({ ids: ['a1', 'a2'] });

      expect(mockAssetsService.batchDelete).toHaveBeenCalledWith(['a1', 'a2']);
      expect(result).toEqual(mockResult);
    });
  });

  describe('handover-template & return', () => {
    it('should set response headers and stream handover template DOCX by default', async () => {
      const mockRes = {
        setHeader: vi.fn(),
        send: vi.fn(),
      } as unknown as Response;

      mockAssetsService.getHandoverTemplateDocx.mockResolvedValue({
        buffer: Buffer.from('mock-docx-data'),
        filename: 'asset_handover_template.docx',
      });

      await controller.getHandoverTemplate('assignment', mockRes);

      expect(mockAssetsService.getHandoverTemplateDocx).toHaveBeenCalledWith('assignment');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="asset_handover_template.docx"',
      );
      expect(mockRes.send).toHaveBeenCalledWith(Buffer.from('mock-docx-data'));
    });

    it('should set response headers and stream handover template HTML when requested', async () => {
      const mockRes = {
        setHeader: vi.fn(),
        send: vi.fn(),
      } as unknown as Response;

      mockAssetsService.getHandoverTemplateHtml.mockReturnValue(
        '<!DOCTYPE html><html>Template</html>',
      );

      await controller.getHandoverTemplate('assignment', mockRes, 'html');

      expect(mockAssetsService.getHandoverTemplateHtml).toHaveBeenCalledWith('assignment');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html; charset=utf-8');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="asset_assignment_template.html"',
      );
      expect(mockRes.send).toHaveBeenCalledWith('<!DOCTYPE html><html>Template</html>');
    });

    it('should call service returnAsset with ID and ReturnAssetDto', async () => {
      const returnDto = {
        status: 'In Storage',
        conditionNotes: 'All parts inspected',
        signedDocUrl: '/api/v1/assets/handover-documents/file/record.pdf',
      };
      const mockResult = { id: 'ast-1', status: 'In Storage', hasPendingRecord: false };
      mockAssetsService.returnAsset.mockResolvedValue(mockResult);

      const result = await controller.returnAsset('ast-1', returnDto);

      expect(mockAssetsService.returnAsset).toHaveBeenCalledWith('ast-1', returnDto);
      expect(result).toBe(mockResult);
    });
  });

  describe('handover-documents endpoints', () => {
    it('should call generateHandoverDocument via POST with body DTO', async () => {
      const dto = {
        type: 'assignment' as const,
        assetIds: ['ast-1', 'ast-2'],
        recipientId: 'usr-1',
        conditionNotes: 'Good',
      };
      const mockDoc = {
        html: '<html>Handover</html>',
        title: 'HARDWARE ASSET HANDOVER RECORD',
        filename: 'asset_handover_2026-10-13_hor.html',
        generatedAt: '2026-10-13T00:00:00.000Z',
      };
      mockAssetsService.generateHandoverDocument.mockResolvedValue(mockDoc);

      const result = await controller.generateHandoverDocument(dto);

      expect(mockAssetsService.generateHandoverDocument).toHaveBeenCalledWith(dto);
      expect(result).toBe(mockDoc);
    });

    it('should call generateHandoverDocumentGet via GET with query params', async () => {
      const mockDoc = {
        html: '<html>Return</html>',
        title: 'HARDWARE ASSET RETURN RECORD',
        filename: 'asset_return_2026-10-13_ret.html',
        generatedAt: '2026-10-13T00:00:00.000Z',
      };
      mockAssetsService.generateHandoverDocument.mockResolvedValue(mockDoc);

      const result = await controller.generateHandoverDocumentGet(
        'return',
        'ast-1,ast-2',
        'usr-2',
        undefined,
        'Inspection done',
      );

      expect(mockAssetsService.generateHandoverDocument).toHaveBeenCalledWith({
        type: 'return',
        assetIds: ['ast-1', 'ast-2'],
        recipientId: 'usr-2',
        transferorId: undefined,
        conditionNotes: 'Inspection done',
      });
      expect(result).toBe(mockDoc);
    });

    it('should throw BadRequestException when invalid type is provided to generateHandoverDocumentGet', async () => {
      expect(() =>
        controller.generateHandoverDocumentGet(
          'invalid' as unknown as 'assignment',
          undefined,
          undefined,
          undefined,
        ),
      ).toThrow(BadRequestException);
    });

    it('should call uploadHandoverDocument with file and trimmed assetId', async () => {
      const file = {
        originalname: 'signed.pdf',
        mimetype: 'application/pdf',
        size: 2048,
        buffer: Buffer.from('pdf-data'),
      } as Express.Multer.File;

      const mockUploadResult = {
        fileUrl: '/api/v1/assets/handover-documents/file/hor-signed.pdf',
        fileName: 'hor-signed.pdf',
        originalName: 'signed.pdf',
        size: 2048,
        mimeType: 'application/pdf',
      };
      mockAssetsService.saveHandoverDocumentFile.mockResolvedValue(mockUploadResult);

      const result = await controller.uploadHandoverDocument(file, '  ast-10  ');

      expect(mockAssetsService.saveHandoverDocumentFile).toHaveBeenCalledWith(file, 'ast-10');
      expect(result).toBe(mockUploadResult);

      await controller.uploadHandoverDocument(file, '   ');
      expect(mockAssetsService.saveHandoverDocumentFile).toHaveBeenCalledWith(file, undefined);
    });

    it('should call getHandoverDocumentFile with filename, download query, and response', async () => {
      const mockRes = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as Response;

      await controller.getHandoverDocumentFile('sample.pdf', undefined, mockRes);

      expect(mockAssetsService.streamHandoverDocumentFile).toHaveBeenCalledWith(
        'sample.pdf',
        mockRes,
        false,
      );

      await controller.getHandoverDocumentFile('sample.pdf', 'true', mockRes);
      expect(mockAssetsService.streamHandoverDocumentFile).toHaveBeenCalledWith(
        'sample.pdf',
        mockRes,
        true,
      );
    });

    it('should call attachHandoverDocument with asset id, fileUrl, and notes', async () => {
      const attachDto = {
        fileUrl: '/files/signed-record.pdf',
        notes: 'Handover signed by John Doe',
      };
      const mockAsset = { id: 'ast-5', hasPendingRecord: false };
      mockAssetsService.attachHandoverDocument.mockResolvedValue(mockAsset);

      const result = await controller.attachHandoverDocument('ast-5', attachDto);

      expect(mockAssetsService.attachHandoverDocument).toHaveBeenCalledWith(
        'ast-5',
        attachDto.fileUrl,
        undefined,
        attachDto.notes,
      );
      expect(result).toBe(mockAsset);
    });
  });

  describe('Custody Workflows Endpoints', () => {
    it('should delegate allocate to AssetsService.allocate', async () => {
      const dto: AllocateAssetDto = {
        assetIds: ['ast-1', 'ast-2'],
        assignedToId: 'usr-1',
        conditionNotes: 'Initial allocation',
      };
      const mockResult = {
        success: true,
        count: 2,
        allocatedIds: ['ast-1', 'ast-2'],
        assignedToId: 'usr-1',
        hasPendingRecord: true,
      };
      mockAssetsService.allocate.mockResolvedValue(mockResult);

      const result = await controller.allocate(dto);

      expect(mockAssetsService.allocate).toHaveBeenCalledWith(dto);
      expect(result).toBe(mockResult);
    });

    it('should delegate returnUnits to AssetsService.returnUnits', async () => {
      const dto: ReturnAssetDto = {
        assetIds: ['ast-1'],
        targetStatus: 'AVAILABLE',
        conditionNotes: 'Returned intact',
      };
      const mockResult = {
        success: true,
        count: 1,
        returnedIds: ['ast-1'],
        status: 'AVAILABLE',
        hasPendingRecord: false,
      };
      mockAssetsService.returnUnits.mockResolvedValue(mockResult);

      const result = await controller.returnUnits(dto);

      expect(mockAssetsService.returnUnits).toHaveBeenCalledWith(dto);
      expect(result).toBe(mockResult);
    });

    it('should delegate transfer to AssetsService.transfer', async () => {
      const dto: TransferAssetDto = {
        assetIds: ['ast-1'],
        toUserId: 'usr-2',
        conditionNotes: 'Handover between staff',
      };
      const mockResult = {
        success: true,
        count: 1,
        transferredIds: ['ast-1'],
        toUserId: 'usr-2',
        hasPendingRecord: true,
      };
      mockAssetsService.transfer.mockResolvedValue(mockResult);

      const result = await controller.transfer(dto);

      expect(mockAssetsService.transfer).toHaveBeenCalledWith(dto);
      expect(result).toBe(mockResult);
    });
  });

  describe('Route Precedence & Security Metadata', () => {
    it('should declare export and batch endpoints prior to parameterized :id routes to prevent shadowing', () => {
      const propertyNames = Object.getOwnPropertyNames(AssetsController.prototype);

      const exportIndex = propertyNames.indexOf('exportXlsx');
      const batchDeleteIndex = propertyNames.indexOf('batchDelete');
      const generateDocIndex = propertyNames.indexOf('generateHandoverDocument');
      const uploadDocIndex = propertyNames.indexOf('uploadHandoverDocument');
      const serveDocIndex = propertyNames.indexOf('getHandoverDocumentFile');
      const allocateIndex = propertyNames.indexOf('allocate');
      const returnUnitsIndex = propertyNames.indexOf('returnUnits');
      const transferIndex = propertyNames.indexOf('transfer');
      const findOneIndex = propertyNames.indexOf('findOne');
      const removeIndex = propertyNames.indexOf('remove');

      expect(exportIndex).toBeGreaterThan(-1);
      expect(batchDeleteIndex).toBeGreaterThan(-1);
      expect(generateDocIndex).toBeGreaterThan(-1);
      expect(uploadDocIndex).toBeGreaterThan(-1);
      expect(serveDocIndex).toBeGreaterThan(-1);
      expect(allocateIndex).toBeGreaterThan(-1);
      expect(returnUnitsIndex).toBeGreaterThan(-1);
      expect(transferIndex).toBeGreaterThan(-1);
      expect(findOneIndex).toBeGreaterThan(-1);
      expect(removeIndex).toBeGreaterThan(-1);

      // Verify declaration order on prototype: static and subpath routes must precede :id
      expect(exportIndex).toBeLessThan(findOneIndex);
      expect(batchDeleteIndex).toBeLessThan(removeIndex);
      expect(generateDocIndex).toBeLessThan(findOneIndex);
      expect(uploadDocIndex).toBeLessThan(findOneIndex);
      expect(serveDocIndex).toBeLessThan(findOneIndex);
      expect(allocateIndex).toBeLessThan(findOneIndex);
      expect(returnUnitsIndex).toBeLessThan(findOneIndex);
      expect(transferIndex).toBeLessThan(findOneIndex);
    });

    it('should have correct route paths registered in NestJS metadata', () => {
      const batchPath = Reflect.getMetadata(PATH_METADATA, AssetsController.prototype.batchDelete);
      const exportPath = Reflect.getMetadata(PATH_METADATA, AssetsController.prototype.exportXlsx);
      const allocatePath = Reflect.getMetadata(PATH_METADATA, AssetsController.prototype.allocate);
      const returnPath = Reflect.getMetadata(PATH_METADATA, AssetsController.prototype.returnUnits);
      const transferPath = Reflect.getMetadata(PATH_METADATA, AssetsController.prototype.transfer);

      expect(batchPath).toBe('batch-delete');
      expect(exportPath).toBe('export.xlsx');
      expect(allocatePath).toBe('allocate');
      expect(returnPath).toBe('return');
      expect(transferPath).toBe('transfer');
    });

    it('should enforce JwtAuthGuard, RolesGuard and Admin roles on batch delete endpoints', () => {
      const guards = Reflect.getMetadata('__guards__', AssetsController.prototype.batchDelete);
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(RolesGuard);

      const roles = Reflect.getMetadata('roles', AssetsController.prototype.batchDelete);
      expect(roles).toEqual(['Admin', 'Super Admin']);
    });

    it('should enforce JwtAuthGuard, RolesGuard and Admin roles on custody endpoints', () => {
      for (const handler of [
        AssetsController.prototype.allocate,
        AssetsController.prototype.returnUnits,
        AssetsController.prototype.transfer,
      ]) {
        const guards = Reflect.getMetadata('__guards__', handler);
        expect(guards).toContain(JwtAuthGuard);
        expect(guards).toContain(RolesGuard);

        const roles = Reflect.getMetadata('roles', handler);
        expect(roles).toEqual(['Admin', 'Super Admin']);
      }
    });

    it('should enforce JwtAuthGuard, RolesGuard and Admin roles on intakeModel endpoint', () => {
      const guards = Reflect.getMetadata('__guards__', AssetsController.prototype.intakeModel);
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(RolesGuard);

      const roles = Reflect.getMetadata('roles', AssetsController.prototype.intakeModel);
      expect(roles).toEqual(['Admin', 'Super Admin']);

      const routePath = Reflect.getMetadata(PATH_METADATA, AssetsController.prototype.intakeModel);
      expect(routePath).toBe('models/:id/intake');
    });
  });
});
