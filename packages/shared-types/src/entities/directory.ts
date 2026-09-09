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
  jobTitle?: string | null;
  company?: string | null;
  groupCompany?: string | null;
  plant?: string | null;
  section?: string | null;
  subSection?: string | null;
  department?: string | null;
  location?: string | null;
  managerName?: string | null;
  telephone?: string | null;
  phone?: string | null;
  avatar?: string | null;
  computerName?: string | null;
  computerName2?: string | null;
  adGroup?: string | null;
  ouPath?: string | null;
  status: AccountStatus;
  source: DirectorySource;
  isClosed?: boolean;
  accountExpiresAt?: string | null;
  departmentId?: string | null;
  positionId?: string | null;
  organizationId?: string | null;
  locationId?: string | null;
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
  totalOUs: number;
  closedAccounts: number;
}

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
