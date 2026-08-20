import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditService } from './audit.service';

describe('Identity Governance & Compliance Audit Trail', () => {
  let service: AuditService;
  let mockPrisma: {
    auditLog: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      auditLog: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
      },
    };
    service = new AuditService(
      mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
    );
  });

  it('should format governance audit logs with structured diffPayload and telemetry', async () => {
    const mockRecord = {
      id: 'aud-001',
      userId: 'usr-admin-1',
      userName: 'Alex Johnson',
      userEmail: 'admin@uims.internal',
      action: 'USER_PROVISION',
      severity: 'Info',
      status: 'Success',
      entity: 'User Sophia Patel',
      entityType: 'User',
      entityId: 'usr-sophia-patel',
      ipAddress: '192.168.1.15 (NY HQ)',
      userAgent: 'UIMS-AdminConsole/2.4.0 (macOS; arm64)',
      statusCode: 201,
      durationMs: 42.5,
      timestamp: new Date('2026-08-19T08:30:00Z'),
      details: 'Provisioned new Active Directory user account for Sophia Patel with Entra ID sync.',
      diffPayload: {
        requestId: 'req_prov_9941a',
        userAgent: 'UIMS-AdminConsole/2.4.0 (macOS; arm64)',
        ipAddress: '192.168.1.15',
        severity: 'Info',
        status: 'Success',
        before: null,
        after: {
          username: 'sophia.patel',
          email: 'sophia.patel@company.com',
          role: 'Employee',
          ouPath: 'OU=Engineering,OU=HQ,DC=uims,DC=internal',
        },
      },
      oldValue: null,
      newValue: {
        username: 'sophia.patel',
        email: 'sophia.patel@company.com',
      },
    };

    mockPrisma.auditLog.findMany.mockResolvedValue([mockRecord]);

    const result = await service.findAll({ action: 'USER_PROVISION' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('aud-001');
    expect(result[0].user).toBe('Alex Johnson');
    expect(result[0].action).toBe('USER_PROVISION');
    expect(result[0].diffPayload).toHaveProperty('requestId', 'req_prov_9941a');
    expect(result[0].diffPayload).toHaveProperty(
      'after.ouPath',
      'OU=Engineering,OU=HQ,DC=uims,DC=internal',
    );
  });

  it('should format security incident logs and export CSV with proper RFC 4180 escaping', async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([
      {
        id: 'aud-011',
        userId: null,
        userName: 'Security Threat Defense Engine',
        userEmail: 'threat-engine@uims.internal',
        action: 'BRUTE_FORCE_DETECTED',
        severity: 'Critical',
        status: 'Blocked',
        entity: 'Auth Gateway SAML',
        entityType: 'Security',
        entityId: 'sec-saml-gateway',
        ipAddress: '89.248.163.2 (St. Petersburg, RU)',
        userAgent: 'python-requests/2.31.0',
        statusCode: 401,
        durationMs: 1.2,
        timestamp: new Date('2026-08-20T02:15:00Z'),
        details: 'Distributed dictionary attack detected. Origin IP blocked at firewall.',
        diffPayload: {
          requestId: 'sec_block_4482k',
          severity: 'Critical',
          status: 'Blocked',
        },
        oldValue: null,
        newValue: null,
      },
    ]);

    const csv = await service.exportCsv();
    expect(csv).toContain(
      'ID,Timestamp (UTC),User,Email,Action,Severity,Entity,IP Address,Status,Details',
    );
    expect(csv).toContain('"aud-011"');
    expect(csv).toContain('"BRUTE_FORCE_DETECTED"');
    expect(csv).toContain('"Critical"');
    expect(csv).toContain('"Auth Gateway SAML"');
  });
});
