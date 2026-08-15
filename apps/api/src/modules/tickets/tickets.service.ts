import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  CreateCommentDto,
  CreateTicketDto,
  TicketQueryDto,
  TicketStatsDto,
  UpdateTicketDto,
} from '@uims/shared-types';
import {
  mapTicketPriority,
  mapTicketPriorityToLabel,
  mapTicketStatus,
  mapTicketStatusToLabel,
} from '@uims/shared-utils';
import { PrismaService } from '../../database/prisma.service';

type TicketWithComments = Prisma.TicketGetPayload<{
  include: { comments: true };
}>;

function generateTicketCode(): string {
  const timeSuffix = Date.now().toString(36).toUpperCase().slice(-4);
  const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TKT-${timeSuffix}${randSuffix}`;
}

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  private applyStatusFilter(status: string, where: Prisma.TicketWhereInput) {
    const s = status.toLowerCase();
    if (s === 'open') {
      where.status = 'OPEN';
    } else if (s === 'in_progress' || s === 'in progress') {
      where.status = 'IN_PROGRESS';
    } else if (s === 'urgent') {
      where.priority = { in: ['URGENT', 'HIGH'] };
    } else if (s === 'resolved') {
      where.status = { in: ['RESOLVED', 'CLOSED'] };
    } else {
      where.status = mapTicketStatus(status);
    }
  }

  private buildFindAllWhere(query?: TicketQueryDto): Prisma.TicketWhereInput {
    const where: Prisma.TicketWhereInput = {};

    if (query?.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { ticketCode: { contains: query.search, mode: 'insensitive' } },
        { requesterName: { contains: query.search, mode: 'insensitive' } },
        { assigneeName: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query?.category && query.category !== 'all') {
      where.category = query.category;
    }

    if (query?.status && query.status !== 'all') {
      this.applyStatusFilter(query.status, where);
    }

    if (query?.priority && query.priority !== 'all') {
      where.priority = mapTicketPriority(query.priority);
    }

    return where;
  }

  async findAll(query?: TicketQueryDto) {
    const where = this.buildFindAllWhere(query);

    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize || query?.limit) || 50));
    const page = Math.max(1, Number(query?.page) || 1);
    const skip = (page - 1) * pageSize;

    const tickets = await this.prisma.ticket.findMany({
      where,
      include: {
        comments: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip,
    });

    return tickets.map((t) => this.formatTicket(t));
  }

  async findOne(id: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        OR: [{ id }, { ticketCode: id }],
      },
      include: {
        comments: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return this.formatTicket(ticket);
  }

  async create(data: CreateTicketDto) {
    const code = generateTicketCode();
    const priority = mapTicketPriority(data.priority as string);
    const requesterName = data.requesterName || 'Employee Requester';
    const requesterEmail = data.requesterEmail || 'employee@company.com';

    const ticket = await this.prisma.ticket.create({
      data: {
        ticketCode: code,
        title: data.title,
        description: data.description || '',
        category: data.category || 'Hardware',
        priority,
        status: 'OPEN',
        requesterName,
        requesterEmail,
        assigneeName: data.assigneeName || data.assignee || 'Unassigned',
        affectedAsset: data.affectedAsset || null,
        slaDeadline: priority === 'URGENT' ? '2 hours left' : '24 hours left',
        comments: {
          create: [
            {
              authorName: requesterName,
              authorEmail: requesterEmail,
              isStaff: false,
              content: data.description || data.title,
            },
          ],
        },
      },
      include: { comments: true },
    });

    return this.formatTicket(ticket);
  }

  async update(id: string, data: UpdateTicketDto) {
    const updateData: Prisma.TicketUpdateInput = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.affectedAsset !== undefined) updateData.affectedAsset = data.affectedAsset;
    if (data.assigneeName !== undefined || data.assignee !== undefined) {
      updateData.assigneeName = data.assigneeName || data.assignee;
    }

    if (data.priority) {
      updateData.priority = mapTicketPriority(data.priority as string);
    }

    if (data.status) {
      updateData.status = mapTicketStatus(data.status as string);
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: updateData,
      include: { comments: true },
    });

    return this.formatTicket(updated);
  }

  async updateStatus(id: string, status: string) {
    const mapped = mapTicketStatus(status);
    const updated = await this.prisma.ticket.update({
      where: { id },
      data: {
        status: mapped,
        resolvedAt: mapped === 'RESOLVED' || mapped === 'CLOSED' ? new Date() : null,
      },
      include: { comments: true },
    });

    return this.formatTicket(updated);
  }

  async addComment(ticketId: string, payload: CreateCommentDto) {
    const comment = await this.prisma.ticketComment.create({
      data: {
        ticketId,
        authorName: payload.authorName || payload.sender || 'IT Staff',
        isStaff: payload.isStaff ?? true,
        avatarColor: payload.avatarColor || '#1677ff',
        content: payload.content,
      },
    });

    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (ticket && ticket.status === 'OPEN') {
      await this.prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: 'IN_PROGRESS',
          assigneeName: payload.authorName || payload.sender || 'IT Support',
        },
      });
    }

    return comment;
  }

  async remove(id: string) {
    return this.prisma.ticket.delete({ where: { id } });
  }

  async getStats(): Promise<TicketStatsDto> {
    const [openCount, inProgressCount, urgentCount, totalTickets, closedTickets] =
      await Promise.all([
        this.prisma.ticket.count({ where: { status: 'OPEN' } }),
        this.prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
        this.prisma.ticket.count({ where: { priority: 'URGENT', status: { not: 'CLOSED' } } }),
        this.prisma.ticket.count(),
        this.prisma.ticket.count({ where: { status: { in: ['RESOLVED', 'CLOSED'] } } }),
      ]);

    const slaCompliance =
      totalTickets > 0
        ? Math.min(
            100,
            Math.max(90, ((closedTickets + inProgressCount) / totalTickets) * 100),
          ).toFixed(1)
        : '98.5';

    return {
      openIncidentQueue: openCount,
      inProgress: inProgressCount,
      urgentIncidents: urgentCount,
      slaComplianceRate: `${slaCompliance}%`,
    };
  }

  private formatTicket(ticket: TicketWithComments) {
    const priorityLabel = mapTicketPriorityToLabel(ticket.priority);
    const statusLabel = mapTicketStatusToLabel(ticket.status);

    const messages = (ticket.comments || []).map((c) => ({
      id: c.id,
      sender: c.authorName || 'User',
      isStaff: c.isStaff || false,
      avatarColor: c.avatarColor || (c.isStaff ? '#1677ff' : '#10b981'),
      content: c.content,
      time: c.createdAt ? c.createdAt.toISOString().replace('T', ' ').substring(0, 16) : 'Just now',
    }));

    return {
      id: ticket.ticketCode || ticket.id,
      realId: ticket.id,
      title: ticket.title,
      category: ticket.category || 'Hardware',
      priority: priorityLabel,
      status: statusLabel,
      requesterName: ticket.requesterName || 'Unknown Requester',
      requesterEmail: ticket.requesterEmail || '',
      assignee: ticket.assigneeName || 'Unassigned',
      affectedAsset: ticket.affectedAsset || undefined,
      created: ticket.createdAt
        ? ticket.createdAt.toISOString().replace('T', ' ').substring(0, 16)
        : '',
      slaDeadline: ticket.slaDeadline || '24h left',
      messages,
    };
  }
}
