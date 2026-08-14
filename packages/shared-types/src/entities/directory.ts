export enum AccountStatus {
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
  LOCKED = 'LOCKED',
  EXPIRED = 'EXPIRED',
}

export enum DirectorySource {
  ACTIVE_DIRECTORY = 'ACTIVE_DIRECTORY',
  LDAP = 'LDAP',
  GOOGLE_WORKSPACE = 'GOOGLE_WORKSPACE',
  AZURE_AD = 'AZURE_AD',
  LOCAL = 'LOCAL',
}

export interface DirectoryUser {
  id: string;
  source: DirectorySource;
  externalId: string;
  username: string;
  email: string;
  displayName: string;
  department: string | null;
  title: string | null;
  managerId: string | null;
  accountStatus: AccountStatus;
  lastSyncAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DirectoryGroup {
  id: string;
  source: DirectorySource;
  externalId: string;
  name: string;
  description: string | null;
  email: string | null;
  members: string[]; // User IDs
  lastSyncAt: string;
  createdAt: string;
  updatedAt: string;
}
