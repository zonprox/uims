import { BadRequestException, type ArgumentsHost, HttpStatus } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { PaginationDto } from '../src/common/dto/pagination.dto';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import {
  createValidationException,
  createValidationPipe,
  formatValidationErrors,
} from '../src/common/pipes/validation-pipe.factory';
import { BatchAssignAssetDto } from '../src/modules/assets/dto/batch-assign-asset.dto';
import { BatchDeleteAssetDto } from '../src/modules/assets/dto/batch-delete-asset.dto';
import { BatchImportDirectoryDto } from '../src/modules/directory/dto/import-directory.dto';
import { AssignUserLicenseDto } from '../src/modules/licenses/dto/assign-user-license.dto';
import { CreateLicenseDto } from '../src/modules/licenses/dto/create-license.dto';
import { CreateIPAddressDto } from '../src/modules/network/dto/create-ip.dto';
import { CreateSubnetDto } from '../src/modules/network/dto/create-subnet.dto';

interface ErrorResponsePayload {
  success: boolean;
  statusCode: number;
  message: string;
  errors?: Record<string, Array<string>>;
  timestamp: string;
}

function createMockArgumentsHost(
  statusMock: ReturnType<typeof vi.fn>,
  jsonMock: ReturnType<typeof vi.fn>,
): ArgumentsHost {
  const getResponseMock = vi.fn().mockReturnValue({
    status: statusMock,
    json: jsonMock,
  } as unknown as Response);

  return {
    switchToHttp: () => ({
      getResponse: getResponseMock,
      getRequest: vi.fn(),
      getNext: vi.fn(),
    }),
    getType: vi.fn().mockReturnValue('http'),
    getArgs: vi.fn(),
    getArgByIndex: vi.fn(),
    switchToRpc: vi.fn(),
    switchToWs: vi.fn(),
  } as unknown as ArgumentsHost;
}

describe('Milestone 2 Validation Pipeline & DTO Ingestion Rejections (Adversarial Challenger)', () => {
  const pipe = createValidationPipe();

  describe('1. Non-whitelisted Property Injection Defense', () => {
    it('rejects unexpectedField: "malicious" in AssignUserLicenseDto with HTTP 400 Bad Request', async () => {
      const maliciousPayload = {
        userId: 'a0000000-0000-4000-8000-000000000001',
        unexpectedField: 'malicious',
      };

      await expect(
        pipe.transform(maliciousPayload, { type: 'body', metatype: AssignUserLicenseDto }),
      ).rejects.toThrow(BadRequestException);

      try {
        await pipe.transform(maliciousPayload, { type: 'body', metatype: AssignUserLicenseDto });
        expect.unreachable('Should reject unwhitelisted field');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(BadRequestException);
        const resp = (err as BadRequestException).getResponse() as ErrorResponsePayload;
        expect(resp.message).toBe('Validation failed');
        expect(resp.errors?.unexpectedField).toBeDefined();
        expect(resp.errors?.unexpectedField).toContain('property unexpectedField should not exist');
      }
    });

    it('rejects unexpectedField: "malicious" in CreateLicenseDto with HTTP 400 Bad Request', async () => {
      const maliciousPayload = {
        name: 'Enterprise CAD',
        totalSeats: 10,
        unexpectedField: 'malicious',
      };

      await expect(
        pipe.transform(maliciousPayload, { type: 'body', metatype: CreateLicenseDto }),
      ).rejects.toThrow(BadRequestException);

      try {
        await pipe.transform(maliciousPayload, { type: 'body', metatype: CreateLicenseDto });
        expect.unreachable('Should reject unwhitelisted field');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(BadRequestException);
        const resp = (err as BadRequestException).getResponse() as ErrorResponsePayload;
        expect(resp.errors?.unexpectedField).toBeDefined();
        expect(resp.errors?.unexpectedField).toContain('property unexpectedField should not exist');
      }
    });

    it('rejects unexpectedField: "malicious" in CreateIPAddressDto with HTTP 400 Bad Request', async () => {
      const maliciousPayload = {
        address: '10.232.130.15',
        unexpectedField: 'malicious',
      };

      await expect(
        pipe.transform(maliciousPayload, { type: 'body', metatype: CreateIPAddressDto }),
      ).rejects.toThrow(BadRequestException);

      try {
        await pipe.transform(maliciousPayload, { type: 'body', metatype: CreateIPAddressDto });
        expect.unreachable('Should reject unwhitelisted field');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(BadRequestException);
        const resp = (err as BadRequestException).getResponse() as ErrorResponsePayload;
        expect(resp.errors?.unexpectedField).toBeDefined();
        expect(resp.errors?.unexpectedField).toContain('property unexpectedField should not exist');
      }
    });

    it('rejects unexpectedField: "malicious" in CreateSubnetDto with HTTP 400 Bad Request', async () => {
      const maliciousPayload = {
        cidr: '10.232.130.0/24',
        name: 'VLAN 130 Subnet',
        unexpectedField: 'malicious',
      };

      await expect(
        pipe.transform(maliciousPayload, { type: 'body', metatype: CreateSubnetDto }),
      ).rejects.toThrow(BadRequestException);

      try {
        await pipe.transform(maliciousPayload, { type: 'body', metatype: CreateSubnetDto });
        expect.unreachable('Should reject unwhitelisted field');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(BadRequestException);
        const resp = (err as BadRequestException).getResponse() as ErrorResponsePayload;
        expect(resp.errors?.unexpectedField).toBeDefined();
        expect(resp.errors?.unexpectedField).toContain('property unexpectedField should not exist');
      }
    });

    it('rejects unexpectedField: "malicious" in PaginationDto query with HTTP 400 Bad Request', async () => {
      const maliciousPayload = {
        page: '1',
        limit: '20',
        unexpectedField: 'malicious',
      };

      await expect(
        pipe.transform(maliciousPayload, { type: 'query', metatype: PaginationDto }),
      ).rejects.toThrow(BadRequestException);

      try {
        await pipe.transform(maliciousPayload, { type: 'query', metatype: PaginationDto });
        expect.unreachable('Should reject unwhitelisted field');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(BadRequestException);
        const resp = (err as BadRequestException).getResponse() as ErrorResponsePayload;
        expect(resp.errors?.unexpectedField).toBeDefined();
        expect(resp.errors?.unexpectedField).toContain('property unexpectedField should not exist');
      }
    });

    it('rejects unexpectedField: "malicious" in BatchAssignAssetDto and BatchDeleteAssetDto', async () => {
      const assignPayload = {
        assetIds: ['a0000000-0000-4000-8000-000000000001'],
        unexpectedField: 'malicious',
      };

      await expect(
        pipe.transform(assignPayload, { type: 'body', metatype: BatchAssignAssetDto }),
      ).rejects.toThrow(BadRequestException);

      const deletePayload = {
        ids: ['a0000000-0000-4000-8000-000000000001'],
        unexpectedField: 'malicious',
      };

      await expect(
        pipe.transform(deletePayload, { type: 'body', metatype: BatchDeleteAssetDto }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('2. Nested Array Error Dot-Notation Formatting', () => {
    it('outputs users.0.email and items.0.sku with constraint message array from formatValidationErrors', () => {
      const simulatedErrors: Array<ValidationError> = [
        {
          property: 'users',
          children: [
            {
              property: '0',
              children: [
                {
                  property: 'email',
                  constraints: {
                    isEmail: 'email must be an email',
                    isNotEmpty: 'email should not be empty',
                  },
                },
              ],
            },
            {
              property: '1',
              children: [
                {
                  property: 'name',
                  constraints: {
                    isString: 'name must be a string',
                  },
                },
              ],
            },
          ],
        },
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
                    isUppercase: 'sku must be uppercase',
                  },
                },
              ],
            },
          ],
        },
      ];

      const formatted = formatValidationErrors(simulatedErrors);

      expect(formatted).toEqual({
        'users.0.email': ['email must be an email', 'email should not be empty'],
        'users.1.name': ['name must be a string'],
        'items.0.sku': ['sku should not be empty', 'sku must be uppercase'],
      });
    });

    it('recursively formats real ValidationError from BatchImportDirectoryDto array items with dot-notation', async () => {
      const malformedBatch = {
        users: [
          {
            name: 99999, // Should be string
            email: 'valid.user@youngonevn.com',
          },
          {
            name: 'Valid Employee',
            email: 12345, // Should be string
          },
        ],
      };

      try {
        await pipe.transform(malformedBatch, { type: 'body', metatype: BatchImportDirectoryDto });
        expect.unreachable('Should reject nested array item type errors');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(BadRequestException);
        const resp = (err as BadRequestException).getResponse() as ErrorResponsePayload;
        expect(resp.errors?.['users.0.name']).toBeDefined();
        expect(resp.errors?.['users.0.name']).toContain('name must be a string');
        expect(resp.errors?.['users.1.email']).toBeDefined();
        expect(resp.errors?.['users.1.email']).toContain('email must be a string');
      }
    });

    it('rejects unexpected properties inside nested array items with dot-notation path', async () => {
      const maliciousNestedPayload = {
        users: [
          {
            name: 'John Doe',
            email: 'john.doe@youngonevn.com',
            injectedField: 'malicious_nested',
          },
        ],
      };

      try {
        await pipe.transform(maliciousNestedPayload, {
          type: 'body',
          metatype: BatchImportDirectoryDto,
        });
        expect.unreachable('Should reject nested unexpected properties');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(BadRequestException);
        const resp = (err as BadRequestException).getResponse() as ErrorResponsePayload;
        expect(resp.errors?.['users.0.injectedField']).toBeDefined();
        expect(resp.errors?.['users.0.injectedField']).toContain(
          'property injectedField should not exist',
        );
      }
    });
  });

  describe('3. Structured 400 Error Schema Emission via HttpExceptionFilter', () => {
    it('emits { success: false, statusCode: 400, message: "Validation failed", errors: { ... }, timestamp: "..." }', () => {
      const filter = new HttpExceptionFilter();
      const statusMock = vi.fn().mockReturnThis();
      const jsonMock = vi.fn();
      const hostMock = createMockArgumentsHost(statusMock, jsonMock);

      const validationErrors: Array<ValidationError> = [
        {
          property: 'users',
          children: [
            {
              property: '0',
              children: [
                {
                  property: 'email',
                  constraints: {
                    isEmail: 'email must be a valid email address',
                  },
                },
              ],
            },
          ],
        },
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
          ],
        },
      ];

      const exception = createValidationException(validationErrors);
      filter.catch(exception, hostMock);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledTimes(1);

      const capturedPayload = jsonMock.mock.calls[0][0] as ErrorResponsePayload;
      expect(capturedPayload.success).toBe(false);
      expect(capturedPayload.statusCode).toBe(400);
      expect(capturedPayload.message).toBe('Validation failed');
      expect(capturedPayload.errors).toEqual({
        'users.0.email': ['email must be a valid email address'],
        'items.0.sku': ['sku should not be empty'],
      });
      expect(typeof capturedPayload.timestamp).toBe('string');
      expect(new Date(capturedPayload.timestamp).toISOString()).toBe(capturedPayload.timestamp);
    });

    it('emits structured 400 schema when custom validation exception is created directly', () => {
      const filter = new HttpExceptionFilter();
      const statusMock = vi.fn().mockReturnThis();
      const jsonMock = vi.fn();
      const hostMock = createMockArgumentsHost(statusMock, jsonMock);

      const exception = new BadRequestException({
        message: 'Validation failed',
        errors: {
          'pagination.limit': ['limit must not be greater than 100'],
          'license.totalSeats': ['totalSeats must not be less than 1'],
        },
      });

      filter.catch(exception, hostMock);

      expect(statusMock).toHaveBeenCalledWith(400);
      const payload = jsonMock.mock.calls[0][0] as ErrorResponsePayload;
      expect(payload).toMatchObject({
        success: false,
        statusCode: 400,
        message: 'Validation failed',
        errors: {
          'pagination.limit': ['limit must not be greater than 100'],
          'license.totalSeats': ['totalSeats must not be less than 1'],
        },
      });
      expect(payload.timestamp).toBeDefined();
    });
  });

  describe('4. Malformed Inputs to Newly Converted Class DTOs', () => {
    describe('4.1 AssignUserLicenseDto', () => {
      it('rejects non-UUID userId with descriptive validation message', async () => {
        const payload = {
          userId: 'non-uuid-string-123',
        };

        try {
          await pipe.transform(payload, { type: 'body', metatype: AssignUserLicenseDto });
          expect.unreachable('Should reject non-UUID userId');
        } catch (err: unknown) {
          expect(err).toBeInstanceOf(BadRequestException);
          const resp = (err as BadRequestException).getResponse() as ErrorResponsePayload;
          expect(resp.errors?.userId).toBeDefined();
          expect(resp.errors?.userId).toContain('userId must be a valid UUID v4');
        }
      });

      it('rejects invalid email formats (missing @, invalid domain)', async () => {
        const invalidEmails = ['invalid-email', 'user@', '@domain.com', 'user..name@domain.com'];

        for (const email of invalidEmails) {
          try {
            await pipe.transform({ email }, { type: 'body', metatype: AssignUserLicenseDto });
            expect.unreachable(`Should reject invalid email: ${email}`);
          } catch (err: unknown) {
            expect(err).toBeInstanceOf(BadRequestException);
            const resp = (err as BadRequestException).getResponse() as ErrorResponsePayload;
            expect(resp.errors?.email).toBeDefined();
            expect(resp.errors?.email).toContain('email must be a valid email address');
          }
        }
      });

      it('accepts valid AssignUserLicenseDto payload', async () => {
        const validPayload = {
          userId: 'a0000000-0000-4000-8000-000000000001',
          name: 'Jane Doe',
          email: 'jane.doe@youngonevn.com',
          department: 'IT Infrastructure',
        };

        const result = (await pipe.transform(validPayload, {
          type: 'body',
          metatype: AssignUserLicenseDto,
        })) as AssignUserLicenseDto;
        expect(result.userId).toBe('a0000000-0000-4000-8000-000000000001');
        expect(result.email).toBe('jane.doe@youngonevn.com');
      });
    });

    describe('4.2 CreateLicenseDto', () => {
      it('rejects negative seats (< 1)', async () => {
        const payload = {
          name: 'JetBrains All Products Pack',
          totalSeats: -10,
        };

        try {
          await pipe.transform(payload, { type: 'body', metatype: CreateLicenseDto });
          expect.unreachable('Should reject negative seats');
        } catch (err: unknown) {
          expect(err).toBeInstanceOf(BadRequestException);
          const resp = (err as BadRequestException).getResponse() as ErrorResponsePayload;
          expect(resp.errors?.totalSeats).toBeDefined();
          expect(resp.errors?.totalSeats).toContain('totalSeats must not be less than 1');
        }
      });

      it('rejects zero seats (must be at least 1)', async () => {
        const payload = {
          name: 'Windows 11 Pro',
          totalSeats: 0,
        };

        try {
          await pipe.transform(payload, { type: 'body', metatype: CreateLicenseDto });
          expect.unreachable('Should reject zero seats');
        } catch (err: unknown) {
          expect(err).toBeInstanceOf(BadRequestException);
          const resp = (err as BadRequestException).getResponse() as ErrorResponsePayload;
          expect(resp.errors?.totalSeats).toBeDefined();
          expect(resp.errors?.totalSeats).toContain('totalSeats must not be less than 1');
        }
      });

      it('rejects non-integer seats (e.g. 15.5)', async () => {
        const payload = {
          name: 'Adobe Acrobat Pro',
          totalSeats: 15.5,
        };

        try {
          await pipe.transform(payload, { type: 'body', metatype: CreateLicenseDto });
          expect.unreachable('Should reject fractional seats');
        } catch (err: unknown) {
          expect(err).toBeInstanceOf(BadRequestException);
          const resp = (err as BadRequestException).getResponse() as ErrorResponsePayload;
          expect(resp.errors?.totalSeats).toBeDefined();
          expect(resp.errors?.totalSeats).toContain('totalSeats must be an integer number');
        }
      });

      it('rejects seats exceeding maximum ceiling (1,000,000)', async () => {
        const payload = {
          name: 'Site License',
          totalSeats: 1000001,
        };

        try {
          await pipe.transform(payload, { type: 'body', metatype: CreateLicenseDto });
          expect.unreachable('Should reject seats > 1000000');
        } catch (err: unknown) {
          expect(err).toBeInstanceOf(BadRequestException);
          const resp = (err as BadRequestException).getResponse() as ErrorResponsePayload;
          expect(resp.errors?.totalSeats).toBeDefined();
          expect(resp.errors?.totalSeats).toContain('totalSeats must not be greater than 1000000');
        }
      });

      it('rejects invalid expiryDate strings that are not ISO8601', async () => {
        const invalidDates = ['invalid-date', '2026/12/31', '31-12-2026', '2026-99-99'];

        for (const expiryDate of invalidDates) {
          try {
            await pipe.transform(
              { name: 'Office 365', expiryDate },
              { type: 'body', metatype: CreateLicenseDto },
            );
            expect.unreachable(`Should reject invalid expiryDate: ${expiryDate}`);
          } catch (err: unknown) {
            expect(err).toBeInstanceOf(BadRequestException);
            const resp = (err as BadRequestException).getResponse() as ErrorResponsePayload;
            expect(resp.errors?.expiryDate).toBeDefined();
            expect(resp.errors?.expiryDate).toContain(
              'expiryDate must be a valid ISO 8601 date string',
            );
          }
        }
      });

      it('accepts valid CreateLicenseDto with numbers and ISO8601 date', async () => {
        const validPayload = {
          name: 'Figma Organization',
          vendor: 'Figma Inc.',
          type: 'Subscription',
          totalSeats: 25,
          costPerSeat: 45.5,
          expiryDate: '2027-01-15T00:00:00.000Z',
          licenseKey: 'FGMA-2026-KEY-999',
          autoRenew: true,
        };

        const result = (await pipe.transform(validPayload, {
          type: 'body',
          metatype: CreateLicenseDto,
        })) as CreateLicenseDto;
        expect(result.name).toBe('Figma Organization');
        expect(result.totalSeats).toBe(25);
        expect(result.costPerSeat).toBe(45.5);
      });
    });

    describe('4.3 CreateIPAddressDto', () => {
      it('rejects invalid IP addresses (999.999.999.999 and 01.0.0.1 with leading zero)', async () => {
        const invalidIps = [
          '999.999.999.999',
          '01.0.0.1',
          '256.1.1.1',
          '1.2.3.4.5',
          'not-an-ip',
          '10.232.130.',
        ];

        for (const address of invalidIps) {
          try {
            await pipe.transform({ address }, { type: 'body', metatype: CreateIPAddressDto });
            expect.unreachable(`Should reject invalid IP: ${address}`);
          } catch (err: unknown) {
            expect(err).toBeInstanceOf(BadRequestException);
            const resp = (err as BadRequestException).getResponse() as ErrorResponsePayload;
            expect(resp.errors?.address).toBeDefined();
            expect(resp.errors?.address).toContain('address must be a valid IPv4 address');
          }
        }
      });

      it('rejects malformed MAC addresses (improper length, delimiter, invalid hex)', async () => {
        const invalidMacs = [
          '00:1A:2B:3C:4D', // Only 5 octets
          '00:1A:2B:3C:4D:5E:6F', // 7 octets
          'GG:HH:II:JJ:KK:LL', // Invalid hex chars
          '001A.2B3C.4D5E', // Cisco dot format without colon/hyphen
          'invalid-mac',
          '00:1a:2b:3c:4d:5', // Truncated hex
        ];

        for (const macAddress of invalidMacs) {
          try {
            await pipe.transform({ macAddress }, { type: 'body', metatype: CreateIPAddressDto });
            expect.unreachable(`Should reject invalid MAC: ${macAddress}`);
          } catch (err: unknown) {
            expect(err).toBeInstanceOf(BadRequestException);
            const resp = (err as BadRequestException).getResponse() as ErrorResponsePayload;
            expect(resp.errors?.macAddress).toBeDefined();
            expect(resp.errors?.macAddress).toContain('macAddress must be a valid MAC address');
          }
        }
      });

      it('accepts valid CreateIPAddressDto with IPv4 and valid MAC formats (colon or hyphen)', async () => {
        const colonMacPayload = {
          address: '10.232.130.15',
          macAddress: '00:1A:2B:3C:4D:5E',
          responseTimeMs: 24,
        };

        const resultColon = (await pipe.transform(colonMacPayload, {
          type: 'body',
          metatype: CreateIPAddressDto,
        })) as CreateIPAddressDto;
        expect(resultColon.address).toBe('10.232.130.15');
        expect(resultColon.macAddress).toBe('00:1A:2B:3C:4D:5E');

        const hyphenMacPayload = {
          address: '192.168.1.50',
          macAddress: '00-1A-2B-3C-4D-5E',
        };

        const resultHyphen = (await pipe.transform(hyphenMacPayload, {
          type: 'body',
          metatype: CreateIPAddressDto,
        })) as CreateIPAddressDto;
        expect(resultHyphen.macAddress).toBe('00-1A-2B-3C-4D-5E');
      });
    });

    describe('4.4 CreateSubnetDto', () => {
      it('rejects invalid CIDR notations (/33, abc, out of range prefix)', async () => {
        const invalidCidrs = [
          '10.232.130.0/33',
          'abc',
          '/33',
          '10.232.130.0/99',
          '10.232.130.0/-1',
          'not.a.cidr',
          '10.232.130.0',
        ];

        for (const cidr of invalidCidrs) {
          try {
            await pipe.transform(
              { cidr, name: 'Test Subnet' },
              { type: 'body', metatype: CreateSubnetDto },
            );
            expect.unreachable(`Should reject invalid CIDR: ${cidr}`);
          } catch (err: unknown) {
            expect(err).toBeInstanceOf(BadRequestException);
            const resp = (err as BadRequestException).getResponse() as ErrorResponsePayload;
            expect(resp.errors?.cidr).toBeDefined();
            expect(resp.errors?.cidr).toContain('cidr must be a valid IPv4 CIDR notation');
          }
        }
      });

      it('rejects invalid IP addresses on gateway, netmask, startIp, endIp, broadcastAddress', async () => {
        const malformedSubnet = {
          cidr: '10.232.130.0/24',
          name: 'Engineering VLAN Subnet',
          gateway: '999.999.999.999',
          netmask: '256.255.255.0',
          broadcastAddress: '10.232.130.256',
          startIp: '01.0.0.1',
          endIp: 'invalid-ip',
        };

        try {
          await pipe.transform(malformedSubnet, { type: 'body', metatype: CreateSubnetDto });
          expect.unreachable('Should reject invalid IP address fields in subnet');
        } catch (err: unknown) {
          expect(err).toBeInstanceOf(BadRequestException);
          const resp = (err as BadRequestException).getResponse() as ErrorResponsePayload;
          expect(resp.errors?.gateway).toContain('gateway must be a valid IPv4 address');
          expect(resp.errors?.netmask).toContain('netmask must be a valid IPv4 address');
          expect(resp.errors?.broadcastAddress).toContain(
            'broadcastAddress must be a valid IPv4 address',
          );
          expect(resp.errors?.startIp).toContain('startIp must be a valid IPv4 address');
          expect(resp.errors?.endIp).toContain('endIp must be a valid IPv4 address');
        }
      });

      it('accepts valid CreateSubnetDto with correct CIDR and gateway IPv4', async () => {
        const validSubnet = {
          cidr: '10.232.130.0/24',
          name: 'Security Access Control Subnet',
          gateway: '10.232.130.254',
          netmask: '255.255.255.0',
          totalIps: 256,
          reservedIps: 5,
        };

        const result = (await pipe.transform(validSubnet, {
          type: 'body',
          metatype: CreateSubnetDto,
        })) as CreateSubnetDto;
        expect(result.cidr).toBe('10.232.130.0/24');
        expect(result.gateway).toBe('10.232.130.254');
        expect(result.totalIps).toBe(256);
      });
    });

    describe('4.5 PaginationDto', () => {
      it('rejects limit > 100 via @Max(100)', async () => {
        const oversizedLimits = [101, 200, 500, 10000];

        for (const limit of oversizedLimits) {
          try {
            await pipe.transform({ limit }, { type: 'query', metatype: PaginationDto });
            expect.unreachable(`Should reject limit > 100: ${limit}`);
          } catch (err: unknown) {
            expect(err).toBeInstanceOf(BadRequestException);
            const resp = (err as BadRequestException).getResponse() as ErrorResponsePayload;
            expect(resp.errors?.limit).toBeDefined();
            expect(resp.errors?.limit).toContain('limit must not be greater than 100');
          }
        }
      });

      it('rejects limit < 1 via @Min(1)', async () => {
        const undersizedLimits = [0, -1, -50];

        for (const limit of undersizedLimits) {
          try {
            await pipe.transform({ limit }, { type: 'query', metatype: PaginationDto });
            expect.unreachable(`Should reject limit < 1: ${limit}`);
          } catch (err: unknown) {
            expect(err).toBeInstanceOf(BadRequestException);
            const resp = (err as BadRequestException).getResponse() as ErrorResponsePayload;
            expect(resp.errors?.limit).toBeDefined();
            expect(resp.errors?.limit).toContain('limit must not be less than 1');
          }
        }
      });

      it('rejects page < 1 via @Min(1)', async () => {
        try {
          await pipe.transform({ page: 0 }, { type: 'query', metatype: PaginationDto });
          expect.unreachable('Should reject page < 1');
        } catch (err: unknown) {
          expect(err).toBeInstanceOf(BadRequestException);
          const resp = (err as BadRequestException).getResponse() as ErrorResponsePayload;
          expect(resp.errors?.page).toBeDefined();
          expect(resp.errors?.page).toContain('page must not be less than 1');
        }
      });

      it('transforms and accepts valid string query parameters into numbers with bounds respected', async () => {
        const rawQuery = { page: '3', limit: '50' };

        const transformed = (await pipe.transform(rawQuery, {
          type: 'query',
          metatype: PaginationDto,
        })) as PaginationDto;

        expect(transformed.page).toBe(3);
        expect(transformed.limit).toBe(50);
        expect(typeof transformed.page).toBe('number');
        expect(typeof transformed.limit).toBe('number');
      });
    });

    describe('4.6 BatchAssignAssetDto & BatchDeleteAssetDto', () => {
      it('rejects non-UUID strings in BatchAssignAssetDto assetIds via @IsUUID("4", { each: true })', async () => {
        const malformedBatchAssign = {
          assetIds: ['a0000000-0000-4000-8000-000000000001', 'not-a-uuid-string', 'AST-1234'],
        };

        try {
          await pipe.transform(malformedBatchAssign, {
            type: 'body',
            metatype: BatchAssignAssetDto,
          });
          expect.unreachable('Should reject non-UUID strings in assetIds');
        } catch (err: unknown) {
          expect(err).toBeInstanceOf(BadRequestException);
          const resp = (err as BadRequestException).getResponse() as ErrorResponsePayload;
          expect(resp.errors?.assetIds).toBeDefined();
          expect(resp.errors?.assetIds).toContain('Each asset ID must be a valid UUID v4');
        }
      });

      it('rejects empty assetIds array in BatchAssignAssetDto', async () => {
        try {
          await pipe.transform({ assetIds: [] }, { type: 'body', metatype: BatchAssignAssetDto });
          expect.unreachable('Should reject empty assetIds array');
        } catch (err: unknown) {
          expect(err).toBeInstanceOf(BadRequestException);
          const resp = (err as BadRequestException).getResponse() as ErrorResponsePayload;
          expect(resp.errors?.assetIds).toBeDefined();
          expect(resp.errors?.assetIds).toContain('assetIds array must not be empty');
        }
      });

      it('rejects non-UUID strings in BatchDeleteAssetDto ids via @IsUUID("4", { each: true })', async () => {
        const malformedBatchDelete = {
          ids: ['ast-delete-1', 'not-a-valid-uuid'],
        };

        try {
          await pipe.transform(malformedBatchDelete, {
            type: 'body',
            metatype: BatchDeleteAssetDto,
          });
          expect.unreachable('Should reject non-UUID strings in delete ids');
        } catch (err: unknown) {
          expect(err).toBeInstanceOf(BadRequestException);
          const resp = (err as BadRequestException).getResponse() as ErrorResponsePayload;
          expect(resp.errors?.ids).toBeDefined();
          expect(resp.errors?.ids).toContain('Each asset ID must be a valid UUID v4');
        }
      });

      it('rejects empty ids array in BatchDeleteAssetDto', async () => {
        try {
          await pipe.transform({ ids: [] }, { type: 'body', metatype: BatchDeleteAssetDto });
          expect.unreachable('Should reject empty ids array');
        } catch (err: unknown) {
          expect(err).toBeInstanceOf(BadRequestException);
          const resp = (err as BadRequestException).getResponse() as ErrorResponsePayload;
          expect(resp.errors?.ids).toBeDefined();
          expect(resp.errors?.ids).toContain('ids array must not be empty');
        }
      });

      it('accepts valid UUID arrays for BatchAssignAssetDto and BatchDeleteAssetDto', async () => {
        const validAssignPayload = {
          assetIds: [
            'a0000000-0000-4000-8000-000000000001',
            'a0000000-0000-4000-8000-000000000002',
          ],
          assignedToId: 'b0000000-0000-4000-8000-000000000001',
          departmentId: 'c0000000-0000-4000-8000-000000000001',
          status: 'IN_USE',
        };

        const assignResult = (await pipe.transform(validAssignPayload, {
          type: 'body',
          metatype: BatchAssignAssetDto,
        })) as BatchAssignAssetDto;
        expect(assignResult.assetIds).toHaveLength(2);
        expect(assignResult.status).toBe('IN_USE');

        const validDeletePayload = {
          ids: ['a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002'],
        };

        const deleteResult = (await pipe.transform(validDeletePayload, {
          type: 'body',
          metatype: BatchDeleteAssetDto,
        })) as BatchDeleteAssetDto;
        expect(deleteResult.ids).toHaveLength(2);
      });
    });
  });
});
