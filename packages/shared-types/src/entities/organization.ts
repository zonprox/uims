export interface Organization {
  id: string;
  name: string;
  code: string;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  status: string;
  departmentsCount?: number;
  locationsCount?: number;
  usersCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  organizationId?: string | null;
  organization?: Organization | null;
  parentId?: string | null;
  parent?: Department | null;
  children?: Department[];
  managerName?: string | null;
  managerEmail?: string | null;
  status: string;
  memberCount?: number;
  positionsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Position {
  id: string;
  title: string;
  code: string;
  description?: string | null;
  departmentId?: string | null;
  department?: Department | null;
  level?: string | null;
  status: string;
  headcount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrgNode {
  key: string;
  title: string;
  code: string;
  type: 'organization' | 'branch' | 'department' | 'sub-department' | 'position';
  manager?: string | null;
  count?: number;
  description?: string | null;
  children?: OrgNode[];
}

export interface OrganizationStats {
  totalOrganizations: number;
  totalDepartments: number;
  totalPositions: number;
  totalBranches: number;
  totalEmployees: number;
}
