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

export type GroupType = 'Security' | 'Distribution' | 'Mail-Enabled Security' | 'Dynamic';
export type GroupScope = 'Domain Local' | 'Global' | 'Universal' | 'Internal Only';

export interface DirectoryGroup {
  id: string;
  name: string;
  description?: string | null;
  email?: string | null;
  type?: GroupType | string | null;
  scope?: GroupScope | string | null;
  ouPath?: string | null;
  managedBy?: string | null;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationalUnit {
  id: string;
  name: string;
  dn: string;
  description?: string;
  userCount: number;
  groupCount: number;
  workstationCount: number;
  parentDn?: string | null;
}
