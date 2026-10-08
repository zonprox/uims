import { AccountStatus, DirectorySource, DomainJoinStatus } from '@uims/shared-types';
import { describe, expect, it } from 'vitest';
import {
  batchGroupMembershipSchema,
  batchImportDirectoryUsersSchema,
  createDirectoryGroupSchema,
  createDirectoryUserSchema,
  directoryUserQuerySchema,
  manageGroupMembershipSchema,
  resetEmailPasswordSchema,
  updateDirectoryGroupSchema,
  updateDirectoryUserSchema,
} from './directory.validator';

describe('directory.validator', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';
  const validUuid2 = '223e4567-e89b-12d3-a456-426614174000';

  describe('createDirectoryGroupSchema (with User Request R1 enhancements)', () => {
    it('validates a complete directory group with email, ouPath, and scope', () => {
      const input = {
        name: 'DevOps Engineering',
        email: 'devops-team@company.com',
        description: 'Infrastructure and deployment automation',
        type: 'Security',
        scope: 'Universal',
        ouPath: 'OU=Engineering,DC=corp,DC=local',
        managedBy: 'John Doe',
        memberCount: 15,
      };
      const result = createDirectoryGroupSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('devops-team@company.com');
        expect(result.data.ouPath).toBe('OU=Engineering,DC=corp,DC=local');
        expect(result.data.memberCount).toBe(15);
      }
    });

    it('applies defaults for scope and memberCount when omitted', () => {
      const result = createDirectoryGroupSchema.safeParse({ name: 'IT Admins' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.scope).toBe('Internal Only');
        expect(result.data.memberCount).toBe(0);
      }
    });

    it('rejects missing or empty group name', () => {
      expect(createDirectoryGroupSchema.safeParse({ name: '' }).success).toBe(false);
      expect(createDirectoryGroupSchema.safeParse({}).success).toBe(false);
    });

    it('validates distribution email format and trims/lowercases it', () => {
      const res = createDirectoryGroupSchema.safeParse({
        name: 'Finance',
        email: '  FINANCE-ALL@CORP.COM  ',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.email).toBe('finance-all@corp.com');
      }

      expect(
        createDirectoryGroupSchema.safeParse({
          name: 'Finance',
          email: 'invalid-email',
        }).success,
      ).toBe(false);
    });

    it('validates partial updates via updateDirectoryGroupSchema', () => {
      expect(updateDirectoryGroupSchema.safeParse({ description: 'New description' }).success).toBe(
        true,
      );
    });
  });

  describe('manageGroupMembershipSchema & batchGroupMembershipSchema', () => {
    it('validates group membership assignments', () => {
      expect(
        manageGroupMembershipSchema.safeParse({ userId: validUuid, groupId: validUuid2 }).success,
      ).toBe(true);

      expect(
        manageGroupMembershipSchema.safeParse({ userId: 'not-uuid', groupId: validUuid2 }).success,
      ).toBe(false);
    });

    it('validates batch membership with UUID arrays', () => {
      expect(batchGroupMembershipSchema.safeParse({ userIds: [validUuid, validUuid2] }).success).toBe(
        true,
      );
      expect(batchGroupMembershipSchema.safeParse({ userIds: [] }).success).toBe(false);
    });
  });

  describe('createDirectoryUserSchema & Location Purge', () => {
    it('validates directory user with email and phone', () => {
      const input = {
        email: 'jane.doe@company.com',
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '+84 24 3728 1234',
        status: AccountStatus.ACTIVE,
        source: DirectorySource.LOCAL,
        domainJoinStatus: DomainJoinStatus.JOINED,
      };
      const res = createDirectoryUserSchema.safeParse(input);
      expect(res.success).toBe(true);
    });

    it('confirms complete Physical Location purge: zero location fields on directory user schemas', () => {
      expect('locationId' in createDirectoryUserSchema.shape).toBe(false);
      expect('location' in createDirectoryUserSchema.shape).toBe(false);
      expect('locationId' in directoryUserQuerySchema.shape).toBe(false);
    });

    it('validates telephone format and rejects invalid numbers', () => {
      expect(
        createDirectoryUserSchema.safeParse({
          email: 'test@example.com',
          firstName: 'A',
          lastName: 'B',
          phone: '123456', // < 7 digits
        }).success,
      ).toBe(false);
    });

    it('validates password bounds [8..128] in resetEmailPasswordSchema', () => {
      expect(resetEmailPasswordSchema.safeParse({ password: 'Passw0rdSecure!' }).success).toBe(
        true,
      );
      expect(resetEmailPasswordSchema.safeParse({ password: 'short' }).success).toBe(false);
    });

    it('validates partial update via updateDirectoryUserSchema', () => {
      expect(updateDirectoryUserSchema.safeParse({ firstName: 'Janet' }).success).toBe(true);
    });
  });

  describe('batchImportDirectoryUsersSchema', () => {
    it('validates batch import payload with multiple records', () => {
      const payload = {
        users: [
          {
            name: 'Nguyen Van A',
            email: 'a.nguyen@company.com',
            department: 'IT',
            telephone: '0912345678',
          },
          {
            name: 'Tran Thi B',
            email: 'b.tran@company.com',
            department: 'HR',
          },
        ],
      };
      const res = batchImportDirectoryUsersSchema.safeParse(payload);
      expect(res.success).toBe(true);
    });

    it('rejects batch item with missing name or invalid email', () => {
      const badPayload = {
        users: [
          {
            name: '',
            email: 'not-an-email',
          },
        ],
      };
      expect(batchImportDirectoryUsersSchema.safeParse(badPayload).success).toBe(false);
    });
  });
});
