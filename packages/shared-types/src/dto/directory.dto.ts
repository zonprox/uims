import type { AccountStatus, DirectorySource } from '../entities/directory';

export interface CreateDirectoryUserDto {
  username?: string;
  name?: string;
  displayName?: string;
  email: string;
  jobTitle?: string;
  department?: string;
  role?: string;
  phone?: string;
  location?: string;
  twoFactorEnabled?: boolean;
  status?: string | AccountStatus;
  accountStatus?: string | AccountStatus;
  source?: DirectorySource;

  // Initial Passwords
  adInitialPassword?: string;
  mailInitialPassword?: string;

  // Mailbox Settings
  hasMailbox?: boolean;
  mailboxType?: string;
  quotaTotal?: number;
  quotaUsed?: number;
  mailStatus?: string;
  forwardingAddress?: string;
  autoReplyEnabled?: boolean;
  aliases?: string[];
}

export interface UpdateDirectoryUserDto extends Partial<CreateDirectoryUserDto> {}

export interface DirectoryUserQueryDto {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  department?: string;
  status?: string;
  mailboxType?: string;
}

export interface CreateDirectoryGroupDto {
  name: string;
  email?: string;
  address?: string;
  description?: string;
  memberCount?: number | string;
  scope?: string;
  managedBy?: string;
}

export interface DirectoryStatsDto {
  totalUsers: number;
  activeUsers: number;
  custodiansCount?: number;
  twoFactorRate?: number;
  suspendedAccounts: number;
  totalMailboxes?: number;
  totalStorageQuotaGb?: number;
  usedStorageGb?: number;
}
