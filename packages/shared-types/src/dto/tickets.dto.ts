import type { TicketPriority, TicketStatus } from '../entities/ticket';

export interface CreateTicketDto {
  title: string;
  description?: string;
  category?: string;
  priority?: string | TicketPriority;
  requesterName?: string;
  requesterEmail?: string;
  assignee?: string;
  assigneeName?: string;
  affectedAsset?: string;
}

export interface UpdateTicketDto extends Partial<CreateTicketDto> {
  status?: string | TicketStatus;
}

export interface TicketQueryDto {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
  priority?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface CreateCommentDto {
  content: string;
  sender?: string;
  authorName?: string;
  isStaff?: boolean;
  avatarColor?: string;
}

export interface TicketStatsDto {
  openIncidentQueue: number;
  inProgress: number;
  urgentIncidents: number;
  slaComplianceRate: string;
}
