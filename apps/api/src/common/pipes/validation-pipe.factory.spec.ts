import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { BatchImportDirectoryDto } from '../../modules/directory/dto/import-directory.dto';
import { AssignUserLicenseDto } from '../../modules/licenses/dto/assign-user-license.dto';
import {
  createValidationException,
  createValidationPipe,
  formatValidationErrors,
} from './validation-pipe.factory';

describe('ValidationPipeFactory', () => {
  describe('formatValidationErrors', () => {
    it('should format simple top-level property errors', () => {
      const errors: ValidationError[] = [
        {
          property: 'name',
          constraints: {
            isNotEmpty: 'name should not be empty',
            isString: 'name must be a string',
          },
        },
      ];

      const result = formatValidationErrors(errors);
      expect(result).toEqual({
        name: ['name should not be empty', 'name must be a string'],
      });
    });

    it('should recursively format nested object errors with dot notation', () => {
      const errors: ValidationError[] = [
        {
          property: 'address',
          children: [
            {
              property: 'street',
              constraints: {
                isNotEmpty: 'street should not be empty',
              },
            },
          ],
        },
      ];

      const result = formatValidationErrors(errors);
      expect(result).toEqual({
        'address.street': ['street should not be empty'],
      });
    });

    it('should format nested array errors with index notation', () => {
      const errors: ValidationError[] = [
        {
          property: 'items',
          children: [
            {
              property: '0',
              children: [
                {
                  property: 'sku',
                  constraints: {
                    isNotEmpty: 'sku should not be empty',
                  },
                },
              ],
            },
            {
              property: '1',
              children: [
                {
                  property: 'quantity',
                  constraints: {
                    min: 'quantity must not be less than 0',
                  },
                },
              ],
            },
          ],
        },
      ];

      const result = formatValidationErrors(errors);
      expect(result).toEqual({
        'items.0.sku': ['sku should not be empty'],
        'items.1.quantity': ['quantity must not be less than 0'],
      });
    });

    it('should format non-whitelisted property errors', () => {
      const errors: ValidationError[] = [
        {
          property: 'unwhitelistedField',
          constraints: {
            whitelistValidation: 'property unwhitelistedField should not exist',
          },
        },
      ];

      const result = formatValidationErrors(errors);
      expect(result).toEqual({
        unwhitelistedField: ['property unwhitelistedField should not exist'],
      });
    });

    it('should return empty object when no errors have constraints or children', () => {
      const result = formatValidationErrors([]);
      expect(result).toEqual({});
    });
  });

  describe('createValidationException', () => {
    it('should produce a BadRequestException with message and structured errors dictionary', () => {
      const errors: ValidationError[] = [
        {
          property: 'email',
          constraints: {
            isEmail: 'email must be an email',
          },
        },
      ];

      const exception = createValidationException(errors);
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.getStatus()).toBe(400);

      const response = exception.getResponse() as {
        message: string;
        errors: Record<string, string[]>;
      };
      expect(response.message).toBe('Validation failed');
      expect(response.errors).toEqual({
        email: ['email must be an email'],
      });
    });
  });

  describe('createValidationPipe', () => {
    it('should instantiate ValidationPipe with production options and custom exceptionFactory', () => {
      const pipe = createValidationPipe();
      expect(pipe).toBeDefined();
    });

    it('should reject unwhitelisted properties with 400 Bad Request and structured error dictionary', async () => {
      const pipe = createValidationPipe();
      const metadata = { type: 'body' as const, metatype: AssignUserLicenseDto };

      await expect(
        pipe.transform({ unwhitelistedField: 'attack' }, metadata),
      ).rejects.toThrow(BadRequestException);

      try {
        await pipe.transform({ unwhitelistedField: 'attack' }, metadata);
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(BadRequestException);
        const resp = (err as BadRequestException).getResponse() as {
          message: string;
          errors: Record<string, string[]>;
        };
        expect(resp.message).toBe('Validation failed');
        expect(resp.errors.unwhitelistedField).toContain(
          'property unwhitelistedField should not exist',
        );
      }
    });

    it('should recursively validate and format nested batch import array items', async () => {
      const pipe = createValidationPipe();
      const metadata = { type: 'body' as const, metatype: BatchImportDirectoryDto };

      const invalidPayload = {
        users: [
          {
            name: 12345, // invalid: must be string
          },
        ],
      };

      try {
        await pipe.transform(invalidPayload, metadata);
        expect.unreachable('Should have thrown validation error');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(BadRequestException);
        const resp = (err as BadRequestException).getResponse() as {
          message: string;
          errors: Record<string, string[]>;
        };
        expect(resp.message).toBe('Validation failed');
        expect(resp.errors['users.0.name']).toContain('name must be a string');
      }
    });
  });
});

