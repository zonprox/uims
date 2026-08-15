import { api } from './api';

export interface TicketMessage {
  id: string;
  sender: string;
  isStaff: boolean;
  avatarColor?: string;
  content: string;
  time: string;
}

export interface Ticket {
  id: string;
  realId?: string;
  title: string;
  category: 'Hardware' | 'Software' | 'Network' | 'Access & SSO' | 'Email';
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Pending User' | 'Resolved' | 'Closed';
  requesterName: string;
  requesterEmail: string;
  assignee: string;
  affectedAsset?: string;
  created: string;
  slaDeadline: string;
  messages: Array<TicketMessage>;
}

export interface TicketStats {
  openIncidentQueue: number;
  inProgress: number;
  urgentIncidents: number;
  slaComplianceRate: string;
}

export const ticketsService = {
  getTickets: async (params?: {
    search?: string;
    category?: string;
    status?: string;
  }): Promise<Array<Ticket>> => {
    const res = await api.get('/tickets', { params });
    return res.data.data;
  },
  getTicket: async (id: string): Promise<Ticket> => {
    const res = await api.get(`/tickets/${id}`);
    return res.data.data;
  },
  createTicket: async (data: {
    title: string;
    category: string;
    priority: string;
    requesterName: string;
    requesterEmail: string;
    description: string;
    affectedAsset?: string;
  }): Promise<Ticket> => {
    const res = await api.post('/tickets', data);
    return res.data.data;
  },
  updateStatus: async (id: string, status: string): Promise<Ticket> => {
    const res = await api.patch(`/tickets/${id}/status`, { status });
    return res.data.data;
  },
  addComment: async (
    ticketId: string,
    payload: { content: string; sender?: string; isStaff?: boolean; avatarColor?: string },
  ) => {
    const res = await api.post(`/tickets/${ticketId}/comments`, payload);
    return res.data.data;
  },
  getStats: async (): Promise<TicketStats> => {
    const res = await api.get('/tickets/stats');
    return res.data.data;
  },
};
