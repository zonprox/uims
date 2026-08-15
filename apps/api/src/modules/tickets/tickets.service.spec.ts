import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TicketsService } from './tickets.service';
import { TicketPriority, TicketStatus } from '@uims/shared-types';

describe('TicketsService', () => {
  let service: TicketsService;
  let mockPrisma: Record<string, unknown>;

  beforeEach(() => {
    mockPrisma = {
      ticket: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      ticketComment: {
        create: vi.fn(),
      },
    };

    service = new TicketsService(
      mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
    );
  });

  describe('create', () => {
    it('should create a support ticket with initial comment and correct priority mapping', async () => {
      mockPrisma.ticket.create.mockResolvedValue({
        id: 'tkt-uuid',
        ticketCode: 'TKT-1002',
        title: 'VPN Connection Refused',
        description: 'Unable to connect to Frankfurt gateway',
        category: 'Network',
        priority: TicketPriority.HIGH,
        status: TicketStatus.OPEN,
        requesterName: 'Sarah Connor',
        requesterEmail: 'sarah@company.com',
        assigneeName: 'Unassigned',
        slaDeadline: '24 hours left',
        createdAt: new Date('2026-08-14T10:00:00Z'),
        comments: [
          {
            id: 'c-1',
            authorName: 'Sarah Connor',
            content: 'Unable to connect to Frankfurt gateway',
            isStaff: false,
            createdAt: new Date('2026-08-14T10:00:00Z'),
          },
        ],
      });

      const result = await service.create({
        title: 'VPN Connection Refused',
        description: 'Unable to connect to Frankfurt gateway',
        category: 'Network',
        priority: 'High',
        requesterName: 'Sarah Connor',
        requesterEmail: 'sarah@company.com',
      });

      expect(mockPrisma.ticket.create).toHaveBeenCalled();
      expect(result.id).toBe('TKT-1002');
      expect(result.priority).toBe('High');
      expect(result.status).toBe('Open');
      expect(result.messages).toHaveLength(1);
    });
  });

  describe('addComment', () => {
    it('should add comment and transition ticket from OPEN to IN_PROGRESS', async () => {
      mockPrisma.ticketComment.create.mockResolvedValue({
        id: 'c-2',
        ticketId: 'tkt-uuid',
        authorName: 'Alex Johnson',
        isStaff: true,
        content: 'Investigating router logs now.',
      });

      mockPrisma.ticket.findUnique.mockResolvedValue({
        id: 'tkt-uuid',
        status: 'OPEN',
      });

      mockPrisma.ticket.update.mockResolvedValue({
        id: 'tkt-uuid',
        status: 'IN_PROGRESS',
      });

      const comment = await service.addComment('tkt-uuid', {
        content: 'Investigating router logs now.',
        authorName: 'Alex Johnson',
        isStaff: true,
      });

      expect(comment.id).toBe('c-2');
      expect(mockPrisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tkt-uuid' },
          data: expect.objectContaining({ status: 'IN_PROGRESS' }),
        }),
      );
    });
  });

  describe('getStats', () => {
    it('should aggregate incident counts', async () => {
      mockPrisma.ticket.count
        .mockResolvedValueOnce(12) // OPEN
        .mockResolvedValueOnce(18) // IN_PROGRESS
        .mockResolvedValueOnce(3) // URGENT
        .mockResolvedValueOnce(100) // totalTickets
        .mockResolvedValueOnce(80); // closedTickets

      const stats = await service.getStats();

      expect(stats.openIncidentQueue).toBe(12);
      expect(stats.inProgress).toBe(18);
      expect(stats.urgentIncidents).toBe(3);
      expect(stats.slaComplianceRate).toBe('98.0%');
    });
  });
});
