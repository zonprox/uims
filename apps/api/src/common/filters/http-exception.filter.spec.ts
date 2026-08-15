import { HttpException, HttpStatus } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  it('should format http exception correctly', () => {
    const filter = new HttpExceptionFilter();
    const statusMock = vi.fn().mockReturnThis();
    const jsonMock = vi.fn();
    const getResponseMock = vi.fn().mockReturnValue({
      status: statusMock,
      json: jsonMock,
    });

    const hostMock = {
      switchToHttp: () => ({
        getResponse: getResponseMock,
      }),
    } as unknown as import('@nestjs/common').ArgumentsHost;

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
  });
});
