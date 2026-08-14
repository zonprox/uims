export enum EmailStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  FORWARDING = 'FORWARDING',
}

export interface EmailAccount {
  id: string;
  address: string;
  aliases: string[];
  mailboxSize: number;
  quota: number;
  status: EmailStatus;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
}
