import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService Adversarial Isolation & Boundary Stress Tests', () => {
  let authService: AuthService;
  let mockUsersService: {
    findByIdentifier: ReturnType<typeof vi.fn>;
  };
  let mockJwtService: {
    sign: ReturnType<typeof vi.fn>;
  };
  let mockConfigService: {
    get: ReturnType<typeof vi.fn>;
  };
  let mockPrismaService: {
    directoryUser: {
      findFirst: ReturnType<typeof vi.fn>;
    };
    auditLog: {
      create: ReturnType<typeof vi.fn>;
    };
    refreshToken: {
      create: ReturnType<typeof vi.fn>;
    };
    role: {
      findFirst: ReturnType<typeof vi.fn>;
    };
    appUser: {
      findUnique: ReturnType<typeof vi.fn>;
    };
  };

  let validPasswordHash: string;

  beforeEach(async () => {
    validPasswordHash = await bcrypt.hash('CorrectHorseBatteryStaple!2026', 10);

    mockUsersService = {
      findByIdentifier: vi.fn(),
    };

    mockJwtService = {
      sign: vi.fn((payload) => `mocked.jwt.${payload.sub || 'token'}`),
    };

    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'JWT_REFRESH_SECRET') {
          return 'adversarial-test-jwt-refresh-secret-min-32-chars';
        }
        return undefined;
      }),
    };

    mockPrismaService = {
      directoryUser: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'audit-log-uuid' }),
      },
      refreshToken: {
        create: vi.fn().mockResolvedValue({ id: 'refresh-token-uuid' }),
      },
      role: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'role-admin-id',
          name: 'Super Admin',
          permissions: [{ permission: { subject: '*', action: '*' } }],
        }),
      },
      appUser: {
        findUnique: vi.fn(),
      },
    };

    authService = new AuthService(
      mockUsersService as unknown as import('../users/users.service').UsersService,
      mockJwtService as unknown as import('@nestjs/jwt').JwtService,
      mockPrismaService as unknown as import('../../database/prisma.service').PrismaService,
      mockConfigService as unknown as import('@nestjs/config').ConfigService,
    );
  });

  describe('1. AppUser Authentication, Normalization & Status Enforcements', () => {
    it('authenticates AppUser with exact email and valid password', async () => {
      mockUsersService.findByIdentifier.mockImplementation(async (clean: string) => {
        if (clean === 'alex.johnson@uims.internal') {
          return {
            id: 'app-user-1',
            username: 'alex.johnson',
            email: 'alex.johnson@uims.internal',
            firstName: 'Alex',
            lastName: 'Johnson',
            passwordHash: validPasswordHash,
            status: 'ACTIVE',
            isLocked: false,
            roleName: 'Super Admin',
            roleId: 'role-admin-id',
          };
        }
        return null;
      });

      const result = await authService.login({
        email: 'alex.johnson@uims.internal',
        password: 'CorrectHorseBatteryStaple!2026',
      });

      expect(result).toBeDefined();
      expect(result.token).toContain('mocked.jwt.app-user-1');
      expect(result.user.email).toBe('alex.johnson@uims.internal');
      expect(result.user.role).toBe('Super Admin');
      expect(mockUsersService.findByIdentifier).toHaveBeenCalledWith('alex.johnson@uims.internal');
    });

    it('authenticates AppUser with uppercase email (case insensitivity)', async () => {
      mockUsersService.findByIdentifier.mockImplementation(async (clean: string) => {
        if (clean === 'alex.johnson@uims.internal') {
          return {
            id: 'app-user-1',
            username: 'alex.johnson',
            email: 'alex.johnson@uims.internal',
            firstName: 'Alex',
            lastName: 'Johnson',
            passwordHash: validPasswordHash,
            status: 'ACTIVE',
            isLocked: false,
            roleName: 'Super Admin',
          };
        }
        return null;
      });

      const result = await authService.login({
        email: 'ALEX.JOHNSON@UIMS.INTERNAL',
        password: 'CorrectHorseBatteryStaple!2026',
      });

      expect(result.user.email).toBe('alex.johnson@uims.internal');
      expect(mockUsersService.findByIdentifier).toHaveBeenCalledWith('alex.johnson@uims.internal');
    });

    it('authenticates AppUser with whitespace padding around identifier', async () => {
      mockUsersService.findByIdentifier.mockImplementation(async (clean: string) => {
        if (clean === 'alex.johnson') {
          return {
            id: 'app-user-1',
            username: 'alex.johnson',
            email: 'alex.johnson@uims.internal',
            firstName: 'Alex',
            lastName: 'Johnson',
            passwordHash: validPasswordHash,
            status: 'ACTIVE',
            isLocked: false,
            roleName: 'Super Admin',
          };
        }
        return null;
      });

      const result = await authService.login({
        email: '  \t alex.johnson \n  ',
        password: 'CorrectHorseBatteryStaple!2026',
      });

      expect(result.user.username).toBe('alex.johnson');
      expect(mockUsersService.findByIdentifier).toHaveBeenCalledWith('alex.johnson');
    });

    it('strictly rejects AppUser with incorrect password and writes LOGIN_FAILED audit log', async () => {
      mockUsersService.findByIdentifier.mockResolvedValue({
        id: 'app-user-1',
        username: 'alex.johnson',
        email: 'alex.johnson@uims.internal',
        firstName: 'Alex',
        lastName: 'Johnson',
        passwordHash: validPasswordHash,
        status: 'ACTIVE',
        isLocked: false,
        roleName: 'Super Admin',
      });

      await expect(
        authService.login({
          email: 'alex.johnson@uims.internal',
          password: 'IncorrectPasswordAttempt!999',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'app-user-1',
          userEmail: 'alex.johnson@uims.internal',
          action: 'LOGIN_FAILED',
          status: 'Failed',
          details: expect.stringContaining('Invalid password attempt for account'),
        }),
      });
    });

    it('strictly rejects inactive AppUser (status: INACTIVE) before checking password', async () => {
      mockUsersService.findByIdentifier.mockResolvedValue({
        id: 'app-user-2',
        username: 'inactive.user',
        email: 'inactive@uims.internal',
        firstName: 'Inactive',
        lastName: 'User',
        passwordHash: validPasswordHash,
        status: 'INACTIVE',
        isLocked: false,
        roleName: 'Operator',
      });

      await expect(
        authService.login({
          email: 'inactive@uims.internal',
          password: 'CorrectHorseBatteryStaple!2026',
        }),
      ).rejects.toThrow('Account is inactive. Contact your system administrator.');
    });

    it('strictly rejects suspended AppUser (status: SUSPENDED)', async () => {
      mockUsersService.findByIdentifier.mockResolvedValue({
        id: 'app-user-3',
        username: 'suspended.user',
        email: 'suspended@uims.internal',
        firstName: 'Suspended',
        lastName: 'User',
        passwordHash: validPasswordHash,
        status: 'SUSPENDED',
        isLocked: false,
        roleName: 'Operator',
      });

      await expect(
        authService.login({
          email: 'suspended@uims.internal',
          password: 'CorrectHorseBatteryStaple!2026',
        }),
      ).rejects.toThrow('Account is suspended. Contact your system administrator.');
    });

    it('strictly rejects locked AppUser (isLocked: true)', async () => {
      mockUsersService.findByIdentifier.mockResolvedValue({
        id: 'app-user-4',
        username: 'locked.user',
        email: 'locked@uims.internal',
        firstName: 'Locked',
        lastName: 'User',
        passwordHash: validPasswordHash,
        status: 'ACTIVE',
        isLocked: true,
        roleName: 'Operator',
      });

      await expect(
        authService.login({
          email: 'locked@uims.internal',
          password: 'CorrectHorseBatteryStaple!2026',
        }),
      ).rejects.toThrow('Account is locked. Contact your system administrator.');
    });

    it('strictly rejects AppUser with missing/null role', async () => {
      mockUsersService.findByIdentifier.mockResolvedValue({
        id: 'app-user-5',
        username: 'norole.user',
        email: 'norole@uims.internal',
        firstName: 'No',
        lastName: 'Role',
        passwordHash: validPasswordHash,
        status: 'ACTIVE',
        isLocked: false,
        roleName: null,
      });

      await expect(
        authService.login({
          email: 'norole@uims.internal',
          password: 'CorrectHorseBatteryStaple!2026',
        }),
      ).rejects.toThrow('User account has no assigned role. Contact your system administrator.');
    });
  });

  describe('2. DirectoryUser Rejection & Identity Isolation', () => {
    it('strictly rejects DirectoryUser login attempt by email and logs LOGIN_REJECTED_DIRECTORY_RECORD', async () => {
      mockUsersService.findByIdentifier.mockResolvedValue(null);
      mockPrismaService.directoryUser.findFirst.mockResolvedValue({
        id: 'dir-user-99',
        email: 'corp.employee@uims.internal',
        employeeCode: 'EMP-9900',
        displayName: 'Corporate Employee',
      });

      await expect(
        authService.login({
          email: 'corp.employee@uims.internal',
          password: 'ValidLookingPassword123!',
        }),
      ).rejects.toThrow(
        'Corporate directory accounts do not have application login privileges. Contact your system administrator for access.',
      );

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userName: 'corp.employee@uims.internal',
          userEmail: 'corp.employee@uims.internal',
          action: 'LOGIN_REJECTED_DIRECTORY_RECORD',
          severity: 'Warning',
          entity: 'Authentication',
          entityType: 'Security',
          status: 'Failed',
          details: expect.stringContaining(
            'Authentication strictly rejected: identity corp.employee@uims.internal is a corporate directory record',
          ),
        }),
      });
    });

    it('strictly rejects DirectoryUser login attempt by employeeCode with whitespace padding', async () => {
      mockUsersService.findByIdentifier.mockResolvedValue(null);
      mockPrismaService.directoryUser.findFirst.mockImplementation(async (query) => {
        const orClauses = query?.where?.OR || [];
        const matches = orClauses.some(
          (clause: { email?: { equals: string }; employeeCode?: { equals: string } }) =>
            clause.employeeCode?.equals === 'emp-9900' || clause.email?.equals === 'emp-9900',
        );
        if (matches) {
          return {
            id: 'dir-user-99',
            email: 'corp.employee@uims.internal',
            employeeCode: 'EMP-9900',
            displayName: 'Corporate Employee',
          };
        }
        return null;
      });

      await expect(
        authService.login({
          email: '  \n EMP-9900 \t ',
          password: 'AnyPasswordAttempt!2026',
        }),
      ).rejects.toThrow(
        'Corporate directory accounts do not have application login privileges. Contact your system administrator for access.',
      );

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userName: 'emp-9900',
          userEmail: 'corp.employee@uims.internal',
          action: 'LOGIN_REJECTED_DIRECTORY_RECORD',
          status: 'Failed',
        }),
      });
    });

    it('strictly rejects DirectoryUser with uppercase email (case-insensitive directory rejection)', async () => {
      mockUsersService.findByIdentifier.mockResolvedValue(null);
      mockPrismaService.directoryUser.findFirst.mockImplementation(async (query) => {
        const orClauses = query?.where?.OR || [];
        const matches = orClauses.some(
          (clause: { email?: { equals: string } }) =>
            clause.email?.equals === 'corp.director@uims.internal',
        );
        if (matches) {
          return {
            id: 'dir-user-100',
            email: 'corp.director@uims.internal',
            employeeCode: 'DIR-100',
            displayName: 'Corporate Director',
          };
        }
        return null;
      });

      await expect(
        authService.login({
          email: 'CORP.DIRECTOR@UIMS.INTERNAL',
          password: 'Password123!',
        }),
      ).rejects.toThrow(
        'Corporate directory accounts do not have application login privileges. Contact your system administrator for access.',
      );

      expect(mockPrismaService.directoryUser.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: { equals: 'corp.director@uims.internal', mode: 'insensitive' } },
            { employeeCode: { equals: 'corp.director@uims.internal', mode: 'insensitive' } },
          ],
        },
        select: { id: true, email: true, employeeCode: true, displayName: true },
      });
    });

    it('rejects unknown identity with generic Invalid credentials and records LOGIN_FAILED', async () => {
      mockUsersService.findByIdentifier.mockResolvedValue(null);
      mockPrismaService.directoryUser.findFirst.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'ghost.user@uims.internal',
          password: 'SomePassword123!',
        }),
      ).rejects.toThrow('Invalid credentials');

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userName: 'ghost.user@uims.internal',
          userEmail: 'ghost.user@uims.internal',
          action: 'LOGIN_FAILED',
          status: 'Failed',
          details: expect.stringContaining(
            'Failed authentication attempt for non-existent identity: ghost.user@uims.internal',
          ),
        }),
      });
    });
  });

  describe('3. Adversarial Payloads & Injection Resilience', () => {
    const maliciousPayloads = [
      { name: 'SQL Injection tautology', payload: "' OR '1'='1" },
      { name: 'SQL Injection comment', payload: "admin'--" },
      { name: 'SQL Injection union query', payload: '\' UNION SELECT * FROM "AppUser" --' },
      { name: 'SQL Injection stacked drop', payload: '\'; DROP TABLE "AppUser"; --' },
      { name: 'SQL Injection double quotes', payload: '" OR ""="' },
      { name: 'NoSQL JSON operator', payload: '{"$gt": ""}' },
      { name: 'NoSQL where clause', payload: '$where: "this.password.length > 0"' },
      { name: 'LDAP filter wildcard', payload: '*(|(mail=*))' },
      { name: 'LDAP admin injection', payload: 'admin)(&)' },
      { name: 'XSS script injection', payload: '<script>alert("XSS")</script>' },
      { name: 'HTML image event', payload: '<img src=x onerror=alert(1)>' },
      { name: 'Null byte injection', payload: 'admin\x00@uims.internal' },
      { name: 'Carriage return / line feed', payload: 'admin\r\ninjected@uims.internal' },
    ];

    maliciousPayloads.forEach(({ name, payload }) => {
      it(`safely handles and rejects malicious identifier: ${name}`, async () => {
        mockUsersService.findByIdentifier.mockResolvedValue(null);
        mockPrismaService.directoryUser.findFirst.mockResolvedValue(null);

        await expect(
          authService.login({
            email: payload,
            password: 'SomeRandomPassword123!',
          }),
        ).rejects.toThrow(UnauthorizedException);

        // Verify that prisma search was safely invoked with clean string without crashing
        expect(mockUsersService.findByIdentifier).toHaveBeenCalledWith(
          payload.trim().toLowerCase(),
        );
        expect(mockPrismaService.auditLog.create).toHaveBeenCalled();
      });
    });

    it('safely handles extremely large 10,000 character identifier without memory/CPU crash', async () => {
      const hugeIdentifier = 'a'.repeat(10000) + '@uims.internal';
      mockUsersService.findByIdentifier.mockResolvedValue(null);
      mockPrismaService.directoryUser.findFirst.mockResolvedValue(null);

      await expect(
        authService.login({
          email: hugeIdentifier,
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('safely compares extremely large 10,000 character password against valid AppUser', async () => {
      const hugePassword = 'P'.repeat(10000);
      mockUsersService.findByIdentifier.mockResolvedValue({
        id: 'app-user-1',
        username: 'alex.johnson',
        email: 'alex.johnson@uims.internal',
        firstName: 'Alex',
        lastName: 'Johnson',
        passwordHash: validPasswordHash,
        status: 'ACTIVE',
        isLocked: false,
        roleName: 'Super Admin',
      });

      await expect(
        authService.login({
          email: 'alex.johnson@uims.internal',
          password: hugePassword,
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'LOGIN_FAILED',
          status: 'Failed',
        }),
      });
    });

    it('strictly rejects empty or whitespace-only identifier', async () => {
      mockUsersService.findByIdentifier.mockResolvedValue(null);
      mockPrismaService.directoryUser.findFirst.mockResolvedValue(null);

      await expect(
        authService.login({
          email: '    \t   ',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockUsersService.findByIdentifier).toHaveBeenCalledWith('');
    });
  });

  describe('4. Token Refresh Boundary & Identity Isolation', () => {
    it('successfully refreshes token for valid active AppUser', async () => {
      mockPrismaService.appUser.findUnique.mockResolvedValue({
        id: 'app-user-1',
        username: 'alex.johnson',
        email: 'alex.johnson@uims.internal',
        firstName: 'Alex',
        lastName: 'Johnson',
        displayName: 'Alex Johnson',
        status: 'ACTIVE',
        roleId: 'role-admin-id',
        roleName: 'Super Admin',
        role: { id: 'role-admin-id', name: 'Super Admin' },
      });

      const result = await authService.refresh({
        id: 'app-user-1',
        email: 'alex.johnson@uims.internal',
      });

      expect(result.token).toBe('mocked.jwt.app-user-1');
      expect(result.user.role).toBe('Super Admin');
      expect(mockPrismaService.appUser.findUnique).toHaveBeenCalledWith({
        where: { id: 'app-user-1' },
        include: { role: true },
      });
    });

    it('strictly rejects token refresh if given a DirectoryUser ID (not found in AppUser)', async () => {
      // DirectoryUser ID passed into refresh
      mockPrismaService.appUser.findUnique.mockResolvedValue(null);

      await expect(
        authService.refresh({
          id: 'dir-user-99',
          email: 'corp.employee@uims.internal',
        }),
      ).rejects.toThrow(
        'Account is inactive, suspended, or revoked. Contact your system administrator.',
      );

      expect(mockPrismaService.appUser.findUnique).toHaveBeenCalledWith({
        where: { id: 'dir-user-99' },
        include: { role: true },
      });
    });

    it('strictly rejects token refresh if AppUser is INACTIVE or SUSPENDED', async () => {
      mockPrismaService.appUser.findUnique.mockResolvedValue({
        id: 'app-user-2',
        username: 'inactive.user',
        email: 'inactive@uims.internal',
        status: 'INACTIVE',
        roleName: 'Operator',
      });

      await expect(
        authService.refresh({
          id: 'app-user-2',
          email: 'inactive@uims.internal',
        }),
      ).rejects.toThrow(
        'Account is inactive, suspended, or revoked. Contact your system administrator.',
      );
    });

    it('strictly rejects token refresh if token payload has no id or sub', async () => {
      await expect(
        authService.refresh({
          email: 'missing.id@uims.internal',
        }),
      ).rejects.toThrow('Invalid authentication token');
    });
  });

  describe('5. Dual Identity & Precedence Isolation', () => {
    it('allows AppUser operator authentication even if matching email exists in DirectoryUser', async () => {
      // Scenario: Staff member has both an operator console account (AppUser) and an HR directory profile (DirectoryUser)
      mockUsersService.findByIdentifier.mockImplementation(async (clean: string) => {
        if (clean === 'operator@uims.internal') {
          return {
            id: 'app-operator-1',
            username: 'operator',
            email: 'operator@uims.internal',
            firstName: 'Operator',
            lastName: 'One',
            passwordHash: validPasswordHash,
            status: 'ACTIVE',
            isLocked: false,
            roleName: 'IT Specialist',
          };
        }
        return null;
      });

      // Mock directory user with the same email
      mockPrismaService.directoryUser.findFirst.mockResolvedValue({
        id: 'dir-operator-1',
        email: 'operator@uims.internal',
        employeeCode: 'EMP-001',
        displayName: 'Operator One',
      });

      const result = await authService.login({
        email: 'operator@uims.internal',
        password: 'CorrectHorseBatteryStaple!2026',
      });

      expect(result).toBeDefined();
      expect(result.user.email).toBe('operator@uims.internal');
      expect(result.user.role).toBe('IT Specialist');
      // DirectoryUser lookup should NOT have been performed because AppUser matched first
      expect(mockPrismaService.directoryUser.findFirst).not.toHaveBeenCalled();
    });

    it('rejects operator with incorrect password without falling through to DirectoryUser rejection', async () => {
      mockUsersService.findByIdentifier.mockResolvedValue({
        id: 'app-operator-1',
        username: 'operator',
        email: 'operator@uims.internal',
        firstName: 'Operator',
        lastName: 'One',
        passwordHash: validPasswordHash,
        status: 'ACTIVE',
        isLocked: false,
        roleName: 'IT Specialist',
      });

      await expect(
        authService.login({
          email: 'operator@uims.internal',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow('Invalid credentials');

      // Audit log should be LOGIN_FAILED, not LOGIN_REJECTED_DIRECTORY_RECORD
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'app-operator-1',
          action: 'LOGIN_FAILED',
          status: 'Failed',
        }),
      });
      expect(mockPrismaService.directoryUser.findFirst).not.toHaveBeenCalled();
    });

    it('handles DirectoryUser with null employeeCode gracefully', async () => {
      mockUsersService.findByIdentifier.mockResolvedValue(null);
      mockPrismaService.directoryUser.findFirst.mockResolvedValue({
        id: 'dir-no-code',
        email: 'nocode@uims.internal',
        employeeCode: null,
        displayName: 'No Code User',
      });

      await expect(
        authService.login({
          email: 'nocode@uims.internal',
          password: 'Password123!',
        }),
      ).rejects.toThrow(
        'Corporate directory accounts do not have application login privileges. Contact your system administrator for access.',
      );
    });
  });

  describe('6. Controller-Level Parameter Delegation & IP Audit Tracing', () => {
    it('passes client IP and User-Agent to AuthService for audit trail attribution', async () => {
      const { AuthController } = await import('./auth.controller');
      const controller = new AuthController(authService);

      mockUsersService.findByIdentifier.mockResolvedValue(null);
      mockPrismaService.directoryUser.findFirst.mockResolvedValue({
        id: 'dir-user-99',
        email: 'audited.employee@uims.internal',
        employeeCode: 'EMP-777',
        displayName: 'Audited Employee',
      });

      const clientIp = '203.0.113.42';
      const userAgent = 'Mozilla/5.0 Adversarial Test';

      await expect(
        controller.login(
          { email: 'audited.employee@uims.internal', password: 'Password123!' },
          clientIp,
          userAgent,
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: clientIp,
          action: 'LOGIN_REJECTED_DIRECTORY_RECORD',
        }),
      });
    });
  });

  describe('7. Database Schema-Level Invariants & Zero Credential Verification', () => {
    it('verifies DirectoryUser model in Prisma DMMF has ZERO credential fields', () => {
      const models = Prisma.dmmf.datamodel.models;
      const directoryUserModel = models.find((m) => m.name === 'DirectoryUser');
      expect(directoryUserModel).toBeDefined();

      const fieldNames = (directoryUserModel?.fields || []).map((f) => f.name);

      // Explicitly verify zero password, hash, or token fields exist on DirectoryUser
      expect(fieldNames).not.toContain('password');
      expect(fieldNames).not.toContain('passwordHash');
      expect(fieldNames).not.toContain('salt');
      expect(fieldNames).not.toContain('refreshTokens');
      expect(fieldNames).not.toContain('adInitialPassword');
      expect(fieldNames).not.toContain('role');
      expect(fieldNames).not.toContain('roleId');
      expect(fieldNames).not.toContain('roleName');

      // Verify legitimate directory attributes are present
      expect(fieldNames).toContain('employeeCode');
      expect(fieldNames).toContain('email');
      expect(fieldNames).toContain('firstName');
      expect(fieldNames).toContain('lastName');
      expect(fieldNames).toContain('assignedAssets');
      expect(fieldNames).toContain('licenseAssignments');
      expect(fieldNames).toContain('groupMemberships');
    });

    it('verifies AppUser model in Prisma DMMF contains authentication credentials', () => {
      const models = Prisma.dmmf.datamodel.models;
      const appUserModel = models.find((m) => m.name === 'AppUser');
      expect(appUserModel).toBeDefined();

      const fieldNames = (appUserModel?.fields || []).map((f) => f.name);

      expect(fieldNames).toContain('passwordHash');
      expect(fieldNames).toContain('username');
      expect(fieldNames).toContain('email');
      expect(fieldNames).toContain('role');
      expect(fieldNames).toContain('refreshTokens');
      expect(fieldNames).toContain('auditLogs');
      expect(fieldNames).toContain('notifications');
    });

    it('verifies relations are decoupled: Assets and Licenses link to DirectoryUser, not AppUser', () => {
      const models = Prisma.dmmf.datamodel.models;
      const assetModel = models.find((m) => m.name === 'Asset');
      const assignedToField = assetModel?.fields.find((f) => f.name === 'assignedTo');
      expect(assignedToField?.type).toBe('DirectoryUser');

      const licenseAssignmentModel = models.find((m) => m.name === 'LicenseAssignment');
      const licenseUserField = licenseAssignmentModel?.fields.find((f) => f.name === 'user');
      expect(licenseUserField?.type).toBe('DirectoryUser');

      const refreshTokenModel = models.find((m) => m.name === 'RefreshToken');
      const rtUserField = refreshTokenModel?.fields.find((f) => f.name === 'user');
      expect(rtUserField?.type).toBe('AppUser');
    });
  });
});
