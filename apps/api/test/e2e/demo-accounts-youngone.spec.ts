import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaService } from '../../src/database/prisma.service';
import { AuthService } from '../../src/modules/auth/auth.service';
import { UsersService } from '../../src/modules/users/users.service';

dotenv.config({ path: '.env' });
dotenv.config({ path: '../../.env' });

describe('Demo Accounts & Youngone Migration E2E Suite', () => {
  let prisma: PrismaClient;
  let isDbAvailable = false;
  let authService: AuthService;

  beforeAll(async () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      isDbAvailable = false;
      return;
    }
    try {
      prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString }),
      });
      await prisma.$queryRaw`SELECT 1`;
      isDbAvailable = true;

      const jwtService = new JwtService({
        secret: process.env.JWT_SECRET || 'uims-jwt-secret-change-in-production',
      });
      const configService = new ConfigService({
        JWT_REFRESH_SECRET:
          process.env.JWT_REFRESH_SECRET || 'uims-jwt-refresh-secret-change-in-production',
      });
      const usersService = new UsersService(prisma as unknown as PrismaService);
      authService = new AuthService(
        usersService,
        jwtService,
        prisma as unknown as PrismaService,
        configService,
      );
    } catch {
      isDbAvailable = false;
    }
  });

  afterAll(async () => {
    if (isDbAvailable && prisma) {
      try {
        await prisma.$disconnect();
      } catch {
        // ignore
      }
    }
  });

  it('1. All 4 demo accounts exist in AppUser with their respective roles', async () => {
    expect(isDbAvailable).toBe(true);

    const accounts = [
      { email: 'admin@youngonevn.com', expectedRole: 'Admin', username: 'admin' },
      { email: 'manager@youngonevn.com', expectedRole: 'Manager', username: 'manager' },
      { email: 'user@youngonevn.com', expectedRole: 'User', username: 'user' },
      { email: 'viewer@youngonevn.com', expectedRole: 'Viewer', username: 'viewer' },
    ];

    for (const acc of accounts) {
      const user = await prisma.appUser.findUnique({
        where: { email: acc.email },
        include: { role: true },
      });

      expect(user).not.toBeNull();
      expect(user?.email).toBe(acc.email);
      expect(user?.username).toBe(acc.username);
      expect(user?.role?.name).toBe(acc.expectedRole);
      expect(user?.status).toBe('ACTIVE');

      // Verify bcrypt password matches Youngone@2026
      if (user?.passwordHash) {
        const matches = await bcrypt.compare('Youngone@2026', user.passwordHash);
        expect(matches).toBe(true);
      }
    }
  });

  it('2. Zero occurrences of legacy email domains exist in AppUser and DirectoryUser tables', async () => {
    expect(isDbAvailable).toBe(true);

    const legacyDomains = ['@broadpeak.youngone.com', '@uims.internal', '@uims.local'];

    for (const domain of legacyDomains) {
      const appUserCount = await prisma.appUser.count({
        where: { email: { contains: domain } },
      });
      expect(appUserCount).toBe(0);

      const dirUserCount = await prisma.directoryUser.count({
        where: { email: { contains: domain } },
      });
      expect(dirUserCount).toBe(0);

      const dirGroupCount = await prisma.directoryGroup.count({
        where: { email: { contains: domain } },
      });
      expect(dirGroupCount).toBe(0);

      const auditLogCount = await prisma.auditLog.count({
        where: { userEmail: { contains: domain } },
      });
      expect(auditLogCount).toBe(0);
    }
  });

  it('3. All seeded directory users and groups have @youngonevn.com emails', async () => {
    expect(isDbAvailable).toBe(true);

    const dirUsers = await prisma.directoryUser.findMany({
      select: { email: true },
    });
    expect(dirUsers.length).toBeGreaterThan(0);

    for (const u of dirUsers) {
      expect(u.email).toMatch(/@youngonevn\.com$/);
    }

    const dirGroups = await prisma.directoryGroup.findMany({
      select: { email: true },
    });
    for (const g of dirGroups) {
      if (g.email) {
        expect(g.email).toMatch(/@youngonevn\.com$/);
      }
    }
  });

  it('4. Authenticates all 4 demo accounts via AuthService and verifies JWT role claims', async () => {
    expect(isDbAvailable).toBe(true);

    const demoAccounts = [
      { email: 'admin@youngonevn.com', expectedRole: 'Admin' },
      { email: 'manager@youngonevn.com', expectedRole: 'Manager' },
      { email: 'user@youngonevn.com', expectedRole: 'User' },
      { email: 'viewer@youngonevn.com', expectedRole: 'Viewer' },
    ];

    for (const acc of demoAccounts) {
      const result = await authService.login({
        email: acc.email,
        password: 'Youngone@2026',
      });

      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.user.email).toBe(acc.email);
      expect(result.user.role).toBe(acc.expectedRole);
    }
  });

  it('5. Verifies relational cross-references point to valid records', async () => {
    expect(isDbAvailable).toBe(true);

    // Hardware assets assignedToId references existing DirectoryUser
    const assignedAssets = await prisma.asset.findMany({
      where: { assignedToId: { not: null } },
      select: { assignedToId: true },
    });
    for (const a of assignedAssets) {
      if (a.assignedToId) {
        const user = await prisma.directoryUser.findUnique({
          where: { id: a.assignedToId },
        });
        expect(user).not.toBeNull();
      }
    }

    // Software license assignments reference existing DirectoryUser
    const assignments = await prisma.licenseAssignment.findMany({
      select: { userId: true },
    });
    for (const la of assignments) {
      const user = await prisma.directoryUser.findUnique({
        where: { id: la.userId },
      });
      expect(user).not.toBeNull();
    }

    // Directory memberships reference valid DirectoryUser and DirectoryGroup
    const memberships = await prisma.directoryMembership.findMany({
      select: { userId: true, groupId: true },
    });
    for (const m of memberships) {
      const user = await prisma.directoryUser.findUnique({ where: { id: m.userId } });
      const group = await prisma.directoryGroup.findUnique({ where: { id: m.groupId } });
      expect(user).not.toBeNull();
      expect(group).not.toBeNull();
    }
  });

  it('6. Audit system records adhere to @youngonevn.com domain', async () => {
    expect(isDbAvailable).toBe(true);

    const auditLogs = await prisma.auditLog.findMany({
      take: 20,
      orderBy: { timestamp: 'desc' },
      select: { userEmail: true },
    });

    expect(auditLogs.length).toBeGreaterThan(0);
    for (const log of auditLogs) {
      if (log.userEmail) {
        expect(log.userEmail).toMatch(/@youngonevn\.com$/);
      }
    }
  });

  it('7. Records @youngonevn.com domain in audit log when username without domain fails authentication', async () => {
    expect(isDbAvailable).toBe(true);

    const testUser = `regressiontestuser${Date.now()}`;
    await expect(
      authService.login({
        email: testUser,
        password: 'SomePassword123!',
      }),
    ).rejects.toThrow();

    const log = await prisma.auditLog.findFirst({
      where: { userName: testUser },
      orderBy: { timestamp: 'desc' },
    });

    expect(log).not.toBeNull();
    expect(log?.userEmail).toBe(`${testUser}@youngonevn.com`);
  });
});
