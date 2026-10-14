import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Prisma, UserStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  sanitizePayload,
  REDACTED_VALUE as SANITIZE_REDACTED,
} from '../src/common/utils/sanitize.util';
import { computeFieldDiff, REDACTED_VALUE as DIFF_REDACTED } from '@uims/shared-utils';
import { NetworkService } from '../src/modules/network/network.service';
import { UsersService } from '../src/modules/users/users.service';
import { DirectoryService } from '../src/modules/directory/directory.service';
import { encryptDirectoryPassword } from '../src/common/crypto/directory-crypto';

process.env.DIRECTORY_ENCRYPTION_KEY = '01234567890123456789012345678901';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';

describe('Milestone 2 Challenger 2 — Empirical Adversarial Verification Suite', () => {
  // =========================================================================
  // 1. NETWORK DOMAIN: IP ALLOCATION / RELEASE & SUBNET MUTATIONS
  // =========================================================================
  describe('Suite 1: Network IP Allocation, Release & Subnet Mutations', () => {
    let mockPrisma: any;
    let mockAuditService: { logEvent: ReturnType<typeof vi.fn> };
    let networkService: NetworkService;

    beforeEach(() => {
      mockPrisma = {
        vLAN: {
          findMany: vi.fn(),
          findFirst: vi.fn(),
          findUnique: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        },
        subnet: {
          findMany: vi.fn(),
          findFirst: vi.fn(),
          findUnique: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          count: vi.fn(),
        },
        iPAddress: {
          findMany: vi.fn(),
          findFirst: vi.fn(),
          findUnique: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          count: vi.fn(),
        },
      };

      mockAuditService = {
        logEvent: vi.fn().mockResolvedValue({ id: 'aud-event-1' }),
      };

      networkService = new NetworkService(mockPrisma, mockAuditService as any);
    });

    it('1.1: createIp allocates IP and logs IP_ALLOCATED with formatted details', async () => {
      mockPrisma.iPAddress.findFirst.mockResolvedValue(null);
      mockPrisma.iPAddress.create.mockResolvedValue({
        id: 'ip-1',
        address: '10.0.1.50',
        macAddress: '00:11:22:33:44:55',
        vendor: 'Apple, Inc.',
        deviceType: 'Workstation',
        status: 'IN_USE',
        pingStatus: 'online',
        subnetId: 'sub-1',
        vlanId: 'vlan-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.subnet.findUnique.mockResolvedValue({ id: 'sub-1', totalIps: 254 });
      mockPrisma.iPAddress.count.mockResolvedValue(12);

      const result = await networkService.createIp({
        address: '10.0.1.50',
        macAddress: '00-11-22-33-44-55',
        deviceType: 'Workstation',
        subnetId: 'sub-1',
      });

      expect(result.address).toBe('10.0.1.50');
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'IP_ALLOCATED',
          entity: 'IPAddress',
          entityType: 'Network',
          entityId: 'ip-1',
          severity: 'Info',
          status: 'Success',
          newValue: expect.objectContaining({ id: 'ip-1', address: '10.0.1.50' }),
        }),
      );
    });

    it('1.2: createIp rejects duplicate IP registration in subnet with BadRequestException', async () => {
      mockPrisma.subnet.findUnique.mockResolvedValue({
        id: 'sub-1',
        cidr: '10.0.1.0/24',
        ipAddresses: [{ address: '10.0.1.50' }],
      });
      mockPrisma.iPAddress.findFirst.mockResolvedValue({
        id: 'existing-ip',
        address: '10.0.1.50',
        subnetId: 'sub-1',
      });

      await expect(
        networkService.createIp({
          address: '10.0.1.50',
          subnetId: 'sub-1',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockAuditService.logEvent).not.toHaveBeenCalled();
    });

    it('1.3: createIp handles auditService error gracefully without failing IP allocation', async () => {
      mockPrisma.iPAddress.findFirst.mockResolvedValue(null);
      mockPrisma.iPAddress.create.mockResolvedValue({
        id: 'ip-2',
        address: '10.0.1.51',
        deviceType: 'Server',
        status: 'AVAILABLE',
      });
      mockAuditService.logEvent.mockRejectedValue(new Error('Audit DB connection dropped'));

      const result = await networkService.createIp({
        address: '10.0.1.51',
        deviceType: 'Server',
      });

      expect(result.id).toBe('ip-2');
    });

    it('1.4: updateIp logs IP_UPDATED with field-level diff only when fields actually change', async () => {
      const existing = {
        id: 'ip-3',
        address: '10.0.1.60',
        deviceType: 'Workstation',
        status: 'AVAILABLE',
        description: 'Old Description',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      };
      const updated = {
        ...existing,
        deviceType: 'Server',
        description: 'New Description',
        updatedAt: new Date('2026-01-02'),
      };

      mockPrisma.iPAddress.findUnique.mockResolvedValue(existing);
      mockPrisma.iPAddress.update.mockResolvedValue(updated);

      await networkService.updateIp('ip-3', {
        deviceType: 'Server',
        description: 'New Description',
      });

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'IP_UPDATED',
          entity: 'IPAddress',
          entityType: 'Network',
          entityId: 'ip-3',
          oldValue: expect.objectContaining({
            deviceType: 'Workstation',
            description: 'Old Description',
          }),
          newValue: expect.objectContaining({
            deviceType: 'Server',
            description: 'New Description',
          }),
        }),
      );
    });

    it('1.5: updateIp does NOT emit audit log when no fields have changed', async () => {
      const existing = {
        id: 'ip-4',
        address: '10.0.1.70',
        deviceType: 'Workstation',
        status: 'AVAILABLE',
        description: 'Identical',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      };

      mockPrisma.iPAddress.findUnique.mockResolvedValue(existing);
      mockPrisma.iPAddress.update.mockResolvedValue({
        ...existing,
        updatedAt: new Date('2026-01-02'), // updatedAt is automatically ignored by computeFieldDiff
      });

      await networkService.updateIp('ip-4', {
        description: 'Identical',
      });

      expect(mockAuditService.logEvent).not.toHaveBeenCalled();
    });

    it('1.6: deleteIp releases address, syncs subnet stats, and logs IP_RELEASED with oldValue', async () => {
      const existing = {
        id: 'ip-5',
        address: '10.0.1.80',
        subnetId: 'sub-1',
      };
      mockPrisma.iPAddress.findUnique.mockResolvedValue(existing);
      mockPrisma.iPAddress.delete.mockResolvedValue(existing);
      mockPrisma.subnet.findUnique.mockResolvedValue({ id: 'sub-1', totalIps: 254 });
      mockPrisma.iPAddress.count.mockResolvedValue(15);

      const res = await networkService.deleteIp('ip-5');

      expect(res.success).toBe(true);
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'IP_RELEASED',
          entity: 'IPAddress',
          entityType: 'Network',
          entityId: 'ip-5',
          severity: 'Info',
          oldValue: expect.objectContaining({ id: 'ip-5', address: '10.0.1.80' }),
        }),
      );
    });

    it('1.7: createSubnet calculates CIDR boundaries and logs SUBNET_CREATED', async () => {
      mockPrisma.subnet.create.mockResolvedValue({
        id: 'sub-new-1',
        cidr: '192.168.50.0/24',
        name: 'Guest WiFi',
        gateway: '192.168.50.1',
        networkAddress: '192.168.50.0',
        netmask: '255.255.255.0',
        broadcastAddress: '192.168.50.255',
        startIp: '192.168.50.1',
        endIp: '192.168.50.254',
        totalIps: 254,
        usedIps: 0,
        reservedIps: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await networkService.createSubnet({
        cidr: '192.168.50.0/24',
        name: 'Guest WiFi',
      });

      expect(res.cidr).toBe('192.168.50.0/24');
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SUBNET_CREATED',
          entity: 'NetworkSubnet',
          entityType: 'Network',
          entityId: 'sub-new-1',
          newValue: expect.objectContaining({ cidr: '192.168.50.0/24', name: 'Guest WiFi' }),
        }),
      );
    });

    it('1.8: createSubnet rejects invalid CIDR with BadRequestException', async () => {
      await expect(
        networkService.createSubnet({
          cidr: '999.999.999.0/99',
          name: 'Invalid Subnet',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockAuditService.logEvent).not.toHaveBeenCalled();
    });

    it('1.9: updateSubnet logs SUBNET_UPDATED with field-level changes', async () => {
      const existing = {
        id: 'sub-update-1',
        cidr: '10.20.0.0/24',
        name: 'VLAN 20 Old',
        gateway: '10.20.0.1',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      };
      const updated = {
        ...existing,
        name: 'VLAN 20 New',
        gateway: '10.20.0.254',
        updatedAt: new Date('2026-01-02'),
      };

      mockPrisma.subnet.findUnique.mockResolvedValue(existing);
      mockPrisma.subnet.update.mockResolvedValue(updated);

      await networkService.updateSubnet('sub-update-1', {
        name: 'VLAN 20 New',
        gateway: '10.20.0.254',
      });

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SUBNET_UPDATED',
          entity: 'NetworkSubnet',
          entityType: 'Network',
          entityId: 'sub-update-1',
          oldValue: expect.objectContaining({ name: 'VLAN 20 Old', gateway: '10.20.0.1' }),
          newValue: expect.objectContaining({ name: 'VLAN 20 New', gateway: '10.20.0.254' }),
        }),
      );
    });

    it('1.10: deleteSubnet logs SUBNET_DELETED with Warning severity', async () => {
      const existing = {
        id: 'sub-del-1',
        cidr: '10.30.0.0/24',
        name: 'Decommissioned Subnet',
      };

      mockPrisma.subnet.findUnique.mockResolvedValue(existing);
      mockPrisma.subnet.delete.mockResolvedValue(existing);

      await networkService.deleteSubnet('sub-del-1');

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SUBNET_DELETED',
          entity: 'NetworkSubnet',
          entityType: 'Network',
          entityId: 'sub-del-1',
          severity: 'Warning',
          oldValue: expect.objectContaining({ name: 'Decommissioned Subnet' }),
        }),
      );
    });
  });

  // =========================================================================
  // 2. USERS DOMAIN: UPDATE, STATUS CHANGE & STRICT REDACTION
  // =========================================================================
  describe('Suite 2: Users Service Updates, Status Changes & Redaction', () => {
    let mockPrisma: any;
    let mockAuditService: { logEvent: ReturnType<typeof vi.fn> };
    let usersService: UsersService;

    beforeEach(() => {
      mockPrisma = {
        appUser: {
          findUnique: vi.fn(),
          findFirst: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          count: vi.fn(),
        },
        role: {
          findFirst: vi.fn(),
        },
      };

      mockAuditService = {
        logEvent: vi.fn().mockResolvedValue({ id: 'aud-user-1' }),
      };

      usersService = new UsersService(mockPrisma, undefined, mockAuditService as any);
    });

    it('2.1: create user logs USER_CREATED and NEVER leaks password or passwordHash', async () => {
      mockPrisma.appUser.findFirst.mockResolvedValue(null);
      mockPrisma.role.findFirst.mockResolvedValue({ id: 'r-emp', name: 'Employee' });
      mockPrisma.appUser.create.mockResolvedValue({
        id: 'usr-new-1',
        email: 'alice@youngonevn.com',
        username: 'alice',
        firstName: 'Alice',
        lastName: 'Smith',
        displayName: 'Alice Smith',
        status: 'ACTIVE',
        isLocked: false,
        mustChangePassword: true,
        passwordHash: '$2b$12$SuperSecretHashedStringThatMustNeverLeakInAuditLogs',
        role: { id: 'r-emp', name: 'Employee' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const user = await usersService.create({
        email: 'alice@youngonevn.com',
        username: 'alice',
        password: 'PlaintextSuperSecretPassword123!',
      });

      expect(user.id).toBe('usr-new-1');
      expect((user as any).passwordHash).toBeUndefined();

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_CREATED',
          entity: 'User',
          entityType: 'User',
          entityId: 'usr-new-1',
          newValue: expect.objectContaining({
            email: 'alice@youngonevn.com',
          }),
        }),
      );

      const loggedEvent = mockAuditService.logEvent.mock.calls[0][0];
      const serialized = JSON.stringify(loggedEvent);
      expect(serialized).not.toContain('PlaintextSuperSecretPassword123!');
      expect(serialized).not.toContain(
        '$2b$12$SuperSecretHashedStringThatMustNeverLeakInAuditLogs',
      );
      expect(loggedEvent.newValue?.password).toBeUndefined();
      expect(loggedEvent.newValue?.passwordHash).toBeUndefined();
    });

    it('2.2: update user logs USER_UPDATED with field diff and redacts any password keys', async () => {
      const existingUser = {
        id: 'usr-up-1',
        email: 'bob@youngonevn.com',
        username: 'bob',
        firstName: 'Bob',
        lastName: 'Jones',
        displayName: 'Bob Jones',
        phone: '111222333',
        status: 'ACTIVE' as UserStatus,
        isLocked: false,
        passwordHash: '$2b$12$OldPasswordHashShouldNeverLeak',
        role: { id: 'r-emp', name: 'Employee' },
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      };

      mockPrisma.appUser.findUnique.mockResolvedValue(existingUser);
      mockPrisma.appUser.update.mockResolvedValue({
        ...existingUser,
        displayName: 'Robert Jones',
        phone: '999888777',
        passwordHash: '$2b$12$NewPasswordHashShouldNeverLeak',
        updatedAt: new Date('2026-01-02'),
      });

      await usersService.update('usr-up-1', {
        displayName: 'Robert Jones',
        phone: '999888777',
        password: 'BrandNewPassword123!',
      });

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_UPDATED',
          entity: 'User',
          entityType: 'User',
          entityId: 'usr-up-1',
          oldValue: expect.objectContaining({
            displayName: 'Bob Jones',
            phone: '111222333',
          }),
          newValue: expect.objectContaining({
            displayName: 'Robert Jones',
            phone: '999888777',
          }),
        }),
      );

      const loggedEvent = mockAuditService.logEvent.mock.calls[0][0];
      const serialized = JSON.stringify(loggedEvent);
      expect(serialized).not.toContain('BrandNewPassword123!');
      expect(serialized).not.toContain('$2b$12$OldPasswordHashShouldNeverLeak');
      expect(serialized).not.toContain('$2b$12$NewPasswordHashShouldNeverLeak');
    });

    it('2.3: toggleStatus logs USER_STATUS_CHANGED with previous and current status and lock flag', async () => {
      mockPrisma.appUser.findUnique.mockResolvedValue({
        id: 'usr-status-1',
        email: 'charlie@youngonevn.com',
        status: 'ACTIVE' as UserStatus,
        isLocked: false,
      });
      mockPrisma.appUser.update.mockResolvedValue({
        id: 'usr-status-1',
        email: 'charlie@youngonevn.com',
        status: 'SUSPENDED' as UserStatus,
        isLocked: true,
      });

      await usersService.toggleStatus('usr-status-1', 'SUSPENDED' as UserStatus);

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_STATUS_CHANGED',
          entity: 'User',
          entityType: 'User',
          entityId: 'usr-status-1',
          oldValue: { status: 'ACTIVE', isLocked: false },
          newValue: { status: 'SUSPENDED', isLocked: true },
        }),
      );
    });

    it('2.4: remove logs USER_DELETED with oldValue', async () => {
      const existing = {
        id: 'usr-del-1',
        email: 'david@youngonevn.com',
        status: 'ACTIVE' as UserStatus,
      };
      mockPrisma.appUser.findUnique.mockResolvedValue(existing);
      mockPrisma.appUser.delete.mockResolvedValue(existing);

      await usersService.remove('usr-del-1');

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_DELETED',
          entity: 'User',
          entityType: 'User',
          entityId: 'usr-del-1',
          oldValue: expect.objectContaining({ id: 'usr-del-1', email: 'david@youngonevn.com' }),
        }),
      );
    });
  });

  // =========================================================================
  // 3. DIRECTORY DOMAIN: CREDENTIAL ACCESS AUDITING & RBAC
  // =========================================================================
  describe('Suite 3: Directory Credential Access Auditing & Cascade', () => {
    let mockPrisma: any;
    let mockAuditService: { logEvent: ReturnType<typeof vi.fn> };
    let directoryService: DirectoryService;

    beforeEach(() => {
      mockPrisma = {
        directoryUser: {
          findFirst: vi.fn(),
          findUnique: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          count: vi.fn(),
        },
        directoryGroup: {
          findMany: vi.fn(),
          findFirst: vi.fn(),
          update: vi.fn(),
          count: vi.fn(),
        },
        directoryMembership: {
          upsert: vi.fn(),
          count: vi.fn(),
        },
        asset: {
          updateMany: vi.fn(),
        },
        license: {
          findUnique: vi.fn(),
          update: vi.fn(),
        },
        licenseAssignment: {
          findMany: vi.fn(),
          deleteMany: vi.fn(),
        },
        $transaction: vi.fn().mockImplementation(async (cb: (tx: any) => Promise<any>) => {
          return cb(mockPrisma);
        }),
      };

      mockAuditService = {
        logEvent: vi.fn().mockResolvedValue({ id: 'aud-dir-1' }),
      };

      directoryService = new DirectoryService(mockPrisma, mockAuditService as any);
    });

    it('3.1: revealEmailPassword decrypts password, logs DIRECTORY_CREDENTIALS_ACCESSED without password in audit', async () => {
      const secret = 'EnterprisePassword!999';
      const encrypted = encryptDirectoryPassword(secret);

      mockPrisma.directoryUser.findFirst.mockResolvedValue({
        id: 'dir-usr-1',
        email: 'emp1@youngonevn.com',
        emailPassword: encrypted,
      });

      const res = await directoryService.revealEmailPassword('dir-usr-1', {
        id: 'admin-user-id',
        email: 'security.admin@youngonevn.com',
        role: 'Super Admin',
        ipAddress: '10.100.1.5',
      });

      expect(res.password).toBe(secret);
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DIRECTORY_CREDENTIALS_ACCESSED',
          entity: 'DirectoryUser',
          entityType: 'User',
          entityId: 'dir-usr-1',
          userId: 'admin-user-id',
          userEmail: 'security.admin@youngonevn.com',
          ipAddress: '10.100.1.5',
          severity: 'Warning',
          status: 'Success',
        }),
      );

      const loggedEvent = mockAuditService.logEvent.mock.calls[0][0];
      expect(JSON.stringify(loggedEvent)).not.toContain(secret);
    });

    it('3.2: copyEmailPassword rejects non-admin with ForbiddenException', async () => {
      await expect(
        directoryService.copyEmailPassword('dir-usr-2', {
          id: 'guest-1',
          email: 'guest@youngonevn.com',
          role: 'Employee',
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockAuditService.logEvent).not.toHaveBeenCalled();
    });

    it('3.3: copyEmailPassword allows Admin, emits DIRECTORY_CREDENTIALS_ACCESSED', async () => {
      const encrypted = encryptDirectoryPassword('ValidKey123!');
      mockPrisma.directoryUser.findFirst.mockResolvedValue({
        id: 'dir-usr-2',
        email: 'emp2@youngonevn.com',
        emailPassword: encrypted,
      });

      const res = await directoryService.copyEmailPassword('dir-usr-2', {
        id: 'admin-1',
        email: 'admin@youngonevn.com',
        role: 'Admin',
        ipAddress: '10.100.1.10',
      });

      expect(res.success).toBe(true);
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DIRECTORY_CREDENTIALS_ACCESSED',
          entity: 'DirectoryUser',
          entityType: 'User',
          entityId: 'dir-usr-2',
          userId: 'admin-1',
          userEmail: 'admin@youngonevn.com',
          ipAddress: '10.100.1.10',
          severity: 'Warning',
          status: 'Success',
        }),
      );
    });

    it('3.4: resetEmailPassword resets credentials, audits event without leaking new password', async () => {
      const newSecret = 'TotallyNewSecret#2026';
      mockPrisma.directoryUser.findFirst.mockResolvedValue({
        id: 'dir-usr-3',
        email: 'emp3@youngonevn.com',
      });
      mockPrisma.directoryUser.update.mockResolvedValue({
        id: 'dir-usr-3',
      });

      const res = await directoryService.resetEmailPassword(
        'dir-usr-3',
        { newPassword: newSecret },
        {
          id: 'admin-1',
          email: 'admin@youngonevn.com',
          role: 'Admin',
          ipAddress: '10.100.1.20',
        },
      );

      expect(res.success).toBe(true);
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DIRECTORY_CREDENTIALS_ACCESSED',
          entity: 'DirectoryUser',
          entityType: 'User',
          entityId: 'dir-usr-3',
          userId: 'admin-1',
          userEmail: 'admin@youngonevn.com',
          ipAddress: '10.100.1.20',
        }),
      );

      const loggedEvent = mockAuditService.logEvent.mock.calls[0][0];
      expect(JSON.stringify(loggedEvent)).not.toContain(newSecret);
    });

    it('3.5: directory user removal cleanly cascades asset release and license revocation in transaction', async () => {
      mockPrisma.directoryUser.findFirst.mockResolvedValue({
        id: 'dir-del-1',
        email: 'term.employee@youngonevn.com',
      });
      mockPrisma.licenseAssignment.findMany.mockResolvedValue([
        { id: 'assign-1', licenseId: 'lic-1', userId: 'dir-del-1' },
      ]);
      mockPrisma.license.findUnique.mockResolvedValue({
        id: 'lic-1',
        totalSeats: 10,
        usedSeats: 5,
      });

      await directoryService.remove('dir-del-1');

      // Releases assigned assets
      expect(mockPrisma.asset.updateMany).toHaveBeenCalledWith({
        where: { assignedToId: 'dir-del-1' },
        data: { assignedToId: null, status: 'AVAILABLE' },
      });

      // Revokes license seats
      expect(mockPrisma.license.update).toHaveBeenCalledWith({
        where: { id: 'lic-1' },
        data: { usedSeats: 4 },
      });
      expect(mockPrisma.licenseAssignment.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'dir-del-1' },
      });

      // Deletes directory user
      expect(mockPrisma.directoryUser.delete).toHaveBeenCalledWith({
        where: { id: 'dir-del-1' },
      });
    });
  });

  // =========================================================================
  // 4. SANITIZATION ENGINE & FIELD-DIFF ADVERSARIAL STRESS TESTING
  // =========================================================================
  describe('Suite 4: Sanitization & Field-Diff Adversarial Integrity', () => {
    it('4.1: sanitizePayload recursively masks sensitive keys in deeply nested structures', () => {
      const payload = {
        level1: {
          user: {
            username: 'admin',
            password: 'UnsafePassword1',
            nestedInfo: {
              api_key: 'sk_live_12345',
              licenseKey: 'XXXX-YYYY-ZZZZ',
              authToken: 'bearer_token_xyz',
            },
            credentialBundle: {
              secretA: '123',
              secretB: '456',
            },
          },
          publicInfo: 'harmless',
        },
      };

      const sanitized: any = sanitizePayload(payload);

      expect(sanitized.level1.user.password).toBe(SANITIZE_REDACTED);
      expect(sanitized.level1.user.nestedInfo.api_key).toBe(SANITIZE_REDACTED);
      expect(sanitized.level1.user.nestedInfo.licenseKey).toBe(SANITIZE_REDACTED);
      expect(sanitized.level1.user.nestedInfo.authToken).toBe(SANITIZE_REDACTED);
      // Entire object under key containing 'credential' is redacted
      expect(sanitized.level1.user.credentialBundle).toBe(SANITIZE_REDACTED);
      expect(sanitized.level1.user.username).toBe('admin');
      expect(sanitized.level1.publicInfo).toBe('harmless');
    });

    it('4.2: sanitizePayload handles circular references safely', () => {
      const circularObj: any = { name: 'Root' };
      circularObj.self = circularObj;

      const sanitized: any = sanitizePayload(circularObj);

      expect(sanitized.name).toBe('Root');
      expect(sanitized.self).toBe('[CIRCULAR]');
    });

    it('4.3: sanitizePayload handles array of items with sensitive attributes', () => {
      const items = [
        { id: 1, secretToken: 'secret_1' },
        { id: 2, secretToken: 'secret_2' },
      ];

      const sanitized: any = sanitizePayload(items);

      expect(sanitized[0].secretToken).toBe(SANITIZE_REDACTED);
      expect(sanitized[1].secretToken).toBe(SANITIZE_REDACTED);
      expect(sanitized[0].id).toBe(1);
    });

    it('4.4: computeFieldDiff automatically masks sensitive keys in oldValue and newValue', () => {
      const oldState = {
        username: 'alice',
        password: 'OldPassword123!',
        licenseKey: 'OLD-KEY-111',
      };
      const newState = {
        username: 'alice_updated',
        password: 'NewPassword123!',
        licenseKey: 'NEW-KEY-222',
      };

      const diff = computeFieldDiff(oldState, newState);

      expect(diff.hasChanges).toBe(true);
      expect(diff.changedKeys).toEqual(['licenseKey', 'password', 'username']);
      expect(diff.oldValue?.password).toBe(DIFF_REDACTED);
      expect(diff.newValue?.password).toBe(DIFF_REDACTED);
      expect(diff.oldValue?.licenseKey).toBe(DIFF_REDACTED);
      expect(diff.newValue?.licenseKey).toBe(DIFF_REDACTED);
      expect(diff.oldValue?.username).toBe('alice');
      expect(diff.newValue?.username).toBe('alice_updated');
    });

    it('4.5: computeFieldDiff ignores metadata keys createdAt and updatedAt', () => {
      const oldState = {
        name: 'Item A',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      };
      const newState = {
        name: 'Item A',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'), // Changed updatedAt
      };

      const diff = computeFieldDiff(oldState, newState);

      expect(diff.hasChanges).toBe(false);
      expect(diff.oldValue).toBeNull();
      expect(diff.newValue).toBeNull();
      expect(diff.changedKeys).toEqual([]);
    });
  });

  // =========================================================================
  // 5. FORENSIC BOUNDARIES, FORMULA INJECTION & EXHAUSTION STRESS
  // =========================================================================
  describe('Suite 5: Forensic Boundaries, CSV Injection Neutralization & IP Exhaustion', () => {
    let mockPrisma: any;
    let auditService: import('../src/modules/audit/audit.service').AuditService;

    beforeEach(async () => {
      mockPrisma = {
        auditLog: {
          findMany: vi.fn(),
          count: vi.fn(),
          create: vi.fn(),
        },
      };

      const { AuditService } = await import('../src/modules/audit/audit.service');
      auditService = new AuditService(mockPrisma);
    });

    it('5.1: AuditService.exportCsv neutralizes CSV formula injection characters (=, +, -, @, \\t, \\r)', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: 'log-inj-1',
          timestamp: new Date('2026-10-13T10:00:00Z'),
          userName: '=CMD|"/C calc"!A0',
          userEmail: '@malicious.domain.com',
          action: '+EXPLOIT_PAYLOAD',
          severity: '-High',
          entity: '\tTabIndentedEntity',
          ipAddress: '10.0.0.1',
          status: 'Success',
          details: 'Normal details',
          statusCode: 200,
          durationMs: 15.2,
        },
      ]);

      const csv = await auditService.exportCsv({});

      // The malicious initial characters must be escaped with a single quote prefix
      expect(csv).toContain('"\'=CMD|""/C calc""!A0"');
      expect(csv).toContain('"\'@malicious.domain.com"');
      expect(csv).toContain('"\' +EXPLOIT_PAYLOAD"'.replace(' ', ''));
      expect(csv).toContain('"\' -High"'.replace(' ', ''));
      expect(csv).toContain('"\'\tTabIndentedEntity"');
    });

    it('5.2: AuditService.findByEntity strictly clamps excessive page size to 100 maximum', async () => {
      mockPrisma.auditLog.count.mockResolvedValue(250);
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      const res = await auditService.findByEntity('Network', 'net-1', {
        pageSize: 5000, // Adversarial request attempting massive un-bounded scan
      });

      expect(res.pageSize).toBe(100);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
          orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
        }),
      );
    });

    it('5.3: DirectoryService.revealEmailPassword throws NotFoundException without logging when no emailPassword exists', async () => {
      const mockDirPrisma = {
        directoryUser: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'dir-empty-pass',
            email: 'no.pass@youngonevn.com',
            emailPassword: null,
          }),
        },
      };
      const mockAudit = { logEvent: vi.fn() };
      const dirService = new DirectoryService(mockDirPrisma as any, mockAudit as any);

      await expect(
        dirService.revealEmailPassword('dir-empty-pass', { role: 'Admin' }),
      ).rejects.toThrow(NotFoundException);

      expect(mockAudit.logEvent).not.toHaveBeenCalled();
    });

    it('5.4: DirectoryService.copyEmailPassword throws NotFoundException without logging when no emailPassword exists', async () => {
      const mockDirPrisma = {
        directoryUser: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'dir-empty-pass',
            email: 'no.pass@youngonevn.com',
            emailPassword: null,
          }),
        },
      };
      const mockAudit = { logEvent: vi.fn() };
      const dirService = new DirectoryService(mockDirPrisma as any, mockAudit as any);

      await expect(
        dirService.copyEmailPassword('dir-empty-pass', { role: 'Admin' }),
      ).rejects.toThrow(NotFoundException);

      expect(mockAudit.logEvent).not.toHaveBeenCalled();
    });

    it('5.5: NetworkService.createIp throws BadRequestException when subnet IP pool is exhausted', async () => {
      // Subnet with /30 has 2 usable IPs: .1 and .2. Both are already allocated.
      const mockNetPrisma = {
        subnet: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'sub-tiny',
            cidr: '192.168.1.0/30',
            vlanId: 'v-1',
            ipAddresses: [{ address: '192.168.1.1' }, { address: '192.168.1.2' }],
          }),
        },
        iPAddress: {
          findFirst: vi.fn(),
          create: vi.fn(),
        },
      };
      const mockAudit = { logEvent: vi.fn() };
      const netService = new NetworkService(mockNetPrisma as any, mockAudit as any);

      await expect(
        netService.createIp({
          subnetId: 'sub-tiny', // No target IP specified; requests auto-allocation
          deviceType: 'Workstation',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockAudit.logEvent).not.toHaveBeenCalled();
    });
  });
});
