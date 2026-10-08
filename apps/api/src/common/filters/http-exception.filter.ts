import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException } from '@nestjs/common';
import type { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message = exception.message;
    let errors: unknown;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const respObj = exceptionResponse as Record<string, unknown>;

      if (respObj.errors !== undefined) {
        errors = respObj.errors;
      } else if (Array.isArray(respObj.message)) {
        errors = respObj.message;
        message = respObj.message[0] || exception.message;
      }

      if (typeof respObj.message === 'string') {
        message = respObj.message;
      }
    }

    const hasErrors =
      errors !== undefined &&
      errors !== null &&
      (Array.isArray(errors)
        ? errors.length > 0
        : typeof errors === 'object'
          ? Object.keys(errors as Record<string, unknown>).length > 0
          : true);

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      ...(hasErrors ? { errors } : {}),
      timestamp: new Date().toISOString(),
    });
  }
}
