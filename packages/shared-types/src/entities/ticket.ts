export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export interface TicketCategory {
  id: string;
  name: string;
  description?: string | null;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId?: string | null;
  authorName?: string | null;
  authorEmail?: string | null;
  avatarColor?: string | null;
  isStaff: boolean;
  content: string;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string;
  ticketCode?: string | null;
  title: string;
  description?: string | null;
  category?: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  categoryId?: string | null;
  requesterName?: string | null;
  requesterEmail?: string | null;
  assigneeName?: string | null;
  affectedAsset?: string | null;
  createdById?: string | null;
  assignedToId?: string | null;
  slaDeadline?: string | null;
  dueDate?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  comments?: Array<TicketComment>;
}
