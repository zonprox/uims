import type {
  AccessAssignmentStatus,
  AccessSubjectType,
  AccessValidityType,
  DoorDocumentType,
  DoorSecurityLevel,
  DoorStatus,
  NonADUserStatus,
} from '../enums/access-control';

// ==========================================
// QUERY PARAMETERS / FILTERS
// ==========================================

export interface DoorQueryDto {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: DoorStatus;
  securityLevel?: DoorSecurityLevel;
  building?: string;
  floor?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface NonADUserQueryDto {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: NonADUserStatus;
  company?: string;
  userType?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface UnifiedUserQueryDto {
  page?: number;
  pageSize?: number;
  search?: string;
  subjectType?: AccessSubjectType;
  doorId?: string;
  departmentId?: string;
  company?: string;
  status?: string;
}

export interface DocumentScanQueryDto {
  page?: number;
  pageSize?: number;
  search?: string;
  documentType?: DoorDocumentType;
  sort?: string;
  order?: 'asc' | 'desc';
}

// ==========================================
// REQUEST PAYLOADS (MUTATIONS)
// ==========================================

export interface CreateDoorDto {
  doorCode: string;
  name: string;
  description?: string;
  building: string;
  floor: string;
  zone?: string;
  location?: string;
  organizationId?: string;
  securityLevel?: DoorSecurityLevel;
  status?: DoorStatus;
  controllerModel?: string;
  controllerIp?: string;
  readerType?: string;
  readerId?: string;
  installedAt?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateDoorDto extends Partial<CreateDoorDto> {}

export interface CreateNonADUserDto {
  fullName: string;
  badgeNumber: string;
  identityNumber: string;
  company: string;
  phone?: string;
  email?: string;
  userType?: string;
  status?: NonADUserStatus;
  validFrom?: string;
  validTo?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateNonADUserDto extends Partial<CreateNonADUserDto> {}

export interface GrantAccessDto {
  doorIds: string[];
  subjectType: AccessSubjectType;
  subjectIds: string[];
  accessType?: AccessValidityType;
  validFrom?: string;
  validTo?: string;
  approverName: string;
  approverTitle?: string;
  referenceNumber?: string;
  reason: string;
  documentId?: string;
  notes?: string;
}

export interface RevokeAccessDto {
  assignmentIds: string[];
  approverName: string;
  approverTitle?: string;
  referenceNumber?: string;
  reason: string;
  documentId?: string;
  notes?: string;
}

export interface UploadDocumentDto {
  documentType: DoorDocumentType;
  approverName: string;
  approverTitle?: string;
  referenceNumber?: string;
  reason: string;
  notes?: string;
}

// ==========================================
// RESPONSE PAYLOADS & ENTITY MODELS
// ==========================================

export interface AccessDoorDto {
  id: string;
  doorCode: string;
  name: string;
  description?: string | null;
  building: string;
  floor: string;
  zone?: string | null;
  location?: string | null;
  organizationId?: string | null;
  securityLevel: DoorSecurityLevel;
  status: DoorStatus;
  controllerModel?: string | null;
  controllerIp?: string | null;
  readerType?: string | null;
  readerId?: string | null;
  installedAt?: string | null;
  metadata?: Record<string, unknown> | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DoorWithCountDto extends AccessDoorDto {
  activeUsersCount: number;
  totalAssignmentsCount?: number;
  organization?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

export interface DoorDetailDto extends DoorWithCountDto {
  recentAssignments?: DoorAccessAssignmentDto[];
}

export interface NonADUserDto {
  id: string;
  fullName: string;
  badgeNumber: string;
  identityNumber: string;
  company: string;
  phone?: string | null;
  email?: string | null;
  userType?: string | null;
  status: NonADUserStatus;
  validFrom?: string | null;
  validTo?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface NonADUserWithCountDto extends NonADUserDto {
  activeDoorsCount: number;
}

export interface NonADUserDetailDto extends NonADUserWithCountDto {
  assignments?: DoorAccessAssignmentDto[];
}

export interface DoorAccessDocumentScanDto {
  id: string;
  documentType: DoorDocumentType;
  fileName: string;
  originalName: string;
  filePath: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  fileHash?: string | null;
  approverName: string;
  approverTitle?: string | null;
  referenceNumber?: string | null;
  reason: string;
  notes?: string | null;
  uploadedById?: string | null;
  uploadedBy?: {
    id: string;
    username: string;
    displayName?: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentScanDetailDto extends DoorAccessDocumentScanDto {
  grantAssignments?: DoorAccessAssignmentDto[];
  revocationAssignments?: DoorAccessAssignmentDto[];
}

export interface DoorAccessAssignmentDto {
  id: string;
  doorId: string;
  subjectType: AccessSubjectType;
  directoryUserId?: string | null;
  nonADUserId?: string | null;
  accessType: AccessValidityType;
  validFrom: string;
  validTo?: string | null;
  status: AccessAssignmentStatus;
  grantReason?: string | null;
  grantedAt: string;
  grantedById?: string | null;
  grantDocumentId?: string | null;
  revokedAt?: string | null;
  revokedById?: string | null;
  revocationReason?: string | null;
  revocationDocumentId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;

  door?: AccessDoorDto;
  directoryUser?: {
    id: string;
    employeeCode?: string | null;
    displayName?: string | null;
    email: string;
    department?: {
      id: string;
      name: string;
    } | null;
  } | null;
  nonADUser?: NonADUserDto | null;
  grantDocument?: DoorAccessDocumentScanDto | null;
  revocationDocument?: DoorAccessDocumentScanDto | null;
}

export interface DoorUserAssignmentDto {
  assignmentId: string;
  subjectType: AccessSubjectType;
  subjectId: string;
  fullName: string;
  codeOrBadge: string;
  organizationOrCompany: string;
  department?: string;
  accessType: AccessValidityType;
  validFrom: string;
  validTo?: string | null;
  status: AccessAssignmentStatus;
  grantedAt: string;
  grantDocumentId?: string | null;
  revokedAt?: string | null;
  revocationDocumentId?: string | null;
}

export interface UnifiedUserRowDto {
  id: string;
  subjectType: AccessSubjectType;
  fullName: string;
  codeOrBadge: string;
  organizationOrCompany: string;
  departmentOrTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  status: string;
  activeDoorsCount: number;
  totalDoorsCount: number;
}

export interface UserAccessDetailDto {
  subjectType: AccessSubjectType;
  subjectId: string;
  fullName: string;
  codeOrBadge: string;
  organizationOrCompany: string;
  departmentOrTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  status: string;
  activeAssignments: DoorAccessAssignmentDto[];
  revokedAssignments: DoorAccessAssignmentDto[];
  expiredAssignments: DoorAccessAssignmentDto[];
}

export interface GrantAccessResultDto {
  createdAssignmentsCount: number;
  assignments: DoorAccessAssignmentDto[];
  documentScan?: DoorAccessDocumentScanDto | null;
}

export interface RevokeAccessResultDto {
  revokedAssignmentsCount: number;
  assignments: DoorAccessAssignmentDto[];
  documentScan?: DoorAccessDocumentScanDto | null;
}

export interface AccessControlStatsDto {
  totalDoors: number;
  activeDoors: number;
  maintenanceDoors: number;
  totalNonADUsers: number;
  activeNonADUsers: number;
  totalActiveAssignments: number;
  directoryUserAssignments: number;
  nonADUserAssignments: number;
  expiringSoonAssignments: number;
  criticalDoorAssignments: number;
}
