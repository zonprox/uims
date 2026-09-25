import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import type { AuditLog, Prisma } from '@prisma/client';
import type { AuditQueryDto, AuditStatsDto, LogEventDto } from '@uims/shared-types';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private prisma: PrismaService,
    @Optional() private notificationsService?: NotificationsService,
  ) {}

  private buildWhere(query?: AuditQueryDto): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = {};

    if (query?.search && query.search.trim().length > 0) {
      const term = query.search.trim();
      where.OR = [
        { userName: { contains: term, mode: 'insensitive' } },
        { userEmail: { contains: term, mode: 'insensitive' } },
        { entity: { contains: term, mode: 'insensitive' } },
        { details: { contains: term, mode: 'insensitive' } },
        { ipAddress: { contains: term, mode: 'insensitive' } },
        { action: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query?.action && query.action.trim() && query.action !== 'all') {
      where.action = query.action.trim();
    }

    if (query?.severity && query.severity.trim() && query.severity !== 'all') {
      where.severity = query.severity.trim();
    }

    if (query?.status && query.status.trim() && query.status !== 'all') {
      where.status = query.status.trim();
    }

    if (query?.entity && query.entity.trim() && query.entity !== 'all') {
      where.entity = { contains: query.entity.trim(), mode: 'insensitive' };
    }

    if (query?.startDate || query?.endDate) {
      const timestampFilter: Prisma.DateTimeFilter = {};
      if (query.startDate && query.startDate.trim()) {
        const start = new Date(query.startDate.trim());
        if (!Number.isNaN(start.getTime())) {
          timestampFilter.gte = start;
        }
      }
      if (query.endDate && query.endDate.trim()) {
        const end = new Date(query.endDate.trim());
        if (!Number.isNaN(end.getTime())) {
          timestampFilter.lte = end;
        }
      }
      if (timestampFilter.gte !== undefined || timestampFilter.lte !== undefined) {
        where.timestamp = timestampFilter;
      }
    }

    return where;
  }

  async findAll(query?: AuditQueryDto) {
    const where = this.buildWhere(query);
    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize || query?.limit) || 50));
    const page = Math.max(1, Number(query?.page) || 1);
    const skip = (page - 1) * pageSize;

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
      take: pageSize,
      skip,
    });

    return logs.map((l) => this.formatLog(l));
  }

  async findOne(id: string) {
    const log = await this.prisma.auditLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException(`Audit log with ID ${id} not found`);
    return this.formatLog(log);
  }

  async logEvent(data: LogEventDto) {
    const log = await this.prisma.auditLog.create({
      data: {
        userId: data.userId,
        userName: data.userName || 'System Engine',
        userEmail: data.userEmail || 'daemon@youngonevn.com',
        action: data.action,
        severity: data.severity || 'Info',
        entity: data.entity,
        entityType: data.entityType || 'Security',
        entityId: data.entityId,
        ipAddress: data.ipAddress || '127.0.0.1 (Localhost)',
        status: data.status || 'Success',
        statusCode: data.statusCode || (data.status === 'Failed' ? 400 : 200),
        durationMs: data.durationMs,
        details: data.details || '',
        diffPayload: (data.diffPayload as Prisma.InputJsonValue) ?? undefined,
        oldValue: (data.oldValue as Prisma.InputJsonValue) ?? undefined,
        newValue: (data.newValue as Prisma.InputJsonValue) ?? undefined,
        userAgent: data.userAgent || null,
      },
    });

    if (
      this.notificationsService &&
      (data.severity === 'Critical' || data.severity === 'Alert' || data.status === 'Failed')
    ) {
      try {
        await this.notificationsService.notifyAdmins({
          title: `Security Alert: ${data.action}`,
          message: `${data.details || `Critical event detected on entity ${data.entity}`} (IP: ${data.ipAddress || 'Unknown'})`,
          type: 'ALERT',
          link: '/audit',
        });
      } catch (error: unknown) {
        this.logger.error(
          `Failed to dispatch security alert notification for audit action "${data.action}" on entity "${data.entity}"`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return log;
  }

  async exportCsv(query?: AuditQueryDto): Promise<string> {
    const where = this.buildWhere(query);
    const limit = Math.min(100, Math.max(1, Number(query?.limit || query?.pageSize) || 100));
    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: [{ timestamp: 'desc' }, { id: 'asc' }],
      take: limit,
    });

    const escapeCell = (val: unknown): string => {
      if (val === null || val === undefined) return '""';
      let str = String(val);
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers =
      'ID,Timestamp (UTC),User,Email,Action,Severity,Entity,IP Address,Status,Details,Status Code,Duration (ms)\n';

    const rows = logs
      .map((l) =>
        [
          escapeCell(l.id),
          escapeCell(l.timestamp ? l.timestamp.toISOString() : ''),
          escapeCell(l.userName || ''),
          escapeCell(l.userEmail || ''),
          escapeCell(l.action),
          escapeCell(l.severity || 'Info'),
          escapeCell(l.entity),
          escapeCell(l.ipAddress || ''),
          escapeCell(l.status || 'Success'),
          escapeCell(l.details || ''),
          escapeCell(l.statusCode ?? 200),
          escapeCell(l.durationMs != null ? `${l.durationMs.toFixed(2)}ms` : ''),
        ].join(','),
      )
      .join('\n');

    return headers + rows;
  }

  async getStats(): Promise<AuditStatsDto> {
    const [totalEvents, failedEvents, criticalEvents] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.count({
        where: {
          OR: [{ status: 'Failed' }, { status: 'Blocked' }, { statusCode: { gte: 400 } }],
        },
      }),
      this.prisma.auditLog.count({
        where: {
          OR: [{ severity: 'Critical' }, { severity: 'Alert' }],
        },
      }),
    ]);

    const errorRate =
      totalEvents > 0 ? `${((failedEvents / totalEvents) * 100).toFixed(1)}%` : '0.0%';

    return {
      totalEvents,
      failedEvents,
      criticalEvents,
      errorRate,
      totalEventRecords: totalEvents.toLocaleString(),
      securityAnomalies: `${criticalEvents} Alerts`,
    };
  }

  private formatLog(log: AuditLog) {
    return {
      id: log.id,
      timestamp: log.timestamp
        ? log.timestamp.toISOString().replace('T', ' ').substring(0, 19)
        : '',
      user: log.userName || 'System Engine',
      userName: log.userName || 'System Engine',
      userEmail: log.userEmail || 'system@youngonevn.com',
      action: log.action,
      severity: log.severity || 'Info',
      entity: log.entity,
      entityType: log.entityType || 'Asset',
      entityId: log.entityId || null,
      ipAddress: log.ipAddress || '127.0.0.1',
      status: log.status || 'Success',
      statusCode: log.statusCode ?? (log.status === 'Success' ? 200 : 400),
      durationMs: log.durationMs ?? null,
      userAgent: log.userAgent || null,
      details: log.details || '',
      diffPayload: log.diffPayload || {
        requestId: `req_${log.id.substring(0, 8)}`,
        userAgent: log.userAgent || 'UIMS-Console/2.4',
      },
      oldValue: log.oldValue || null,
      newValue: log.newValue || null,
    };
  }
}
