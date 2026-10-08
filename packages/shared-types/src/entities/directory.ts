import type { Asset } from './asset';
import type { LicenseAssignment } from './license';
import type { Department, Organization, Position } from './organization';

export enum DomainJoinStatus {
  JOINED = 'JOINED',
  NOT_JOINED = 'NOT_JOINED',
  PENDING = 'PENDING',
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  LOCKED = 'LOCKED',
  SUSPENDED = 'SUSPENDED',
}

export type DirectoryAccountStatus = AccountStatus;
export const DirectoryAccountStatus = AccountStatus;

export enum DirectorySource {
  LOCAL = 'LOCAL',
  LDAP = 'LDAP',
  AZURE_AD = 'AZURE_AD',
}

export type GroupType = 'Security' | 'Distribution' | 'Mail-Enabled Security' | 'Dynamic';
export type GroupScope = 'Domain Local' | 'Global' | 'Universal' | 'Internal Only';

export interface DirectoryUser {
  id: string;
  employeeCode?: string | null;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  displayName?: string | null;
  phone?: string | null;
  avatar?: string | null;
  managerName?: string | null;
  status: AccountStatus;
  source: DirectorySource;
  accountExpiresAt?: string | null;

  // Active Directory Domain Join Attributes
  adDomain?: string | null;
  computerName?: string | null;
  domainJoined?: boolean;
  domainJoinStatus?: DomainJoinStatus | string | null;

  // Enterprise Email Credentials Metadata
  hasEmailPassword?: boolean;
  emailPasswordUpdatedAt?: string | null;

  departmentId?: string | null;
  positionId?: string | null;
  organizationId?: string | null;
  organization?: Organization | null;
  department?: Department | null;
  position?: Position | null;
  assignedAssets?: Array<Asset>;
  licenseAssignments?: Array<LicenseAssignment>;
  assignedAssetsCount?: number;
  assignedLicensesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DirectorySummaryStats {
  totalEmployees: number;
  activeEmployees: number;
  assignedWorkstations: number;
  totalGroups: number;
  closedAccounts: number;
}

export interface DirectoryGroup {
  id: string;
  name: string;
  description?: string | null;
  type?: GroupType | string | null;
  scope?: GroupScope | string | null;
  managedBy?: string | null;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
  _count?: { memberships: number };
}
