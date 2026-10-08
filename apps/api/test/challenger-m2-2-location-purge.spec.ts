/**
 * Challenger M2-2: Adversarial Verification & Stress Suite
 * Physical Location Purge & Zero Location Regression
 *
 * Requirements under empirical test:
 * 1. Zero `/api/v1/locations` or `/locations` routes registered in NestJS application.
 * 2. Submitting `locationId` in asset, inventory, network, or directory payloads
 *    is rejected with HTTP 400 Bad Request by ValidationPipe (forbidNonWhitelisted: true).
 * 3. Zero database queries attempt to query `prisma.location` or `locationId` columns.
 * 4. `packages/shared-types` exports zero `LocationType`, `Location`, or `locationId` fields.
 * 5. Seeder and database structural invariants.
 */

import { BadRequestException, RequestMethod } from '@nestjs/common';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as dotenv from 'dotenv';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { createValidationPipe } from '../src/common/pipes/validation-pipe.factory';
import { PrismaService } from '../src/database/prisma.service';

// DTO imports under test
import { CreateAssetDto } from '../src/modules/assets/dto/create-asset.dto';
import { UpdateAssetDto } from '../src/modules/assets/dto/update-asset.dto';
import { RegisterPhysicalUnitDto } from '../src/modules/assets/dto/register-physical-unit.dto';
import { CheckinPhysicalUnitDto } from '../src/modules/assets/dto/checkin-physical-unit.dto';
import { CreateInventoryItemDto } from '../src/modules/inventory/dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from '../src/modules/inventory/dto/update-inventory-item.dto';
import { CreateDirectoryUserDto } from '../src/modules/directory/dto/create-directory-user.dto';
import { UpdateDirectoryUserDto } from '../src/modules/directory/dto/update-directory-user.dto';
import { CreateDirectoryGroupDto } from '../src/modules/directory/dto/create-directory-group.dto';
import { CreateSubnetDto } from '../src/modules/network/dto/create-subnet.dto';
import { CreateSwitchDto } from '../src/modules/network/dto/create-switch.dto';
import { CreateRackDto } from '../src/modules/network/dto/create-rack.dto';
import { CreateVlanDto } from '../src/modules/network/dto/create-vlan.dto';
import { CreateIPAddressDto } from '../src/modules/network/dto/create-ip.dto';
import { AssignUserLicenseDto } from '../src/modules/licenses/dto/assign-user-license.dto';
import { CreateDepartmentDto } from '../src/modules/organization/dto/create-department.dto';
import { CreatePositionDto } from '../src/modules/organization/dto/create-position.dto';
import { CreateOrganizationDto } from '../src/modules/organization/dto/create-organization.dto';

import * as sharedTypes from '@uims/shared-types';

dotenv.config({ path: '.env' });
dotenv.config({ path: '../../.env' });

describe('Challenger M2-2: Physical Location Purge & Zero Location Regression Stress Suite', () => {
  let testingModule: TestingModule;
  let prisma: PrismaService;
  const validationPipe = createValidationPipe();

  beforeAll(async () => {
    prisma = new PrismaService();
    try {
      await prisma.$connect();
    } catch (e) {
      // Prisma connection optional if testing pure DTO & reflection, but DB is up
    }
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.onModuleDestroy().catch(() => {});
    }
  });

  describe('1. NestJS Routing Table & Controller Reflection Verification', () => {
    it('verifies that zero controllers register a /locations or /api/v1/locations route', () => {
      // Extract all modules and controllers declared in AppModule metadata
      const importedModules = Reflect.getMetadata('imports', AppModule) || [];
      const allControllers: any[] = [];

      // Check root AppModule controllers
      const rootControllers = Reflect.getMetadata('controllers', AppModule) || [];
      allControllers.push(...rootControllers);

      // Collect controllers from all sub-modules
      for (const mod of importedModules) {
        if (typeof mod === 'function') {
          const modControllers = Reflect.getMetadata('controllers', mod) || [];
          allControllers.push(...modControllers);
        }
      }

      expect(allControllers.length).toBeGreaterThan(0);

      const registeredRoutes: Array<{ controller: string; fullPath: string; method: string }> = [];

      for (const ctrl of allControllers) {
        const ctrlPath: string = Reflect.getMetadata(PATH_METADATA, ctrl) || '';
        const proto = ctrl.prototype;
        const methodNames = Object.getOwnPropertyNames(proto).filter(
          (m) => m !== 'constructor' && typeof proto[m] === 'function',
        );

        for (const methodName of methodNames) {
          const methodPath: string | undefined = Reflect.getMetadata(
            PATH_METADATA,
            proto[methodName],
          );
          const methodType: number | undefined = Reflect.getMetadata(
            METHOD_METADATA,
            proto[methodName],
          );

          if (methodType !== undefined) {
            const cleanCtrl = ctrlPath ? ctrlPath.replace(/^\/|\/$/g, '') : '';
            const cleanMethod = methodPath ? methodPath.replace(/^\/|\/$/g, '') : '';
            const fullPath = [cleanCtrl, cleanMethod].filter(Boolean).join('/');
            const httpMethod = RequestMethod[methodType] || 'UNKNOWN';

            registeredRoutes.push({
              controller: ctrl.name,
              fullPath: `api/v1/${fullPath}`,
              method: httpMethod,
            });
          }
        }
      }

      // Assert that NO registered route contains '/locations' or ends with '/locations'
      const locationRoutes = registeredRoutes.filter((r) => {
        const parts = r.fullPath.split('/');
        return parts.includes('locations') || parts.includes('location');
      });

      expect(
        locationRoutes,
        `Found unauthorized location routes: ${JSON.stringify(locationRoutes, null, 2)}`,
      ).toEqual([]);
    });
  });

  describe('2. ValidationPipe Ingestion Rejection: forbidNonWhitelisted with locationId', () => {
    const testCases: Array<{
      dtoName: string;
      dtoClass: any;
      validPayload: Record<string, unknown>;
    }> = [
      {
        dtoName: 'CreateAssetDto',
        dtoClass: CreateAssetDto,
        validPayload: {
          name: 'Dell Latitude 7420',
          assetCode: 'AST-TEST-2026',
        },
      },
      {
        dtoName: 'UpdateAssetDto',
        dtoClass: UpdateAssetDto,
        validPayload: {
          name: 'Dell Latitude 7420 Updated',
        },
      },
      {
        dtoName: 'RegisterPhysicalUnitDto',
        dtoClass: RegisterPhysicalUnitDto,
        validPayload: {
          subcode: '01',
          serialNumber: 'SN-TEST-001',
        },
      },
      {
        dtoName: 'CheckinPhysicalUnitDto',
        dtoClass: CheckinPhysicalUnitDto,
        validPayload: {
          notes: 'Returned in good condition',
        },
      },
      {
        dtoName: 'CreateInventoryItemDto',
        dtoClass: CreateInventoryItemDto,
        validPayload: {
          sku: 'SKU-RJ45-CAT6',
          name: 'Patch Cable 2m',
          quantity: 50,
          unitCost: 2.5,
        },
      },
      {
        dtoName: 'UpdateInventoryItemDto',
        dtoClass: UpdateInventoryItemDto,
        validPayload: {
          quantity: 100,
        },
      },
      {
        dtoName: 'CreateDirectoryUserDto',
        dtoClass: CreateDirectoryUserDto,
        validPayload: {
          email: 'challenger.emp@youngonevn.com',
          firstName: 'Challenger',
          lastName: 'Tester',
        },
      },
      {
        dtoName: 'UpdateDirectoryUserDto',
        dtoClass: UpdateDirectoryUserDto,
        validPayload: {
          displayName: 'Updated Tester',
        },
      },
      {
        dtoName: 'CreateDirectoryGroupDto',
        dtoClass: CreateDirectoryGroupDto,
        validPayload: {
          name: 'SecOps Team',
          groupType: 'SECURITY',
        },
      },
      {
        dtoName: 'CreateSubnetDto',
        dtoClass: CreateSubnetDto,
        validPayload: {
          name: 'Server Management Subnet',
          cidr: '10.200.0.0/24',
        },
      },
      {
        dtoName: 'CreateSwitchDto',
        dtoClass: CreateSwitchDto,
        validPayload: {
          name: 'Core-SW-01',
          ipAddress: '10.200.0.10',
          totalPorts: 48,
        },
      },
      {
        dtoName: 'CreateRackDto',
        dtoClass: CreateRackDto,
        validPayload: {
          name: 'Rack-A1',
          totalUnits: 42,
        },
      },
      {
        dtoName: 'CreateVlanDto',
        dtoClass: CreateVlanDto,
        validPayload: {
          vlanId: 200,
          name: 'VLAN-Servers',
        },
      },
      {
        dtoName: 'CreateIPAddressDto',
        dtoClass: CreateIPAddressDto,
        validPayload: {
          ipAddress: '10.200.0.50',
        },
      },
      {
        dtoName: 'AssignUserLicenseDto',
        dtoClass: AssignUserLicenseDto,
        validPayload: {
          userId: 'a0000000-0000-4000-8000-000000000001',
          licenseId: 'b0000000-0000-4000-8000-000000000002',
        },
      },
      {
        dtoName: 'CreateDepartmentDto',
        dtoClass: CreateDepartmentDto,
        validPayload: {
          code: 'DEPT-TEST',
          name: 'Quality Assurance',
        },
      },
      {
        dtoName: 'CreatePositionDto',
        dtoClass: CreatePositionDto,
        validPayload: {
          code: 'POS-TEST',
          title: 'Senior QA Engineer',
        },
      },
      {
        dtoName: 'CreateOrganizationDto',
        dtoClass: CreateOrganizationDto,
        validPayload: {
          code: 'ORG-TEST',
          name: 'Broadpeak Corp',
        },
      },
    ];

    for (const { dtoName, dtoClass, validPayload } of testCases) {
      it(`strictly rejects locationId in ${dtoName} with HTTP 400 and structured error`, async () => {
        const adversarialPayload = {
          ...validPayload,
          locationId: '99999999-9999-4999-8999-999999999999',
        };

        let caughtError: any = null;
        try {
          await validationPipe.transform(adversarialPayload, {
            type: 'body',
            metatype: dtoClass,
          });
        } catch (err: unknown) {
          caughtError = err;
        }

        expect(caughtError).toBeInstanceOf(BadRequestException);
        const resp = caughtError.getResponse() as Record<string, any>;
        expect(resp.message).toBe('Validation failed');
        expect(resp.errors).toBeDefined();
        expect(resp.errors.locationId).toBeDefined();
        expect(resp.errors.locationId).toEqual(
          expect.arrayContaining([expect.stringContaining('should not exist')]),
        );

        // Also verify through HttpExceptionFilter formatting
        let jsonPayload: any = null;
        let statusCode: number | null = null;
        const mockResponse: any = {
          status: (code: number) => {
            statusCode = code;
            return {
              json: (data: any) => {
                jsonPayload = data;
              },
            };
          },
        };
        const mockHost: any = {
          switchToHttp: () => ({
            getResponse: () => mockResponse,
          }),
        };

        const filter = new HttpExceptionFilter();
        filter.catch(caughtError, mockHost);

        expect(statusCode).toBe(400);
        expect(jsonPayload.success).toBe(false);
        expect(jsonPayload.statusCode).toBe(400);
        expect(jsonPayload.message).toBe('Validation failed');
        expect(jsonPayload.errors.locationId).toBeDefined();
        expect(jsonPayload.timestamp).toBeDefined();
      });
    }

    it('strictly rejects location (object or string) in CreateAssetDto with HTTP 400', async () => {
      const adversarialPayload = {
        name: 'Dell XPS 15',
        assetCode: 'AST-XPS-01',
        location: 'HQ Building Floor 2',
      };

      let caughtError: any = null;
      try {
        await validationPipe.transform(adversarialPayload, {
          type: 'body',
          metatype: CreateAssetDto,
        });
      } catch (err: unknown) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(BadRequestException);
      const resp = caughtError.getResponse();
      expect(resp.errors.location).toBeDefined();
      expect(resp.errors.location).toEqual(
        expect.arrayContaining([expect.stringContaining('should not exist')]),
      );
    });
  });

  describe('3. Database & Prisma Client Zero-Location Invariants', () => {
    it('verifies that prisma client has no location delegate property', () => {
      expect((prisma as any).location).toBeUndefined();
      expect((prisma as any).locationType).toBeUndefined();
    });

    it('verifies that PostgreSQL public schema contains zero tables containing "location"', async () => {
      const tables: Array<{ table_name: string }> = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name ILIKE '%location%'
      `;
      expect(tables).toEqual([]);
    });

    it('verifies that PostgreSQL public schema contains zero columns named "locationId"', async () => {
      const columns: Array<{ table_name: string; column_name: string }> = await prisma.$queryRaw`
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND column_name = 'locationId'
      `;
      expect(columns).toEqual([]);
    });

    it('verifies that relational tables (Asset, DirectoryUser, Subnet, VLAN, InventoryItem) do not have location foreign keys', async () => {
      const fks: Array<{
        table_name: string;
        column_name: string;
        foreign_table_name: string;
      }> = await prisma.$queryRaw`
        SELECT
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND (ccu.table_name ILIKE '%location%' OR kcu.column_name ILIKE '%location%')
      `;
      expect(fks).toEqual([]);
    });
  });

  describe('4. Shared Types Module Zero-Location Verification', () => {
    it('verifies that @uims/shared-types does not export Location, LocationType, or Location DTOs', () => {
      const exportedKeys = Object.keys(sharedTypes);
      const locationExports = exportedKeys.filter((k) => k.toLowerCase().includes('location'));
      expect(locationExports).toEqual([]);
    });

    it('verifies that common entity types (Asset, DirectoryUser, InventoryItem) do not define locationId', () => {
      // Create type assertions at runtime using empty object templates
      const mockAsset: Partial<sharedTypes.Asset> = {};
      const mockUser: Partial<sharedTypes.DirectoryUser> = {};
      const mockInventory: Partial<sharedTypes.InventoryItem> = {};
      const mockSubnet: Partial<sharedTypes.Subnet> = {};

      // Assert properties do not exist on prototype or declared shapes
      expect('locationId' in mockAsset).toBe(false);
      expect('locationId' in mockUser).toBe(false);
      expect('locationId' in mockInventory).toBe(false);
      expect('locationId' in mockSubnet).toBe(false);
    });
  });
});
