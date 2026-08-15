import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Database error occurred';
    let details: string | undefined;

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': {
          status = HttpStatus.CONFLICT;
          const target = (exception.meta?.target as Array<string>)?.join(', ') || 'field';
          message = `Unique constraint violation on ${target}`;
          break;
        }
        case 'P2025': {
          status = HttpStatus.NOT_FOUND;
          message = (exception.meta?.cause as string) || 'Record not found';
          break;
        }
        case 'P2003': {
          status = HttpStatus.BAD_REQUEST;
          message = 'Foreign key constraint failed on related entity';
          break;
        }
        case 'P2014': {
          status = HttpStatus.BAD_REQUEST;
          message = 'The change would violate relation constraints';
          break;
        }
        case 'P2000': {
          status = HttpStatus.BAD_REQUEST;
          message = 'Provided value is too long for the database column';
          break;
        }
        default: {
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message = `Database query error (${exception.code})`;
          this.logger.error(`Unhandled Prisma error [${exception.code}]: ${exception.message}`);
          break;
        }
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid database query parameters or payload';
      this.logger.warn(`Prisma validation error: ${exception.message}`);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      ...(details ? { details } : {}),
      timestamp: new Date().toISOString(),
    });
  }
}
