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
