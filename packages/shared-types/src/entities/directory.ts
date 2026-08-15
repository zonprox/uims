export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  LOCKED = 'LOCKED',
  SUSPENDED = 'SUSPENDED',
}

export enum DirectorySource {
  LOCAL = 'LOCAL',
  LDAP = 'LDAP',
  AZURE_AD = 'AZURE_AD',
}

export interface DirectoryUser {
  id: string;
  source: DirectorySource;
  externalId?: string | null;
  username: string;
  email: string;
  displayName?: string | null;
  department?: string | null;
  jobTitle?: string | null;
  role?: string | null;
  phone?: string | null;
  location?: string | null;
  twoFactorEnabled: boolean;
  accountStatus: AccountStatus;

  // Credentials (AD & Mail initial passwords)
  adInitialPassword?: string | null;
  mailInitialPassword?: string | null;

  // Domain Controller Mailbox Configuration
  hasMailbox?: boolean;
  mailboxType?: string | null;
  quotaUsed?: number;
  quotaTotal?: number;
  mailStatus?: string | null;
  forwardingAddress?: string | null;
  autoReplyEnabled?: boolean;
  aliases?: string[] | null;

  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DirectoryGroup {
  id: string;
  name: string;
  description?: string | null;
  email?: string | null;
  type?: string | null;
  scope?: string | null;
  managedBy?: string | null;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}
