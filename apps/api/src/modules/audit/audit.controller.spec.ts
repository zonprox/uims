import type { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditController } from './audit.controller';
import type { AuditService } from './audit.service';

describe('AuditController', () => {
  let controller: AuditController;
  let mockService: {
    findAll: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    getStats: ReturnType<typeof vi.fn>;
    exportCsv: ReturnType<typeof vi.fn>;
    logEvent: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockService = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      getStats: vi.fn(),
      exportCsv: vi.fn(),
      logEvent: vi.fn(),
    };
    controller = new AuditController(mockService as unknown as AuditService);
  });

  it('delegates findAll with query parameters to auditService', async () => {
    const query = { search: 'admin', page: 1, limit: 20, status: 'Success' };
    mockService.findAll.mockResolvedValue([{ id: 'log-1' }]);

    const result = await controller.findAll(query);
    expect(mockService.findAll).toHaveBeenCalledWith(query);
    expect(result).toEqual([{ id: 'log-1' }]);
  });

  it('delegates findOne to auditService', async () => {
    mockService.findOne.mockResolvedValue({ id: 'log-123', action: 'CREATE' });
    const result = await controller.findOne('log-123');
    expect(mockService.findOne).toHaveBeenCalledWith('log-123');
    expect(result).toEqual({ id: 'log-123', action: 'CREATE' });
  });

  it('delegates getStats to auditService', async () => {
    mockService.getStats.mockResolvedValue({
      totalEvents: 100,
      failedEvents: 2,
      criticalEvents: 1,
      errorRate: '2.0%',
    });

    const result = await controller.getStats();
    expect(mockService.getStats).toHaveBeenCalled();
    expect(result).toEqual({
      totalEvents: 100,
      failedEvents: 2,
      criticalEvents: 1,
      errorRate: '2.0%',
    });
  });

  it('delegates exportCsv to auditService and sends response', async () => {
    const query = { action: 'DELETE' };
    mockService.exportCsv.mockResolvedValue('ID,Timestamp\n1,2026-08-01');
    const mockRes = {
      send: vi.fn(),
    } as unknown as Response;

    await controller.exportCsv(query, mockRes);
    expect(mockService.exportCsv).toHaveBeenCalledWith(query);
    expect(mockRes.send).toHaveBeenCalledWith('ID,Timestamp\n1,2026-08-01');
  });

  it('delegates logEvent to auditService', async () => {
    const body = {
      action: 'SYSTEM_MAINTENANCE',
      entity: 'Server Fleet',
      details: 'Started nightly maintenance',
    };
    mockService.logEvent.mockResolvedValue({ id: 'log-new', ...body });

    const result = await controller.logEvent(body);
    expect(mockService.logEvent).toHaveBeenCalledWith(body);
    expect(result).toEqual(expect.objectContaining({ id: 'log-new' }));
  });
});
