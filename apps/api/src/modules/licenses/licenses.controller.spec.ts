import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateLicenseDto } from './dto/create-license.dto';
import type { UpdateLicenseDto } from './dto/update-license.dto';
import { LicensesController } from './licenses.controller';
import type { LicensesService } from './licenses.service';

describe('LicensesController', () => {
  let controller: LicensesController;
  let mockLicensesService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockLicensesService = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      getStats: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };

    controller = new LicensesController(mockLicensesService as unknown as LicensesService);
  });

  it('should call findAll with query params', async () => {
    const mockLicenses = [{ id: 'l1', name: 'Microsoft 365' }];
    mockLicensesService.findAll.mockResolvedValue(mockLicenses);

    const result = await controller.findAll({ search: 'Microsoft' });

    expect(mockLicensesService.findAll).toHaveBeenCalledWith({ search: 'Microsoft' });
    expect(result).toBe(mockLicenses);
  });

  it('should call create with CreateLicenseDto', async () => {
    const dto: CreateLicenseDto = {
      name: 'Figma Enterprise',
      vendor: 'Figma Inc',
      type: 'SUBSCRIPTION',
      totalSeats: 35,
      costPerSeat: 540,
    };
    const created = { id: 'l2', ...dto };
    mockLicensesService.create.mockResolvedValue(created);

    const result = await controller.create(dto);

    expect(mockLicensesService.create).toHaveBeenCalledWith(dto);
    expect(result).toBe(created);
  });

  it('should call update with id and UpdateLicenseDto', async () => {
    const dto: UpdateLicenseDto = {
      totalSeats: 40,
    };
    const updated = { id: 'l1', totalSeats: 40 };
    mockLicensesService.update.mockResolvedValue(updated);

    const result = await controller.update('l1', dto);

    expect(mockLicensesService.update).toHaveBeenCalledWith('l1', dto);
    expect(result).toBe(updated);
  });

  it('should call remove with id', async () => {
    mockLicensesService.remove.mockResolvedValue({ success: true, id: 'l1' });

    const result = await controller.remove('l1');

    expect(mockLicensesService.remove).toHaveBeenCalledWith('l1');
    expect(result).toEqual({ success: true, id: 'l1' });
  });

  it('should return license stats', async () => {
    const stats = {
      totalActiveLicenses: 12,
      expiringWithin90Days: 2,
      annualSubscriptionCost: 154000,
      averageSeatUtilizationRate: '91.4%',
    };
    mockLicensesService.getStats.mockResolvedValue(stats);

    const result = await controller.getStats();

    expect(mockLicensesService.getStats).toHaveBeenCalled();
    expect(result).toBe(stats);
  });
});
