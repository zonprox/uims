import type {
  AccessAssignmentStatus,
  AccessControlStatsDto,
  AccessDoorDto,
  AccessSubjectType,
  CreateDoorDto,
  CreateNonADUserDto,
  DocumentScanDetailDto,
  DocumentScanQueryDto,
  DoorAccessDocumentScanDto,
  DoorDetailDto,
  DoorQueryDto,
  DoorUserAssignmentDto,
  DoorWithCountDto,
  GrantAccessDto,
  GrantAccessResultDto,
  NonADUserDetailDto,
  NonADUserDto,
  NonADUserQueryDto,
  NonADUserWithCountDto,
  RevokeAccessDto,
  RevokeAccessResultDto,
  UnifiedUserQueryDto,
  UnifiedUserRowDto,
  UpdateDoorDto,
  UpdateNonADUserDto,
  UploadDocumentDto,
  UserAccessDetailDto,
} from '@uims/shared-types';
import { api } from './api';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TemplateRequestParams {
  doorIds?: string[];
  subjectType?: AccessSubjectType;
  subjectIds?: string[];
  approverName?: string;
  approverTitle?: string;
  reason?: string;
  referenceNumber?: string;
}

export const accessControlService = {
  // ==========================================
  // 1. TELEMETRY & STATS
  // ==========================================
  getStats: async (): Promise<AccessControlStatsDto> => {
    const res = await api.get('/access-control/stats');
    return res.data?.data ?? res.data;
  },

  // ==========================================
  // 2. PHYSICAL DOORS
  // ==========================================
  getDoors: async (params?: DoorQueryDto): Promise<PaginatedResult<DoorWithCountDto>> => {
    const res = await api.get('/access-control/doors', { params });
    const data = res.data?.data ?? res.data;
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page: 1,
        pageSize: data.length,
        totalPages: 1,
      };
    }
    return data;
  },

  getDoorById: async (id: string): Promise<DoorDetailDto> => {
    const res = await api.get(`/access-control/doors/${id}`);
    return res.data?.data ?? res.data;
  },

  getDoorUsers: async (
    doorId: string,
    params?: {
      page?: number;
      pageSize?: number;
      status?: AccessAssignmentStatus;
      subjectType?: AccessSubjectType;
    },
  ): Promise<PaginatedResult<DoorUserAssignmentDto>> => {
    const res = await api.get(`/access-control/doors/${doorId}/users`, { params });
    const data = res.data?.data ?? res.data;
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page: 1,
        pageSize: data.length,
        totalPages: 1,
      };
    }
    return data;
  },

  createDoor: async (data: CreateDoorDto): Promise<AccessDoorDto> => {
    const res = await api.post('/access-control/doors', data);
    return res.data?.data ?? res.data;
  },

  updateDoor: async (id: string, data: UpdateDoorDto): Promise<AccessDoorDto> => {
    const res = await api.patch(`/access-control/doors/${id}`, data);
    return res.data?.data ?? res.data;
  },

  deleteDoor: async (id: string): Promise<{ id: string; message: string }> => {
    const res = await api.delete(`/access-control/doors/${id}`);
    return res.data?.data ?? res.data;
  },

  // ==========================================
  // 3. NON-AD EXTERNAL USERS
  // ==========================================
  getNonADUsers: async (
    params?: NonADUserQueryDto,
  ): Promise<PaginatedResult<NonADUserWithCountDto>> => {
    const res = await api.get('/access-control/non-ad-users', { params });
    const data = res.data?.data ?? res.data;
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page: 1,
        pageSize: data.length,
        totalPages: 1,
      };
    }
    return data;
  },

  getNonADUserById: async (id: string): Promise<NonADUserDetailDto> => {
    const res = await api.get(`/access-control/non-ad-users/${id}`);
    return res.data?.data ?? res.data;
  },

  createNonADUser: async (data: CreateNonADUserDto): Promise<NonADUserDto> => {
    const res = await api.post('/access-control/non-ad-users', data);
    return res.data?.data ?? res.data;
  },

  updateNonADUser: async (id: string, data: UpdateNonADUserDto): Promise<NonADUserDto> => {
    const res = await api.patch(`/access-control/non-ad-users/${id}`, data);
    return res.data?.data ?? res.data;
  },

  deleteNonADUser: async (id: string): Promise<{ id: string; message: string }> => {
    const res = await api.delete(`/access-control/non-ad-users/${id}`);
    return res.data?.data ?? res.data;
  },

  // ==========================================
  // 4. UNIFIED ACCESS MATRIX & PROFILES
  // ==========================================
  getUnifiedUsers: async (
    params?: UnifiedUserQueryDto,
  ): Promise<PaginatedResult<UnifiedUserRowDto>> => {
    const res = await api.get('/access-control/users', { params });
    const data = res.data?.data ?? res.data;
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page: 1,
        pageSize: data.length,
        totalPages: 1,
      };
    }
    return data;
  },

  getUserAccessDetail: async (
    subjectType: AccessSubjectType | string,
    subjectId: string,
  ): Promise<UserAccessDetailDto> => {
    const res = await api.get(`/access-control/users/${subjectType}/${subjectId}`);
    return res.data?.data ?? res.data;
  },

  // ==========================================
  // 5. GRANT & REVOKE ACCESS (WITH MANDATORY SCAN)
  // ==========================================
  grantAccess: async (data: GrantAccessDto, file?: File | Blob): Promise<GrantAccessResultDto> => {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('doorIds', JSON.stringify(data.doorIds));
      formData.append('subjectType', data.subjectType);
      formData.append('subjectIds', JSON.stringify(data.subjectIds));
      if (data.accessType) formData.append('accessType', data.accessType);
      if (data.validFrom) formData.append('validFrom', data.validFrom);
      if (data.validTo) formData.append('validTo', data.validTo);
      formData.append('approverName', data.approverName);
      if (data.approverTitle) formData.append('approverTitle', data.approverTitle);
      if (data.referenceNumber) formData.append('referenceNumber', data.referenceNumber);
      formData.append('reason', data.reason);
      if (data.documentId) formData.append('documentId', data.documentId);
      if (data.notes) formData.append('notes', data.notes);

      const res = await api.post('/access-control/grants', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });
      return res.data?.data ?? res.data;
    }

    const res = await api.post('/access-control/grants', data);
    return res.data?.data ?? res.data;
  },

  revokeAccess: async (
    data: RevokeAccessDto,
    file?: File | Blob,
  ): Promise<RevokeAccessResultDto> => {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('assignmentIds', JSON.stringify(data.assignmentIds));
      formData.append('approverName', data.approverName);
      if (data.approverTitle) formData.append('approverTitle', data.approverTitle);
      if (data.referenceNumber) formData.append('referenceNumber', data.referenceNumber);
      formData.append('reason', data.reason);
      if (data.documentId) formData.append('documentId', data.documentId);
      if (data.notes) formData.append('notes', data.notes);

      const res = await api.post('/access-control/revocations', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });
      return res.data?.data ?? res.data;
    }

    const res = await api.post('/access-control/revocations', data);
    return res.data?.data ?? res.data;
  },

  // ==========================================
  // 6. DOCUMENTS & SCANS
  // ==========================================
  uploadDocument: async (
    data: UploadDocumentDto,
    file: File | Blob,
  ): Promise<DoorAccessDocumentScanDto> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', data.documentType);
    formData.append('approverName', data.approverName);
    if (data.approverTitle) formData.append('approverTitle', data.approverTitle);
    if (data.referenceNumber) formData.append('referenceNumber', data.referenceNumber);
    formData.append('reason', data.reason);
    if (data.notes) formData.append('notes', data.notes);

    const res = await api.post('/access-control/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    return res.data?.data ?? res.data;
  },

  getDocuments: async (
    params?: DocumentScanQueryDto,
  ): Promise<PaginatedResult<DoorAccessDocumentScanDto>> => {
    const res = await api.get('/access-control/documents', { params });
    const data = res.data?.data ?? res.data;
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page: 1,
        pageSize: data.length,
        totalPages: 1,
      };
    }
    return data;
  },

  getDocumentById: async (id: string): Promise<DocumentScanDetailDto> => {
    const res = await api.get(`/access-control/documents/${id}`);
    return res.data?.data ?? res.data;
  },

  downloadDocumentBlob: async (id: string): Promise<{ blob: Blob; filename: string }> => {
    const res = await api.get(`/access-control/documents/${id}/download`, {
      responseType: 'blob',
    });
    const disposition = (res.headers && (res.headers['content-disposition'] as string)) || '';
    const match = /filename="?([^";]+)"?/.exec(disposition);
    const filename = match ? match[1] : `access-document-${id}.pdf`;
    return { blob: res.data as Blob, filename };
  },

  downloadDocxTemplate: async (
    params: TemplateRequestParams,
  ): Promise<{ blob: Blob; filename: string }> => {
    const res = await api.post('/access-control/templates/request', params, {
      responseType: 'blob',
    });
    const disposition = (res.headers && (res.headers['content-disposition'] as string)) || '';
    const match = /filename="?([^";]+)"?/.exec(disposition);
    const filename = match ? match[1] : 'door-access-request-form.docx';
    return { blob: res.data as Blob, filename };
  },

  getHtmlTemplate: async (params: TemplateRequestParams): Promise<string> => {
    const res = await api.get('/access-control/templates/request/print', {
      params,
      responseType: 'text',
    });
    return res.data as string;
  },
};
