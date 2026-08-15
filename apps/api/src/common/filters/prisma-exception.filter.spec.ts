import type { ArgumentsHost } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaExceptionFilter } from './prisma-exception.filter';

describe('PrismaExceptionFilter', () => {
  let filter: PrismaExceptionFilter;
  let mockStatus: ReturnType<typeof vi.fn>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new PrismaExceptionFilter();
    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });

    const mockResponse = {
      status: mockStatus,
    };
    const mockRequest = {
      url: '/api/v1/assets/ast-1001',
    };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  it('should handle P2002 Unique constraint violation with 409 Conflict', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '7.4.0',
      meta: { target: ['assetTag'] },
    });

    filter.catch(error, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(409);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 409,
        message: 'Unique constraint violation on assetTag',
        timestamp: expect.any(String),
      }),
    );
  });

  it('should handle P2025 Record not found with 404 Not Found', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Record to update not found', {
      code: 'P2025',
      clientVersion: '7.4.0',
      meta: { cause: 'Asset with ID not found' },
    });

    filter.catch(error, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(404);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 404,
        message: 'Asset with ID not found',
        timestamp: expect.any(String),
      }),
    );
  });

  it('should handle P2003 Foreign key constraint violation with 400 Bad Request', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
      code: 'P2003',
      clientVersion: '7.4.0',
      meta: { field_name: 'assignedToId' },
    });

    filter.catch(error, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 400,
        message: 'Foreign key constraint failed on related entity',
        timestamp: expect.any(String),
      }),
    );
  });

  it('should handle PrismaClientValidationError with 400 Bad Request', () => {
    const error = new Prisma.PrismaClientValidationError('Invalid input value', {
      clientVersion: '7.4.0',
    });

    filter.catch(error, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 400,
        message: 'Invalid database query parameters or payload',
        timestamp: expect.any(String),
      }),
    );
  });
});
