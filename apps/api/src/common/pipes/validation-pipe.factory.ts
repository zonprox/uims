import { BadRequestException, ValidationPipe, type ValidationPipeOptions } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

/**
 * Recursively extracts and flattens class-validator ValidationError objects
 * into a structured dictionary mapping dot-notated field paths to string error message arrays.
 *
 * Supports:
 * - Root-level properties (e.g., "name": ["name should not be empty"])
 * - Nested objects (e.g., "address.street": ["street should not be empty"])
 * - Nested array items (e.g., "items.0.sku": ["sku must be a string"])
 * - Non-whitelisted properties (e.g., "extra": ["property extra should not exist"])
 */
export function formatValidationErrors(
  errors: ValidationError[],
  parentPath = '',
  acc: Record<string, string[]> = {},
): Record<string, string[]> {
  for (const error of errors) {
    const currentPath = parentPath ? `${parentPath}.${error.property}` : error.property;

    if (error.constraints && Object.keys(error.constraints).length > 0) {
      if (!acc[currentPath]) {
        acc[currentPath] = [];
      }
      for (const message of Object.values(error.constraints)) {
        if (!acc[currentPath].includes(message)) {
          acc[currentPath].push(message);
        }
      }
    }

    if (error.children && error.children.length > 0) {
      formatValidationErrors(error.children, currentPath, acc);
    }
  }

  return acc;
}

/**
 * Exception factory for NestJS ValidationPipe that produces structured
 * HTTP 400 BadRequestException payloads matching the UIMS API contract.
 */
export function createValidationException(errors: ValidationError[] = []): BadRequestException {
  const formattedErrors = formatValidationErrors(errors);
  return new BadRequestException({
    message: 'Validation failed',
    errors: formattedErrors,
  });
}

/**
 * Factory creating the production ValidationPipe instance with strict
 * whitelisting, transformation, rejection of non-whitelisted properties,
 * and recursive structured error formatting.
 */
export function createValidationPipe(
  customOptions?: Partial<ValidationPipeOptions>,
): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    exceptionFactory: createValidationException,
    ...customOptions,
  });
}
