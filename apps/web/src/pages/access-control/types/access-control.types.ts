import type {
  AccessSubjectType,
  DoorDocumentType,
  DoorSecurityLevel,
  DoorStatus,
  DoorWithCountDto,
  NonADUserWithCountDto,
} from '@uims/shared-types';

export type AccessControlTabKey = 'doors' | 'users' | 'documents';

export interface DoorModalState {
  open: boolean;
  mode: 'create' | 'edit';
  door?: DoorWithCountDto | null;
}

export interface NonAdUserModalState {
  open: boolean;
  mode: 'create' | 'edit';
  user?: NonADUserWithCountDto | null;
}

export interface GrantModalState {
  open: boolean;
  preselectedDoorIds?: string[];
  preselectedSubjectType?: AccessSubjectType;
  preselectedSubjectIds?: string[];
}

export interface RevokeModalState {
  open: boolean;
  preselectedAssignmentIds?: string[];
}

export interface DoorDrawerState {
  open: boolean;
  doorId?: string | null;
}

export interface UserDrawerState {
  open: boolean;
  subjectType?: AccessSubjectType;
  subjectId?: string | null;
}

export interface PreviewModalState {
  open: boolean;
  documentId?: string | null;
  fileName?: string;
  mimeType?: string;
  documentType?: DoorDocumentType;
}

export interface DoorFilterState {
  search: string;
  status?: DoorStatus | 'ALL';
  securityLevel?: DoorSecurityLevel | 'ALL';
  building?: string;
}

export interface UserFilterState {
  search: string;
  subjectType?: AccessSubjectType | 'ALL';
  status?: string | 'ALL';
}

export interface DocumentFilterState {
  search: string;
  documentType?: DoorDocumentType | 'ALL';
}
