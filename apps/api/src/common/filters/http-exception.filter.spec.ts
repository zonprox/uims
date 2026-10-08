import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  const createMockHost = (statusMock: ReturnType<typeof vi.fn>, jsonMock: ReturnType<typeof vi.fn>) => {
    const getResponseMock = vi.fn().mockReturnValue({
      status: statusMock,
      json: jsonMock,
    });

    return {
      switchToHttp: () => ({
        getResponse: getResponseMock,
      }),
    } as unknown as import('@nestjs/common').ArgumentsHost;
  };

  it('should format http exception correctly for standard string message', () => {
    const filter = new HttpExceptionFilter();
    const statusMock = vi.fn().mockReturnThis();
    const jsonMock = vi.fn();
    const hostMock = createMockHost(statusMock, jsonMock);

    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    filter.catch(exception, hostMock);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 403,
        message: 'Forbidden',
      }),
    );
    expect(jsonMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        errors: expect.anything(),
      }),
    );
  });

  it('should format BadRequestException with structured errors dictionary matching the API contract', () => {
    const filter = new HttpExceptionFilter();
    const statusMock = vi.fn().mockReturnThis();
    const jsonMock = vi.fn();
    const hostMock = createMockHost(statusMock, jsonMock);

    const exception = new BadRequestException({
      message: 'Validation failed',
      errors: {
        fieldName: ['Field error message 1', 'Field error message 2'],
        'nested.field': ['Nested error message'],
      },
    });

    filter.catch(exception, hostMock);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      statusCode: 400,
      message: 'Validation failed',
      errors: {
        fieldName: ['Field error message 1', 'Field error message 2'],
        'nested.field': ['Nested error message'],
      },
      timestamp: expect.any(String),
    });
  });

  it('should format BadRequestException with legacy array message gracefully', () => {
    const filter = new HttpExceptionFilter();
    const statusMock = vi.fn().mockReturnThis();
    const jsonMock = vi.fn();
    const hostMock = createMockHost(statusMock, jsonMock);

    const exception = new BadRequestException(['error 1', 'error 2']);
    filter.catch(exception, hostMock);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      statusCode: 400,
      message: 'error 1',
      errors: ['error 1', 'error 2'],
      timestamp: expect.any(String),
    });
  });

  it('should omit errors property when errors object is empty', () => {
    const filter = new HttpExceptionFilter();
    const statusMock = vi.fn().mockReturnThis();
    const jsonMock = vi.fn();
    const hostMock = createMockHost(statusMock, jsonMock);

    const exception = new BadRequestException({
      message: 'Validation failed with empty errors',
      errors: {},
    });

    filter.catch(exception, hostMock);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      statusCode: 400,
      message: 'Validation failed with empty errors',
      timestamp: expect.any(String),
    });
  });
});
